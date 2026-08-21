"""Unit tests for GitHub App Adapter."""

import pytest

from autopatch.adapters.github_app import GitHubAppAdapter
from autopatch.domain.models import (
    CIFailureEvent,
    CodeFilePatch,
    GeneratedPatch,
    VerificationResult,
)


@pytest.fixture
def sample_context():
    event = CIFailureEvent(
        repo="acme/ecommerce-api",
        commit_sha="e8f7a6b5c4d3",
        branch="main",
        run_id="run-777",
        workflow_name="Continuous Delivery",
    )
    patch = GeneratedPatch(
        fix_files=[
            CodeFilePatch(file_path="src/order.py", patched_content="def process(): pass", is_new_file=False)
        ],
        regression_test_file=CodeFilePatch(
            file_path="tests/test_order_regression.py",
            patched_content="def test_regression(): assert True",
            is_new_file=True,
        ),
        rationale="Added null check on order items array.",
        attempt_number=1,
    )
    verification = VerificationResult(
        passed=True,
        attempt_number=1,
        execution_output="======================= 10 passed in 0.55s =======================",
        failed_test_count=0,
    )
    return event, patch, verification


@pytest.mark.asyncio
async def test_branch_naming_convention(sample_context):
    event, patch, verification = sample_context
    adapter = GitHubAppAdapter()
    pr_info = await adapter.create_pull_request(event, patch, verification)

    assert pr_info.branch_name == f"autopatch/fix-{event.run_id}"
    assert f"Fix build failure in {event.workflow_name}" in pr_info.title
    assert f"Run #{event.run_id}" in pr_info.title
    assert pr_info.pr_number > 0
    assert pr_info.html_url.startswith(f"https://github.com/{event.repo}/pull/")


def test_pr_markdown_body_generation(sample_context):
    event, patch, verification = sample_context
    adapter = GitHubAppAdapter()
    body = adapter.generate_pr_body(event, patch, verification)

    # Asserts metadata
    assert event.repo in body
    assert event.run_id in body
    assert event.commit_sha in body

    # Asserts root cause rationale
    assert patch.rationale in body

    # Asserts modified files & regression test
    assert "`src/order.py`" in body
    assert "`tests/test_order_regression.py`" in body

    # Asserts Cloud Build verification section
    assert "Google Cloud Build Sandbox" in body
    assert "10 passed in 0.55s" in body


@pytest.mark.asyncio
async def test_get_file_content():
    adapter = GitHubAppAdapter()
    content = await adapter.get_file_content("owner/repo", "src/main.py", "main")
    assert "src/main.py" in content
    assert "main" in content


@pytest.mark.asyncio
async def test_real_github_api_flow(sample_context, monkeypatch):
    import base64

    import httpx
    event, patch, verification = sample_context

    adapter = GitHubAppAdapter(token="ghp_test_real_token_12345")
    assert adapter._headers()["Authorization"] == "token ghp_test_real_token_12345"

    # Mock get_file_content
    async def mock_get(url, headers=None):
        if "contents/src/main.py" in str(url):
            encoded = base64.b64encode(b"real content").decode()
            return httpx.Response(200, json={"content": encoded})
        return httpx.Response(404, json={"message": "Not Found"})

    class MockAsyncClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def get(self, url, headers=None):
            return await mock_get(url, headers)
        async def post(self, url, headers=None, json=None):
            if "pulls" in str(url):
                return httpx.Response(201, json={"number": 42, "html_url": "https://github.com/acme/ecommerce-api/pull/42"})
            return httpx.Response(201, json={})
        async def put(self, url, headers=None, content=None):
            return httpx.Response(200, json={})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockAsyncClient())

    # Test real get_file_content
    file_content = await adapter.get_file_content("acme/ecommerce-api", "src/main.py", "main")
    assert file_content == "real content"

    file_content_404 = await adapter.get_file_content("acme/ecommerce-api", "missing.py", "main")
    assert "Could not fetch" in file_content_404

    # Test real branch sha resolution
    async with MockAsyncClient() as client:
        # 404 branch sha
        sha_none = await adapter._get_branch_sha(client, "acme/ecommerce-api", "missing-branch")
        assert sha_none is None

    # Test full real PR creation flow
    async def mock_get_with_sha(url, headers=None):
        if "git/ref/heads" in str(url):
            return httpx.Response(200, json={"object": {"sha": "base1234"}})
        if "contents/" in str(url):
            return httpx.Response(200, json={"sha": "existingfile123"})
        return httpx.Response(404, json={})

    class MockClientWithSha(MockAsyncClient):
        async def get(self, url, headers=None):
            return await mock_get_with_sha(url, headers)

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockClientWithSha())
    pr_info = await adapter.create_pull_request(event, patch, verification)
    assert pr_info.pr_number == 42
    assert pr_info.html_url == "https://github.com/acme/ecommerce-api/pull/42"

    # Test PR opening failure branch (status 422)
    class MockClientPrError(MockClientWithSha):
        async def post(self, url, headers=None, json=None):
            if "pulls" in str(url):
                return httpx.Response(422, json={"message": "Validation Failed"})
            return httpx.Response(201, json={})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockClientPrError())
    pr_error_fallback = await adapter.create_pull_request(event, patch, verification)
    assert pr_error_fallback.pr_number > 0

    # Test fallback when base_sha is None
    class MockClientNoSha(MockAsyncClient):
        async def get(self, url, headers=None):
            return httpx.Response(404, json={})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockClientNoSha())
    pr_fallback = await adapter.create_pull_request(event, patch, verification)
    assert pr_fallback.pr_number > 0
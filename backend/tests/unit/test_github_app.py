"""Unit tests for GitHub App Adapter (Strict Real GitHub REST API)."""

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
async def test_missing_token_raises_error(sample_context):
    event, patch, verification = sample_context
    adapter = GitHubAppAdapter(token="")
    with pytest.raises(RuntimeError) as exc_info:
        await adapter.create_pull_request(event, patch, verification)
    assert "GitHub Token missing" in str(exc_info.value)


def test_pr_markdown_body_generation(sample_context):
    event, patch, verification = sample_context
    adapter = GitHubAppAdapter(token="ghp_test")
    body = adapter.generate_pr_body(event, patch, verification)

    assert event.repo in body
    assert event.run_id in body
    assert event.commit_sha in body
    assert patch.rationale in body
    assert "`src/order.py`" in body
    assert "`tests/test_order_regression.py`" in body
    assert "Google Cloud Build Sandbox" in body


@pytest.mark.asyncio
async def test_real_github_api_flow(sample_context, monkeypatch):
    import base64
    import httpx

    event, patch, verification = sample_context
    adapter = GitHubAppAdapter(token="ghp_test_real_token_12345")
    assert adapter._headers()["Authorization"] == "Bearer ghp_test_real_token_12345"

    class MockAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def get(self, url, headers=None):
            if "contents/src/main.py" in str(url):
                encoded = base64.b64encode(b"real content").decode()
                return httpx.Response(200, json={"content": encoded})
            if "git/ref/heads" in str(url):
                return httpx.Response(200, json={"object": {"sha": "base1234"}})
            if "contents/" in str(url):
                return httpx.Response(200, json={"sha": "existingfile123"})
            return httpx.Response(404, json={"message": "Not Found"})

        async def post(self, url, headers=None, json=None):
            if "pulls" in str(url):
                return httpx.Response(201, json={"number": 42, "html_url": "https://github.com/acme/ecommerce-api/pull/42"})
            return httpx.Response(201, json={})

        async def put(self, url, headers=None, content=None):
            return httpx.Response(200, json={})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockAsyncClient())

    # 1. Test real file content fetch
    content = await adapter.get_file_content("acme/ecommerce-api", "src/main.py", "main")
    assert content == "real content"

    # 2. Test successful real PR creation
    pr_info = await adapter.create_pull_request(event, patch, verification)
    assert pr_info.pr_number == 42
    assert pr_info.html_url == "https://github.com/acme/ecommerce-api/pull/42"
    assert pr_info.branch_name == f"autopatch/fix-{event.run_id}"

    # 3. Test GitHub API error propagates as RuntimeError with exact error message
    class MockClientPrError(MockAsyncClient):
        async def post(self, url, headers=None, json=None):
            if "pulls" in str(url):
                return httpx.Response(422, json={"message": "Validation Failed: Branch already has PR"})
            return httpx.Response(201, json={})

    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: MockClientPrError())
    with pytest.raises(RuntimeError) as exc_info:
        await adapter.create_pull_request(event, patch, verification)
    assert "GitHub Pull Request creation failed [422]" in str(exc_info.value)
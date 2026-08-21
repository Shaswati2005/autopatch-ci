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
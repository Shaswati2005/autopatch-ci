"""Unit tests for Cloud Build Sandbox Verification Adapter."""

import pytest

from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.domain.models import CIFailureEvent, CodeFilePatch, GeneratedPatch


@pytest.fixture
def sample_event() -> CIFailureEvent:
    return CIFailureEvent(
        repo="acme/payment-service",
        commit_sha="c0ffee123456",
        branch="main",
        run_id="run-cb-001",
    )


@pytest.fixture
def sample_patch() -> GeneratedPatch:
    return GeneratedPatch(
        fix_files=[CodeFilePatch(file_path="src/calculator.py", patched_content="def add(a, b): return a + b", is_new_file=False)],
        regression_test_file=CodeFilePatch(
            file_path="tests/test_auto_generated_regression.py",
            patched_content="def test_add(): assert 1 + 1 == 2",
            is_new_file=True,
        ),
        rationale="Fixed issue",
        attempt_number=1,
    )


@pytest.mark.asyncio
async def test_sandbox_verification_success(sample_event, sample_patch):
    verifier = CloudBuildVerificationAdapter()
    result = await verifier.verify_patch(sample_event, sample_patch)

    assert result.passed is True
    assert result.attempt_number == 1
    assert result.failed_test_count == 0


@pytest.mark.asyncio
async def test_sandbox_verification_pytest_runner(sample_event, sample_patch):
    verifier = CloudBuildVerificationAdapter()
    result = await verifier._run_isolated_pytest(sample_event, sample_patch)
    assert result.passed is True
    assert result.attempt_number == 1
    assert result.failed_test_count == 0
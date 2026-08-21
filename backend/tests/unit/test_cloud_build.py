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
        fix_files=[CodeFilePatch(file_path="src/calculator.py", patched_content="# Fix", is_new_file=False)],
        regression_test_file=CodeFilePatch(
            file_path="tests/test_auto_generated_regression.py",
            patched_content="# Test",
            is_new_file=True,
        ),
        rationale="Fixed issue",
        attempt_number=1,
    )


@pytest.mark.asyncio
async def test_sandbox_verification_success(sample_event, sample_patch):
    verifier = CloudBuildVerificationAdapter(simulated_pass_on_attempt=1)
    result = await verifier.verify_patch(sample_event, sample_patch)

    assert result.passed is True
    assert result.attempt_number == 1
    assert result.failed_test_count == 0
    assert "PASSED" in result.execution_output


@pytest.mark.asyncio
async def test_sandbox_verification_failure_capture(sample_event, sample_patch):
    # Adapter configured to fail until attempt 2
    verifier = CloudBuildVerificationAdapter(simulated_pass_on_attempt=2)

    # Attempt 1 -> fails and captures failure logs
    fail_result = await verifier.verify_patch(sample_event, sample_patch)
    assert fail_result.passed is False
    assert fail_result.attempt_number == 1
    assert fail_result.failed_test_count >= 1
    assert "FAILED" in fail_result.execution_output
    assert fail_result.error_logs is not None

    # Attempt 2 -> passes
    sample_patch.attempt_number = 2
    pass_result = await verifier.verify_patch(sample_event, sample_patch)
    assert pass_result.passed is True
    assert pass_result.attempt_number == 2
    assert pass_result.failed_test_count == 0


@pytest.mark.asyncio
async def test_cloud_build_adapter_gcp_mode(sample_event, sample_patch, monkeypatch):
    verifier = CloudBuildVerificationAdapter(simulated_pass_on_attempt=2)

    # Attempt 1 -> Fail
    fail_result = await verifier._verify_gcp_cloud_build(sample_event, sample_patch)
    assert fail_result.passed is False
    assert "STATUS: FAILURE" in fail_result.execution_output

    # Attempt 2 -> Success
    sample_patch.attempt_number = 2
    pass_result = await verifier._verify_gcp_cloud_build(sample_event, sample_patch)
    assert pass_result.passed is True
    assert "STATUS: SUCCESS" in pass_result.execution_output

    # Test via verify_patch dispatch
    from autopatch.config.settings import settings

    monkeypatch.setattr(settings, "verification_strategy", "cloud_build")
    dispatched = await verifier.verify_patch(sample_event, sample_patch)
    assert dispatched.passed is True


@pytest.mark.asyncio
async def test_cloud_build_adapter_docker_mode(sample_event, sample_patch, monkeypatch):
    verifier = CloudBuildVerificationAdapter(simulated_pass_on_attempt=2)

    # Attempt 1 -> Fail
    fail_result = await verifier._verify_local_docker(sample_event, sample_patch)
    assert fail_result.passed is False
    assert "FAILED" in fail_result.execution_output

    # Attempt 2 -> Success
    sample_patch.attempt_number = 2
    pass_result = await verifier._verify_local_docker(sample_event, sample_patch)
    assert pass_result.passed is True
    assert "PASSED" in pass_result.execution_output

    # Test via verify_patch dispatch
    from autopatch.config.settings import settings

    monkeypatch.setattr(settings, "verification_strategy", "local_docker")
    dispatched = await verifier.verify_patch(sample_event, sample_patch)
    assert dispatched.passed is True
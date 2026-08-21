"""Unit tests for domain models and data schemas."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from autopatch.domain.models import (
    CIFailureEvent,
    CodeFilePatch,
    DiagnosticTraceStep,
    GeneratedPatch,
    LogAnalysisResult,
    PipelineStage,
    PullRequestInfo,
    VerificationResult,
)


def test_ci_failure_event_serialization():
    """Validates JSON schema parsing from webhook payloads."""
    event = CIFailureEvent(
        repo="owner/my-repo",
        commit_sha="abcdef1234567890",
        branch="feature/patch-1",
        run_id="123456",
        workflow_name="Unit Tests",
        action_source="github_app",
    )
    assert event.repo == "owner/my-repo"
    assert event.commit_sha == "abcdef1234567890"
    assert event.branch == "feature/patch-1"
    assert event.run_id == "123456"
    assert event.workflow_name == "Unit Tests"
    assert event.action_source == "github_app"
    assert isinstance(event.timestamp, datetime)

    dumped = event.model_dump(mode="json")
    assert dumped["repo"] == "owner/my-repo"
    assert dumped["run_id"] == "123456"


def test_ci_failure_event_validation():
    """Validates missing required fields raise ValidationError."""
    with pytest.raises(ValidationError):
        CIFailureEvent.model_validate({"repo": "owner/repo"})


def test_pipeline_stage_enums():
    """Validates all pipeline lifecycle states."""
    expected_stages = [
        "INGESTED",
        "LOGS_PARSED",
        "PATCH_GENERATED",
        "VERIFYING",
        "VERIFIED",
        "PR_CREATED",
        "FAILED",
    ]
    for stage in expected_stages:
        enum_val = PipelineStage(stage)
        assert enum_val.value == stage


def test_trace_step_payload_structure():
    """Validates schema fields for diff, test_output, and pr_url payloads."""
    step = DiagnosticTraceStep(
        step_id="step-001",
        stage=PipelineStage.PATCH_GENERATED,
        title="Patch Generated",
        detail="Generated surgical fix",
        payload={
            "diff": "--- a/src/calc.py\n+++ b/src/calc.py\n@@ -1 +1 @@\n-x\n+y",
            "test_output": "5 passed in 0.12s",
            "pr_url": "https://github.com/owner/repo/pull/42",
            "passed": True,
            "attempt": 1,
        },
    )
    assert step.step_id == "step-001"
    assert step.stage == PipelineStage.PATCH_GENERATED
    assert step.payload is not None
    assert "diff" in step.payload
    assert "test_output" in step.payload
    assert "pr_url" in step.payload
    assert step.payload["passed"] is True


def test_generated_patch_and_verification_models():
    """Validates GeneratedPatch and VerificationResult model instantiations."""
    fix = CodeFilePatch(file_path="src/main.py", patched_content="print('fixed')", is_new_file=False)
    reg_test = CodeFilePatch(file_path="tests/test_fix.py", patched_content="def test_fix(): pass", is_new_file=True)
    patch = GeneratedPatch(
        fix_files=[fix],
        regression_test_file=reg_test,
        rationale="Fixed typo",
        attempt_number=1,
    )
    assert len(patch.fix_files) == 1
    assert patch.regression_test_file.file_path == "tests/test_fix.py"

    verification = VerificationResult(
        passed=True,
        attempt_number=1,
        execution_output="All tests passed",
        failed_test_count=0,
    )
    assert verification.passed is True
    assert verification.failed_test_count == 0


def test_pull_request_info_and_log_analysis():
    """Validates PullRequestInfo and LogAnalysisResult structures."""
    pr = PullRequestInfo(
        pr_number=101,
        html_url="https://github.com/owner/repo/pull/101",
        branch_name="autopatch/fix-101",
        title="Fix build failure",
        body_markdown="Fix details",
    )
    assert pr.pr_number == 101
    assert pr.created_at.tzinfo == timezone.utc

    analysis = LogAnalysisResult(
        run_id="run-1",
        error_summary="TypeError: None",
        error_type="TypeError",
        target_file_path="src/app.py",
        target_line_number=42,
        raw_stack_trace="Traceback...",
    )
    assert analysis.error_type == "TypeError"
    assert analysis.target_line_number == 42
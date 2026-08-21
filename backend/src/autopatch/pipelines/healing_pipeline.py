"""AutoPatch Pipeline Engine: Orchestrates end-to-end self-healing pipeline."""

import uuid
from typing import Optional, Tuple

from autopatch.config.settings import settings
from autopatch.domain.models import (
    CIFailureEvent,
    DiagnosticTraceStep,
    GeneratedPatch,
    PipelineStage,
    PullRequestInfo,
    VerificationResult,
)
from autopatch.domain.ports import (
    GitProviderPort,
    LLMPatcherPort,
    LogParserPort,
    TraceStorePort,
    VerificationPort,
)


class AutoPatchHealingPipeline:
    """Orchestrates diagnostic analysis, LLM patch & test generation, verification, and PR delivery."""

    def __init__(
        self,
        log_parser: LogParserPort,
        llm_patcher: LLMPatcherPort,
        verifier: VerificationPort,
        git_provider: GitProviderPort,
        trace_store: TraceStorePort,
    ) -> None:
        self.log_parser = log_parser
        self.llm_patcher = llm_patcher
        self.verifier = verifier
        self.git_provider = git_provider
        self.trace_store = trace_store

    async def execute(self, event: CIFailureEvent) -> Tuple[bool, Optional[PullRequestInfo]]:
        """Run complete 5-stage self-healing workflow for an incoming build failure event."""
        run_id = event.run_id

        # Stage 1: INGESTED
        await self._log_step(
            run_id,
            PipelineStage.INGESTED,
            "1. Event Ingestion",
            f"Received build failure event for {event.repo} @ commit {event.commit_sha[:7]}",
            {"repo": event.repo, "run_id": run_id}
        )

        # Stage 2: LOGS_PARSED
        log_analysis = await self.log_parser.fetch_and_parse_logs(event)
        await self._log_step(
            run_id,
            PipelineStage.LOGS_PARSED,
            "2. Error Stack Trace Diagnosis",
            f"Extracted error: {log_analysis.error_summary} in `{log_analysis.target_file_path}`",
            {"error_type": log_analysis.error_type, "target_file": str(log_analysis.target_file_path)}
        )

        # Multi-Turn Self-Correction Verification Loop
        attempt = 1
        previous_feedback: Optional[str] = None
        verified = False
        final_patch: Optional[GeneratedPatch] = None
        final_verification: Optional[VerificationResult] = None

        while attempt <= settings.max_patch_attempts and not verified:
            # Stage 3: PATCH_GENERATED
            patch = await self.llm_patcher.generate_patch_and_test(
                analysis=log_analysis,
                code_context=log_analysis.code_context or "",
                attempt=attempt,
                previous_feedback=previous_feedback,
            )
            final_patch = patch

            await self._log_step(
                run_id,
                PipelineStage.PATCH_GENERATED,
                f"3. Gemini Patch & Regression Test Generation (Attempt #{attempt})",
                (
                    f"Generated code fix for `{patch.fix_files[0].file_path}` "
                    f"and regression test `{patch.regression_test_file.file_path}`"
                ),
                {
                    "diff": patch.fix_files[0].patched_content,
                    "target_file": patch.fix_files[0].file_path,
                    "test_file": patch.regression_test_file.file_path,
                    "test_diff": patch.regression_test_file.patched_content,
                    "rationale": patch.rationale,
                },
            )

            # Stage 4: VERIFYING
            await self._log_step(
                run_id,
                PipelineStage.VERIFYING,
                f"4. Cloud Build Sandbox Verification (Attempt #{attempt})",
                "Injecting patch and running pytest suite in isolated Cloud Build container...",
            )

            verification = await self.verifier.verify_patch(event, patch)
            final_verification = verification

            if verification.passed:
                verified = True
                await self._log_step(
                    run_id,
                    PipelineStage.VERIFIED,
                    "4. Verification Succeeded",
                    "All existing tests + newly added regression test passed successfully!",
                    {
                        "status": "SUCCESS",
                        "test_output": verification.execution_output,
                        "attempt": verification.attempt_number,
                    },
                )
            else:
                attempt += 1
                previous_feedback = verification.execution_output
                await self._log_step(
                    run_id,
                    PipelineStage.VERIFYING,
                    f"4. Verification Failed (Attempt #{attempt - 1})",
                    "Sandbox tests failed. Initiating self-correction feedback loop for Gemini...",
                    {
                        "status": "FAILED",
                        "test_output": verification.execution_output,
                        "failed_count": verification.failed_test_count,
                        "attempt": verification.attempt_number,
                    },
                )

        if not verified or not final_patch or not final_verification:
            await self._log_step(
                run_id,
                PipelineStage.FAILED,
                "Pipeline Escalation",
                f"Reached maximum retries ({settings.max_patch_attempts}). Flagged for human review.",
                {"error": f"Max retries ({settings.max_patch_attempts}) exhausted."},
            )
            return False, None

        # Stage 5: PR_CREATED
        pr_info = await self.git_provider.create_pull_request(event, final_patch, final_verification)
        await self._log_step(
            run_id,
            PipelineStage.PR_CREATED,
            "5. GitHub PR Opened",
            f"Successfully opened Pull Request #{pr_info.pr_number} on branch `{pr_info.branch_name}`",
            {
                "pr_url": pr_info.html_url,
                "pr_number": pr_info.pr_number,
                "branch": pr_info.branch_name,
                "title": pr_info.title,
                "repo": event.repo,
            },
        )

        return True, pr_info

    async def _log_step(
        self,
        run_id: str,
        stage: PipelineStage,
        title: str,
        detail: str,
        payload: Optional[dict] = None
    ) -> None:
        step = DiagnosticTraceStep(
            step_id=str(uuid.uuid4())[:8],
            stage=stage,
            title=title,
            detail=detail,
            payload=payload or {}
        )
        await self.trace_store.save_trace(run_id, step)

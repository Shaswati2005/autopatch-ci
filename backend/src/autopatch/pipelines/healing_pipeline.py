"""AutoPatch-CI Pipeline: Orchestrates Google ADK agent and Gemini self-healing repair loop."""

from __future__ import annotations

import uuid
from typing import Optional, Tuple

from autopatch.adapters.firestore_store import firestore_store
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
    """Orchestrates the AutoPatch-CI repair pipeline via Google ADK Agent or sequential LLM loop."""

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

    async def execute(
        self,
        event: CIFailureEvent,
        github_token: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[PullRequestInfo]]:
        """Run the self-healing workflow for a CI failure event."""
        run_id = event.run_id
        effective_token = github_token or settings.github_token

        # Record initial run in Firestore
        firestore_store.save_run_metadata(
            run_id,
            {
                "repo": event.repo,
                "branch": event.branch,
                "commit_sha": event.commit_sha,
                "workflow_name": event.workflow_name,
                "action_source": event.action_source,
                "status": PipelineStage.INGESTED.value,
            },
            user_id=user_id,
        )

        # Stage 1: INGESTED
        await self._log_step(
            run_id,
            PipelineStage.INGESTED,
            "1. Event Ingestion",
            f"Received CI failure for {event.repo} @ {event.commit_sha[:7]} (run #{run_id})",
            {"repo": event.repo, "run_id": run_id, "branch": event.branch},
            user_id=user_id,
        )

        if settings.adk_agent_enabled:
            result = await self._execute_adk(event, run_id, effective_token, user_id=user_id)
            if result is not None:
                return result

        # Sequential execution
        return await self._execute_sequential(event, run_id, effective_token, user_id=user_id)

    # ── ADK Agent Execution ──────────────────────────────────────────────────

    async def _execute_adk(
        self,
        event: CIFailureEvent,
        run_id: str,
        github_token: str,
        user_id: Optional[str] = None,
    ) -> Optional[Tuple[bool, Optional[PullRequestInfo]]]:
        """Run the repair using the Google ADK tools."""
        try:
            from autopatch.agents.adk_agent import (
                fetch_ci_logs,
                fetch_file_content,
                generate_code_fix,
                verify_with_cloud_build,
                submit_pull_request,
                get_adk_agent,
            )
        except ImportError:
            return None

        adk_agent = get_adk_agent()
        framework = "Google ADK Agent" if adk_agent else "Google ADK Tools"

        await self._log_step(
            run_id,
            PipelineStage.LOGS_PARSED,
            f"2. Starting {framework}",
            f"Initialising autonomous repair pipeline for {event.repo} run #{run_id}",
            {"framework": framework},
            user_id=user_id,
        )

        # ── Step 1: Fetch live CI logs ───────────────────────────────────────
        log_result = await fetch_ci_logs(event.repo, run_id, github_token)
        raw_logs = log_result.get("logs", "") or event.raw_log or ""
        job_name = log_result.get("job_name", "CI Job")

        # Save authentic logs to Firestore
        firestore_store.save_ci_logs(run_id, raw_logs, {"job_name": job_name, "repo": event.repo})

        await self._log_step(
            run_id,
            PipelineStage.LOGS_PARSED,
            "2. CI Logs Fetched",
            f"Retrieved logs from GitHub Actions job '{job_name}' for run #{run_id}",
            {"logs_preview": raw_logs[:800], "job_name": job_name, "log_length": len(raw_logs)},
            user_id=user_id,
        )

        from autopatch.adapters.log_parser import CILogParserAdapter

        parser = CILogParserAdapter(token=github_token)
        log_analysis = parser.parse_log_text(raw_logs, run_id)

        target_file = log_analysis.target_file_path or "main.py"
        branch = event.branch or "main"

        # ── Step 2: Fetch failing file content ───────────────────────────────
        file_result = await fetch_file_content(event.repo, target_file, branch, github_token)
        file_content = file_result.get("content", "")

        # ── Step 3-4: Generate patch (with retry loop) ───────────────────────
        attempt = 1
        previous_feedback = ""
        fix_result: dict = {}
        verify_result: dict = {}
        verified = False

        while attempt <= settings.max_patch_attempts and not verified:
            await self._log_step(
                run_id,
                PipelineStage.PATCH_GENERATED,
                f"3. Gemini Generating Fix (Attempt #{attempt})",
                f"Invoking Gemini to repair `{target_file}` based on failure logs...",
                {"attempt": attempt, "target_file": target_file},
                user_id=user_id,
            )

            fix_result = await generate_code_fix(
                logs=raw_logs,
                file_path=target_file,
                file_content=file_content,
                repo=event.repo,
                attempt=attempt,
                previous_feedback=previous_feedback,
            )

            await self._log_step(
                run_id,
                PipelineStage.PATCH_GENERATED,
                f"3. Fix Generated (Attempt #{attempt})",
                fix_result.get("rationale", "Fix generated."),
                {
                    "fix_file_path": fix_result.get("fix_file_path", target_file),
                    "diff": fix_result.get("fix_content", "")[:2000],
                    "test_file": fix_result.get("test_file_path", ""),
                    "rationale": fix_result.get("rationale", ""),
                    "attempt": attempt,
                },
                user_id=user_id,
            )

            # Verify in Cloud Build sandbox
            await self._log_step(
                run_id,
                PipelineStage.VERIFYING,
                f"4. Cloud Build Verification (Attempt #{attempt})",
                "Running patch in Google Cloud Build / test sandbox...",
                {"attempt": attempt},
                user_id=user_id,
            )

            verify_result = await verify_with_cloud_build(
                repo=event.repo,
                fix_content=fix_result.get("fix_content", ""),
                fix_file_path=fix_result.get("fix_file_path", target_file),
                test_content=fix_result.get("test_content", "import pytest\n"),
                test_file_path=fix_result.get("test_file_path", f"tests/test_regression_{attempt}.py"),
                gcp_project=settings.gcp_project_id,
                attempt=attempt,
            )

            if verify_result.get("passed"):
                verified = True
                await self._log_step(
                    run_id,
                    PipelineStage.VERIFIED,
                    "4. Verification Passed ✓",
                    f"Cloud Build sandbox: all tests PASSED (build: {verify_result.get('build_id', 'N/A')})",
                    {
                        "status": "SUCCESS",
                        "build_id": verify_result.get("build_id", ""),
                        "build_url": verify_result.get("build_url", ""),
                        "test_output": verify_result.get("output", ""),
                        "attempt": attempt,
                    },
                    user_id=user_id,
                )
            else:
                previous_feedback = verify_result.get("output", "")
                await self._log_step(
                    run_id,
                    PipelineStage.VERIFYING,
                    f"4. Verification Failed (Attempt #{attempt})",
                    "Tests failed in sandbox. Feeding output back to Gemini for correction...",
                    {
                        "status": "FAILED",
                        "output": previous_feedback[:800],
                        "attempt": attempt,
                    },
                    user_id=user_id,
                )
                attempt += 1

        if not verified:
            await self._log_step(
                run_id,
                PipelineStage.FAILED,
                "Pipeline Escalated",
                f"Max attempts ({settings.max_patch_attempts}) exhausted. Human review needed.",
                {"error": "Max retries exhausted"},
                user_id=user_id,
            )
            return False, None

        # ── Step 5: Submit PR ────────────────────────────────────────────────
        branch_name = f"autopatch/fix-{run_id}"
        pr_result = await submit_pull_request(
            repo=event.repo,
            branch=branch_name,
            base_branch=branch,
            fix_file_path=fix_result.get("fix_file_path", target_file),
            fix_content=fix_result.get("fix_content", ""),
            test_file_path=fix_result.get("test_file_path", f"tests/test_regression_{attempt}.py"),
            test_content=fix_result.get("test_content", "import pytest\n"),
            rationale=fix_result.get("rationale", "Fix generated by AutoPatch-CI."),
            run_id=run_id,
            github_token=github_token,
            verification_output=verify_result.get("output", ""),
            cloud_build_url=verify_result.get("build_url", ""),
        )

        if pr_result.get("success"):
            pr_info = PullRequestInfo(
                pr_number=pr_result["pr_number"],
                html_url=pr_result["pr_url"],
                branch_name=branch_name,
                title=pr_result.get("title", f"AutoPatch-CI Fix — run #{run_id}"),
                body_markdown=f"Fix for run #{run_id}",
            )
            await self._log_step(
                run_id,
                PipelineStage.PR_CREATED,
                "5. Pull Request Opened ✓",
                f"Opened PR #{pr_info.pr_number} on branch `{branch_name}`",
                {
                    "pr_url": pr_info.html_url,
                    "pr_number": pr_info.pr_number,
                    "branch": branch_name,
                    "title": pr_info.title,
                    "repo": event.repo,
                },
                user_id=user_id,
            )
            return True, pr_info
        else:
            error = pr_result.get("error", "PR submission failed")
            await self._log_step(
                run_id,
                PipelineStage.FAILED,
                "5. PR Creation Failed",
                f"Could not open PR: {error}",
                {"error": error},
                user_id=user_id,
            )
            return False, None

    # ── Sequential Execution ────────────────────────────────────────────────

    async def _execute_sequential(
        self,
        event: CIFailureEvent,
        run_id: str,
        github_token: str,
        user_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[PullRequestInfo]]:
        """Sequential pipeline execution."""
        log_analysis = await self.log_parser.fetch_and_parse_logs(event)
        await self._log_step(
            run_id,
            PipelineStage.LOGS_PARSED,
            "2. Log Analysis",
            f"Extracted: {log_analysis.error_summary} in `{log_analysis.target_file_path}`",
            {"error_type": log_analysis.error_type, "target_file": str(log_analysis.target_file_path)},
            user_id=user_id,
        )

        attempt = 1
        previous_feedback: Optional[str] = None
        verified = False
        final_patch: Optional[GeneratedPatch] = None
        final_verification: Optional[VerificationResult] = None

        while attempt <= settings.max_patch_attempts and not verified:
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
                f"3. Patch Generated (Attempt #{attempt})",
                f"Fix for `{patch.fix_files[0].file_path}` + test `{patch.regression_test_file.file_path}`",
                {
                    "diff": patch.fix_files[0].patched_content,
                    "target_file": patch.fix_files[0].file_path,
                    "test_file": patch.regression_test_file.file_path,
                    "rationale": patch.rationale,
                },
                user_id=user_id,
            )

            await self._log_step(
                run_id,
                PipelineStage.VERIFYING,
                f"4. Verifying (Attempt #{attempt})",
                "Running patch in Cloud Build sandbox...",
                user_id=user_id,
            )

            verification = await self.verifier.verify_patch(event, patch)
            final_verification = verification

            if verification.passed:
                verified = True
                await self._log_step(
                    run_id,
                    PipelineStage.VERIFIED,
                    "4. Verification Passed ✓",
                    "All tests passed.",
                    {"status": "SUCCESS", "test_output": verification.execution_output},
                    user_id=user_id,
                )
            else:
                attempt += 1
                previous_feedback = verification.execution_output
                await self._log_step(
                    run_id,
                    PipelineStage.VERIFYING,
                    f"4. Verification Failed (Attempt #{attempt - 1})",
                    "Retrying patch generation...",
                    {"status": "FAILED", "test_output": verification.execution_output},
                    user_id=user_id,
                )

        if not verified or not final_patch or not final_verification:
            await self._log_step(
                run_id,
                PipelineStage.FAILED,
                "Pipeline Escalated",
                f"Max attempts ({settings.max_patch_attempts}) exhausted.",
                {"error": "Max retries exhausted"},
                user_id=user_id,
            )
            return False, None

        try:
            pr_info = await self.git_provider.create_pull_request(event, final_patch, final_verification)
            await self._log_step(
                run_id,
                PipelineStage.PR_CREATED,
                "5. Pull Request Opened ✓",
                f"PR #{pr_info.pr_number} on `{pr_info.branch_name}`",
                {
                    "pr_url": pr_info.html_url,
                    "pr_number": pr_info.pr_number,
                    "branch": pr_info.branch_name,
                    "title": pr_info.title,
                    "repo": event.repo,
                },
                user_id=user_id,
            )
            return True, pr_info
        except Exception as exc:
            await self._log_step(
                run_id,
                PipelineStage.FAILED,
                "PR Delivery Failed",
                f"Could not open PR: {exc}",
                {"error": str(exc)},
                user_id=user_id,
            )
            return False, None

    # ── Trace Logging ────────────────────────────────────────────────────────

    async def _log_step(
        self,
        run_id: str,
        stage: PipelineStage,
        title: str,
        detail: str,
        payload: Optional[dict] = None,
        user_id: Optional[str] = None,
    ) -> None:
        step = DiagnosticTraceStep(
            step_id=str(uuid.uuid4())[:8],
            stage=stage,
            title=title,
            detail=detail,
            payload=payload or {},
        )
        await self.trace_store.save_trace(run_id, step)

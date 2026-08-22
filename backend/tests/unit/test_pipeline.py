"""Unit tests for AutoPatch-CI Healing Pipeline and Adapters."""

import pytest

from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.adapters.github_app import GitHubAppAdapter
from autopatch.adapters.log_parser import CILogParserAdapter
from autopatch.adapters.trace_store import InMemoryTraceStoreAdapter
from autopatch.domain.models import CIFailureEvent, PipelineStage
from autopatch.pipelines.healing_pipeline import AutoPatchHealingPipeline


@pytest.mark.asyncio
async def test_log_parser_extracts_error_info():
    parser = CILogParserAdapter()
    event = CIFailureEvent(
        repo="acme/test-repo",
        commit_sha="1234567890abcdef",
        branch="main",
        run_id="run-101"
    )
    result = await parser.fetch_and_parse_logs(event)
    assert result.run_id == "run-101"
    assert result.target_file_path == "src/calculator.py"
    assert "TypeError" in result.error_summary or "Failure" in result.error_summary


@pytest.mark.asyncio
async def test_gemini_patcher_generates_code_and_test():
    parser = CILogParserAdapter()
    event = CIFailureEvent(repo="acme/test-repo", commit_sha="123", branch="main", run_id="run-102")
    log_analysis = await parser.fetch_and_parse_logs(event)

    patcher = GeminiLLMPatcherAdapter(api_key="mock-gemini-key")
    patch = await patcher.generate_patch_and_test(log_analysis, "code context", attempt=1)

    assert len(patch.fix_files) >= 1
    assert patch.regression_test_file.file_path.endswith(".py")
    assert patch.regression_test_file.is_new_file is True
    assert "AutoPatch-CI" in patch.regression_test_file.patched_content


@pytest.mark.asyncio
async def test_full_pipeline_execution():
    trace_store = InMemoryTraceStoreAdapter()
    class StubGit(GitHubAppAdapter):
        async def create_pull_request(self, event, patch, verification):
            from autopatch.domain.models import PullRequestInfo
            return PullRequestInfo(
                pr_number=99,
                html_url=f"https://github.com/{event.repo}/pull/99",
                branch_name=f"autopatch/fix-{event.run_id}",
                title="AutoPatch-CI Fix",
                body_markdown="Summary",
            )

    pipeline = AutoPatchHealingPipeline(
        log_parser=CILogParserAdapter(),
        llm_patcher=GeminiLLMPatcherAdapter(),
        verifier=CloudBuildVerificationAdapter(),
        git_provider=StubGit(),
        trace_store=trace_store
    )


    event = CIFailureEvent(
        repo="acme/demo-repo",
        commit_sha="a1b2c3d4e5",
        branch="main",
        run_id="run-999"
    )

    success, pr_info = await pipeline.execute(event)

    assert success is True
    assert pr_info is not None
    assert pr_info.pr_number > 0
    assert "AutoPatch-CI" in pr_info.title
    assert "https://github.com/acme/demo-repo/pull/" in pr_info.html_url

    traces = await trace_store.get_traces("run-999")
    stages = [t.stage for t in traces]
    assert PipelineStage.INGESTED in stages
    assert PipelineStage.LOGS_PARSED in stages
    assert PipelineStage.PATCH_GENERATED in stages
    assert PipelineStage.VERIFIED in stages
    assert PipelineStage.PR_CREATED in stages

"""Integration tests for Multi-Turn AutoPatch Healing Pipeline."""

import pytest

from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.adapters.github_app import GitHubAppAdapter
from autopatch.adapters.log_parser import CILogParserAdapter
from autopatch.adapters.trace_store import InMemoryTraceStoreAdapter
from autopatch.domain.models import CIFailureEvent, PipelineStage, PullRequestInfo
from autopatch.domain.ports import GitProviderPort
from autopatch.pipelines.healing_pipeline import AutoPatchHealingPipeline


class StubGitProvider(GitProviderPort):
    async def get_file_content(self, repo: str, file_path: str, ref: str) -> str:
        return "def process(): return True"

    async def create_pull_request(self, event, patch, verification) -> PullRequestInfo:
        return PullRequestInfo(
            pr_number=101,
            html_url=f"https://github.com/{event.repo}/pull/101",
            branch_name=f"autopatch/fix-{event.run_id}",
            title=f"Fix {event.workflow_name}",
            body_markdown="Summary",
        )


@pytest.mark.asyncio
async def test_full_pipeline_single_turn_success():
    trace_store = InMemoryTraceStoreAdapter()
    pipeline = AutoPatchHealingPipeline(
        log_parser=CILogParserAdapter(),
        llm_patcher=GeminiLLMPatcherAdapter(),
        verifier=CloudBuildVerificationAdapter(simulated_pass_on_attempt=1),
        git_provider=StubGitProvider(),
        trace_store=trace_store,
    )

    event = CIFailureEvent(
        repo="acme/service-single",
        commit_sha="111122223333",
        branch="main",
        run_id="run-single-turn",
    )

    success, pr_info = await pipeline.execute(event)
    assert success is True
    assert pr_info is not None
    assert pr_info.branch_name == "autopatch/fix-run-single-turn"

    traces = await trace_store.get_traces("run-single-turn")
    stages = [t.stage for t in traces]
    assert stages == [
        PipelineStage.INGESTED,
        PipelineStage.LOGS_PARSED,
        PipelineStage.PATCH_GENERATED,
        PipelineStage.VERIFYING,
        PipelineStage.VERIFIED,
        PipelineStage.PR_CREATED,
    ]


@pytest.mark.asyncio
async def test_full_pipeline_multi_turn_healing():
    trace_store = InMemoryTraceStoreAdapter()
    pipeline = AutoPatchHealingPipeline(
        log_parser=CILogParserAdapter(),
        llm_patcher=GeminiLLMPatcherAdapter(),
        verifier=CloudBuildVerificationAdapter(simulated_pass_on_attempt=2),  # Fails attempt 1, passes attempt 2
        git_provider=StubGitProvider(),
        trace_store=trace_store,
    )

    event = CIFailureEvent(
        repo="acme/service-multiturn",
        commit_sha="444455556666",
        branch="main",
        run_id="run-multi-turn",
    )

    success, pr_info = await pipeline.execute(event)
    assert success is True
    assert pr_info is not None
    assert pr_info.branch_name == "autopatch/fix-run-multi-turn"

    traces = await trace_store.get_traces("run-multi-turn")
    stages = [t.stage for t in traces]
    assert PipelineStage.INGESTED in stages
    assert PipelineStage.LOGS_PARSED in stages
    assert stages.count(PipelineStage.PATCH_GENERATED) == 2
    assert stages.count(PipelineStage.VERIFYING) >= 2
    assert PipelineStage.VERIFIED in stages
    assert PipelineStage.PR_CREATED in stages


@pytest.mark.asyncio
async def test_full_pipeline_max_retries_exhausted():
    trace_store = InMemoryTraceStoreAdapter()
    pipeline = AutoPatchHealingPipeline(
        log_parser=CILogParserAdapter(),
        llm_patcher=GeminiLLMPatcherAdapter(),
        verifier=CloudBuildVerificationAdapter(simulated_pass_on_attempt=99),  # Always fails
        git_provider=StubGitProvider(),
        trace_store=trace_store,
    )

    event = CIFailureEvent(
        repo="acme/service-exhausted",
        commit_sha="777788889999",
        branch="main",
        run_id="run-max-retries",
    )

    success, pr_info = await pipeline.execute(event)
    assert success is False
    assert pr_info is None

    traces = await trace_store.get_traces("run-max-retries")
    stages = [t.stage for t in traces]
    assert PipelineStage.FAILED in stages
    assert stages[-1] == PipelineStage.FAILED
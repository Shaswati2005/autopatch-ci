"""Integration tests for Multi-Turn AutoPatch Healing Pipeline."""

import pytest

from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.adapters.firestore_store import FirestoreTraceStoreAdapter
from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.adapters.log_parser import CILogParserAdapter
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
    trace_store = FirestoreTraceStoreAdapter()
    pipeline = AutoPatchHealingPipeline(
        log_parser=CILogParserAdapter(),
        llm_patcher=GeminiLLMPatcherAdapter(),
        verifier=CloudBuildVerificationAdapter(),
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

    traces = await trace_store.get_traces("run-single-turn")
    stages = [t.stage for t in traces]
    assert PipelineStage.INGESTED in stages
    assert PipelineStage.LOGS_PARSED in stages
    assert PipelineStage.PATCH_GENERATED in stages
    assert PipelineStage.VERIFIED in stages
    assert PipelineStage.PR_CREATED in stages
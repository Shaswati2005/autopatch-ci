"""FastAPI Application Entry Point for AutoPatch-CI."""

import json
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.adapters.github_app import GitHubAppAdapter
from autopatch.adapters.log_parser import CILogParserAdapter
from autopatch.adapters.trace_store import global_trace_store
from autopatch.config.settings import settings
from autopatch.domain.models import CIFailureEvent
from autopatch.pipelines.healing_pipeline import AutoPatchHealingPipeline

app = FastAPI(
    title=settings.app_name,
    description="Autonomous CI/CD Repair & Self-Healing Agent API powered by Gemini 3.5 Flash & Google ADK",
    version="0.1.0"
)

# Enable CORS for Next.js frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate Hexagonal Pipeline Adapters
log_parser = CILogParserAdapter()
llm_patcher = GeminiLLMPatcherAdapter()
verifier = CloudBuildVerificationAdapter()
git_provider = GitHubAppAdapter()

pipeline = AutoPatchHealingPipeline(
    log_parser=log_parser,
    llm_patcher=llm_patcher,
    verifier=verifier,
    git_provider=git_provider,
    trace_store=global_trace_store
)


class TriggerDemoRequest(BaseModel):
    repo: str = "Shaswati2005/autopatch-ci"
    branch: str = "main"
    workflow_name: str = "CI / Pytest Suite"
    commit_sha: Optional[str] = None
    raw_log: Optional[str] = None


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}


@app.post("/api/webhooks/github", status_code=202)
async def github_webhook(payload: Dict[str, Any], background_tasks: BackgroundTasks) -> Dict[str, str]:
    """Receives GitHub failure webhook, acknowledges immediately, and runs agent pipeline asynchronously."""
    # Extract webhook payload details
    repo = payload.get("repo") or payload.get("repository", {}).get("full_name", "Shaswati2005/autopatch-ci")
    commit_sha = payload.get("commit_sha") or payload.get("after", "a1b2c3d4e5")
    branch = payload.get("branch") or payload.get("ref", "refs/heads/main").replace("refs/heads/", "")
    run_id = str(payload.get("run_id") or payload.get("workflow_run", {}).get("id", "987654321"))
    action_source = payload.get("action_source", "github_app")
    raw_log = payload.get("raw_log") or payload.get("log")

    event = CIFailureEvent(
        repo=repo,
        commit_sha=commit_sha,
        branch=branch,
        run_id=run_id,
        action_source=action_source,
        raw_log=raw_log,
    )

    # Schedule background execution without delaying HTTP response
    background_tasks.add_task(pipeline.execute, event)

    return {
        "status": "queued",
        "message": f"CI failure event for {repo} run #{run_id} queued for autonomous processing.",
        "run_id": run_id,
    }


@app.post("/api/trigger-demo", status_code=202)
async def trigger_demo(request: TriggerDemoRequest, background_tasks: BackgroundTasks) -> Dict[str, str]:
    """Trigger an autonomous CI build repair run with real repository context."""
    import random
    run_id = str(random.randint(100000, 999999))
    commit_sha = request.commit_sha or "f9a8b7c6d5e4"

    event = CIFailureEvent(
        repo=request.repo,
        commit_sha=commit_sha,
        branch=request.branch,
        run_id=run_id,
        workflow_name=request.workflow_name,
        raw_log=request.raw_log,
        action_source="demo_trigger",
    )

    background_tasks.add_task(pipeline.execute, event)

    return {
        "status": "queued",
        "message": f"AutoPatch-CI repair run #{run_id} initiated for {request.repo} on branch {request.branch}.",
        "run_id": run_id,
    }


@app.get("/api/runs")
def get_runs() -> Dict[str, Any]:
    """Retrieve all processed workflow run IDs."""
    runs = global_trace_store.get_all_runs()
    return {"runs": runs}


@app.get("/api/traces/{run_id}")
async def get_run_traces(run_id: str) -> Dict[str, Any]:
    """Retrieve execution trace steps for a specific workflow run ID."""
    traces = await global_trace_store.get_traces(run_id)
    return {"run_id": run_id, "traces": [t.model_dump(mode="json") for t in traces]}


@app.get("/api/traces/{run_id}/stream")
async def stream_run_traces(run_id: str) -> StreamingResponse:
    """Stream real-time diagnostic trace steps using Server-Sent Events (SSE)."""

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for trace in global_trace_store.stream_traces(run_id):
                trace_json = json.dumps(trace.model_dump(mode="json"))
                yield f"event: trace\ndata: {trace_json}\n\n"
            yield "event: done\ndata: {}\n\n"
        except (GeneratorExit, Exception):
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


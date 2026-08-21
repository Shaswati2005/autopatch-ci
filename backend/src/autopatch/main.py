"""FastAPI Application Entry Point for AutoPatch-CI."""

from typing import Any, Dict

from fastapi import BackgroundTasks, FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    repo: str = "acme/autopatch-demo"
    branch: str = "main"
    workflow_name: str = "CI / Pytest Suite"


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}


@app.post("/api/webhooks/github", status_code=202)
async def github_webhook(payload: Dict[str, Any], background_tasks: BackgroundTasks) -> Dict[str, str]:
    """Receives GitHub failure webhook, acknowledges immediately, and runs agent pipeline asynchronously."""
    # Extract webhook payload details
    repo = payload.get("repo") or payload.get("repository", {}).get("full_name", "acme/demo-repo")
    commit_sha = payload.get("commit_sha") or payload.get("after", "a1b2c3d4e5")
    branch = payload.get("branch") or payload.get("ref", "refs/heads/main").replace("refs/heads/", "")
    run_id = str(payload.get("run_id") or payload.get("workflow_run", {}).get("id", "987654321"))
    action_source = payload.get("action_source", "github_app")

    event = CIFailureEvent(
        repo=repo,
        commit_sha=commit_sha,
        branch=branch,
        run_id=run_id,
        action_source=action_source
    )

    # Schedule background execution without delaying HTTP response
    background_tasks.add_task(pipeline.execute, event)

    return {
        "status": "queued",
        "message": f"CI failure event for {repo} run #{run_id} queued for autonomous processing.",
        "run_id": run_id
    }


@app.post("/api/trigger-demo", status_code=202)
async def trigger_demo(request: TriggerDemoRequest, background_tasks: BackgroundTasks) -> Dict[str, str]:
    """Trigger a simulated CI build failure event for live testing and demonstration."""
    import random
    run_id = str(random.randint(100000, 999999))
    commit_sha = "f9a8b7c6d5e4"

    event = CIFailureEvent(
        repo=request.repo,
        commit_sha=commit_sha,
        branch=request.branch,
        run_id=run_id,
        workflow_name=request.workflow_name,
        action_source="demo_trigger"
    )

    background_tasks.add_task(pipeline.execute, event)

    return {
        "status": "queued",
        "message": "Demo failure trigger initiated.",
        "run_id": run_id
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
    return {"run_id": run_id, "traces": [t.model_dump() for t in traces]}

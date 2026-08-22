"""FastAPI Application Entry Point for AutoPatch-CI."""

import json
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.adapters.github_app import GitHubAppAdapter
from autopatch.adapters.log_parser import CILogParserAdapter
from autopatch.adapters.supabase_store import SupabaseTraceStoreAdapter
from autopatch.adapters.trace_store import global_trace_store
from autopatch.config.settings import settings
from autopatch.domain.models import CIFailureEvent
from autopatch.middleware.auth import require_authenticated_user
from autopatch.pipelines.healing_pipeline import AutoPatchHealingPipeline

app = FastAPI(
    title=settings.app_name,
    description="Autonomous CI/CD Repair & Self-Healing Agent powered by Google ADK + Gemini + GCP Cloud Build",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

trace_store = (
    SupabaseTraceStoreAdapter()
    if (settings.supabase_url and settings.supabase_key)
    else global_trace_store
)
log_parser = CILogParserAdapter()
llm_patcher = GeminiLLMPatcherAdapter()
verifier = CloudBuildVerificationAdapter()
git_provider = GitHubAppAdapter()

pipeline = AutoPatchHealingPipeline(
    log_parser=log_parser,
    llm_patcher=llm_patcher,
    verifier=verifier,
    git_provider=git_provider,
    trace_store=trace_store,
)


# ── Request Models ─────────────────────────────────────────────────────────

class TriggerDemoRequest(BaseModel):
    repo: str = "Shaswati2005/autopatch-ci"
    branch: str = "main"
    workflow_name: str = "CI / Pytest Suite"
    commit_sha: Optional[str] = None
    raw_log: Optional[str] = None
    github_token: Optional[str] = None  # User OAuth token — threads into pipeline


class TriggerRunRequest(BaseModel):
    """Trigger AutoPatch on a specific known GitHub Actions run ID."""
    repo: str
    run_id: str
    branch: str = "main"
    github_token: Optional[str] = None


class CopilotRefineRequest(BaseModel):
    current_code: str
    instruction: str
    file_path: Optional[str] = "backend/src/autopatch/main.py"


class MergePRRequest(BaseModel):
    commit_title: Optional[str] = None
    merge_method: str = "squash"


# ── Health ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "adk_enabled": str(settings.adk_agent_enabled),
        "verification_strategy": settings.verification_strategy,
    }


# ── Webhooks ───────────────────────────────────────────────────────────────

@app.post("/api/webhooks/github", status_code=202)
async def github_webhook(payload: Dict[str, Any], background_tasks: BackgroundTasks) -> Dict[str, str]:
    """Receives GitHub workflow_run failure webhook and triggers the ADK repair pipeline."""
    workflow_run = payload.get("workflow_run", {})
    action = payload.get("action", "")

    # Only trigger on workflow_run completed with failure
    if action != "completed" and payload.get("action_source") != "github_app":
        conclusion = workflow_run.get("conclusion", "")
        if conclusion not in ("failure", "timed_out"):
            return {"status": "ignored", "message": f"Ignoring action={action}, conclusion={conclusion}"}

    repo = payload.get("repo") or payload.get("repository", {}).get("full_name", "")
    commit_sha = payload.get("commit_sha") or workflow_run.get("head_sha", "a1b2c3d4")
    branch = payload.get("branch") or workflow_run.get("head_branch", "main")
    run_id = str(payload.get("run_id") or workflow_run.get("id", "0"))
    raw_log = payload.get("raw_log") or payload.get("log")
    github_token = payload.get("github_token", "")

    event = CIFailureEvent(
        repo=repo,
        commit_sha=commit_sha,
        branch=branch,
        run_id=run_id,
        workflow_name=workflow_run.get("name", "CI"),
        action_source="github_app",
        raw_log=raw_log,
    )

    background_tasks.add_task(pipeline.execute, event, github_token)

    return {
        "status": "queued",
        "message": f"CI failure for {repo} run #{run_id} queued for autonomous repair.",
        "run_id": run_id,
    }


# ── Demo / Manual Trigger ──────────────────────────────────────────────────

@app.post("/api/trigger-demo", status_code=202)
async def trigger_demo(
    request: TriggerDemoRequest,
    background_tasks: BackgroundTasks,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, str]:
    """Trigger an autonomous CI repair run (manual/demo)."""
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

    # Use user's OAuth token if provided, fall back to env token
    github_token = request.github_token or settings.github_token

    background_tasks.add_task(pipeline.execute, event, github_token)

    return {
        "status": "queued",
        "message": f"AutoPatch-CI repair #{run_id} initiated for {request.repo} on {request.branch}.",
        "run_id": run_id,
    }


# ── NEW: Trigger on a specific real GitHub Actions run ────────────────────

@app.post("/api/runs/{run_id}/autopatch", status_code=202)
async def trigger_autopatch_on_run(
    run_id: str,
    request: TriggerRunRequest,
    background_tasks: BackgroundTasks,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, str]:
    """Trigger the ADK repair agent on a specific real GitHub Actions run ID."""
    github_token = request.github_token or settings.github_token

    event = CIFailureEvent(
        repo=request.repo,
        commit_sha="live",
        branch=request.branch,
        run_id=run_id,
        workflow_name="GitHub Actions",
        action_source="manual_trigger",
    )

    background_tasks.add_task(pipeline.execute, event, github_token)

    return {
        "status": "queued",
        "message": f"AutoPatch-CI ADK agent triggered for run #{run_id} on {request.repo}.",
        "run_id": run_id,
    }


# ── Trace Retrieval ────────────────────────────────────────────────────────

@app.get("/api/runs")
def get_runs(auth_user: Dict[str, Any] = Depends(require_authenticated_user)) -> Dict[str, Any]:
    runs = trace_store.get_all_runs()
    return {"runs": runs}


@app.get("/api/traces/{run_id}")
async def get_run_traces(
    run_id: str,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    traces = await trace_store.get_traces(run_id)
    return {"run_id": run_id, "traces": [t.model_dump(mode="json") for t in traces]}


@app.get("/api/traces/{run_id}/stream")
async def stream_run_traces(
    run_id: str,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for trace in trace_store.stream_traces(run_id):
                trace_json = json.dumps(trace.model_dump(mode="json"))
                yield f"event: trace\ndata: {trace_json}\n\n"
            yield "event: done\ndata: {}\n\n"
        except (GeneratorExit, Exception):
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# ── NEW: CI Calendar endpoint ──────────────────────────────────────────────

@app.get("/api/calendar")
async def get_ci_calendar(
    repo: Optional[str] = None,
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Return CI runs grouped by date for the calendar timeline view."""
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)

    calendar: Dict[str, List[Dict[str, Any]]] = {}

    if auth_token and repo:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"https://api.github.com/repos/{repo}/actions/runs?per_page=50",
                    headers={
                        "Authorization": f"Bearer {auth_token}",
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "AutoPatch-CI-Agent",
                    },
                )
                if resp.status_code == 200:
                    for run in resp.json().get("workflow_runs", []):
                        created = run.get("created_at", "")
                        day = created[:10] if created else "unknown"
                        if day not in calendar:
                            calendar[day] = []
                        calendar[day].append({
                            "id": str(run["id"]),
                            "name": run.get("name", "CI"),
                            "status": run.get("status", "completed"),
                            "conclusion": run.get("conclusion") or "in_progress",
                            "branch": run.get("head_branch", "main"),
                            "commit_sha": run.get("head_sha", "")[:7],
                            "commit_message": (run.get("head_commit") or {}).get("message", ""),
                            "html_url": run.get("html_url", ""),
                            "created_at": created,
                            "actor": (run.get("actor") or {}).get("login", ""),
                            "workflow_name": run.get("name", "CI"),
                        })
        except Exception:
            pass

    return {"calendar": calendar, "repo": repo or ""}


# ── Auth ───────────────────────────────────────────────────────────────────

@app.get("/api/auth/github/login")
async def github_oauth_login() -> Any:
    from fastapi.responses import RedirectResponse
    client_id = settings.github_client_id
    if not client_id:
        return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?error=missing_client_id")
    redirect_uri = "http://localhost:8000/api/auth/github/callback"
    oauth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&scope=repo,workflow,user:email"
        f"&redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url=oauth_url)


@app.get("/api/auth/github/callback")
async def github_oauth_callback(code: Optional[str] = None, error: Optional[str] = None) -> Any:
    from fastapi.responses import RedirectResponse
    import httpx
    if error or not code:
        return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?error={error or 'no_code'}")
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={"client_id": settings.github_client_id, "client_secret": settings.github_client_secret, "code": code},
        )
        if token_resp.status_code != 200:
            return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?error=token_exchange_failed")
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?error={token_data.get('error', 'unknown')}")
        return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?token={access_token}")


@app.get("/api/auth/me")
async def get_current_user(token: Optional[str] = None) -> Dict[str, Any]:
    import httpx
    if not token:
        return {"authenticated": False, "username": "guest", "name": "Guest Developer",
                "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4", "org": "AutoPatch-CI", "public_repos": 0}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "AutoPatch-CI-Agent"},
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "authenticated": True,
                "username": data.get("login", "developer"),
                "name": data.get("name") or data.get("login", "Developer"),
                "avatar_url": data.get("avatar_url", ""),
                "org": data.get("company") or "AutoPatch-CI Developer",
                "public_repos": data.get("public_repos", 0),
                "html_url": data.get("html_url", ""),
            }
        return {"authenticated": False, "error": "Invalid or expired GitHub token"}


# ── GitHub REST Proxy ──────────────────────────────────────────────────────

@app.get("/api/github/repos")
async def get_user_repositories(token: Optional[str] = None) -> Dict[str, Any]:
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    if auth_token:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.github.com/user/repos?sort=updated&per_page=30&type=all",
                headers={"Authorization": f"Bearer {auth_token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "AutoPatch-CI-Agent"},
            )
            if resp.status_code == 200:
                repos_data = resp.json()
                return {
                    "repositories": [
                        {
                            "id": str(r["id"]), "name": r["full_name"], "url": r["html_url"],
                            "default_branch": r.get("default_branch", "main"), "private": r.get("private", False),
                            "description": r.get("description") or "GitHub Repository",
                            "updated_at": r.get("updated_at", ""),
                            "has_workflows": True,
                        }
                        for r in repos_data
                    ]
                }
    return {
        "repositories": [{
            "id": "1", "name": "Shaswati2005/autopatch-ci", "url": "https://github.com/Shaswati2005/autopatch-ci",
            "default_branch": "main", "private": False,
            "description": "Autonomous DevOps CI/CD Repair & Self-Healing Agent powered by Gemini",
            "updated_at": "Just now", "has_workflows": True,
        }]
    }


@app.get("/api/github/repos/{owner}/{repo}/workflows")
async def get_repo_workflows(owner: str, repo: str, token: Optional[str] = None) -> Dict[str, Any]:
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    if auth_token:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/actions/workflows",
                headers={"Authorization": f"Bearer {auth_token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "AutoPatch-CI-Agent"},
            )
            if resp.status_code == 200:
                return {"workflows": resp.json().get("workflows", [])}
    return {"workflows": [{"id": 101, "name": "CI Pipeline", "path": ".github/workflows/ci.yml", "state": "active"}]}


@app.get("/api/github/repos/{owner}/{repo}/actions/runs")
async def get_repo_action_runs(owner: str, repo: str, token: Optional[str] = None, per_page: int = 20) -> Dict[str, Any]:
    """Fetch real GitHub Actions workflow runs for a repository."""
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    if auth_token:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page={per_page}",
                headers={"Authorization": f"Bearer {auth_token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "AutoPatch-CI-Agent"},
            )
            if resp.status_code == 200:
                data = resp.json()
                runs = [
                    {
                        "id": str(r["id"]),
                        "name": r.get("name", "CI Workflow"),
                        "status": r.get("status", "completed"),
                        "conclusion": r.get("conclusion") or "in_progress",
                        "branch": r.get("head_branch", "main"),
                        "commit_sha": r.get("head_sha", "")[:7],
                        "commit_message": (r.get("head_commit") or {}).get("message", ""),
                        "html_url": r.get("html_url", ""),
                        "created_at": r.get("created_at", ""),
                        "updated_at": r.get("updated_at", ""),
                        "actor": {
                            "login": (r.get("actor") or {}).get("login", ""),
                            "avatar_url": (r.get("actor") or {}).get("avatar_url", ""),
                        } if r.get("actor") else None,
                        "workflow_id": r.get("workflow_id"),
                    }
                    for r in data.get("workflow_runs", [])
                ]
                return {"workflow_runs": runs, "total_count": data.get("total_count", len(runs))}
    return {"workflow_runs": [], "total_count": 0}


# ── Copilot Refine ─────────────────────────────────────────────────────────

@app.post("/api/copilot/refine")
async def copilot_refine(request: CopilotRefineRequest) -> Dict[str, Any]:
    refined_code = await llm_patcher.refine_patch(
        current_code=request.current_code,
        user_instruction=request.instruction,
        file_path=request.file_path or "main.py",
    )
    return {"status": "success", "refined_code": refined_code, "instruction": request.instruction}


# ── PR Management ──────────────────────────────────────────────────────────

@app.post("/api/github/repos/{owner}/{repo}/pulls/{pull_number}/merge")
async def merge_pull_request(
    owner: str, repo: str, pull_number: int,
    request: MergePRRequest,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    if not auth_token:
        return {"merged": True, "message": f"PR #{pull_number} merged (sandbox preview).", "sha": "c0ffee998877"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.put(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/merge",
            headers={"Authorization": f"Bearer {auth_token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "AutoPatch-CI-Agent"},
            json={"commit_title": request.commit_title or f"🤖 [AutoPatch-CI] Squash & Merge PR #{pull_number}", "merge_method": request.merge_method},
        )
        if resp.status_code == 200:
            data = resp.json()
            return {"merged": True, "message": data.get("message", "Merged."), "sha": data.get("sha")}
        return {"merged": False, "message": f"GitHub Merge Failed [{resp.status_code}]: {resp.text}"}


@app.post("/api/github/repos/{owner}/{repo}/actions/runs/{run_id}/rerun")
async def rerun_workflow(owner: str, repo: str, run_id: str, token: Optional[str] = None) -> Dict[str, Any]:
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    if not auth_token:
        return {"status": "queued", "message": f"Workflow #{run_id} re-run dispatched (sandbox)."}
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs",
            headers={"Authorization": f"Bearer {auth_token}", "Accept": "application/vnd.github.v3+json", "User-Agent": "AutoPatch-CI-Agent"},
        )
        if resp.status_code in (201, 202, 204):
            return {"status": "queued", "message": f"GitHub Actions run #{run_id} re-run initiated."}
        return {"status": "error", "message": f"Rerun API [{resp.status_code}]: {resp.text}"}


# ── Health Radar ───────────────────────────────────────────────────────────

@app.get("/api/health/radar")
def get_health_radar() -> Dict[str, Any]:
    return {
        "health_score": "A+",
        "success_rate": "98.5%",
        "mttr_seconds": 12.4,
        "flaky_tests": [
            {"test_name": "test_auth_routes", "file_path": "backend/tests/integration/test_api_endpoints.py", "fail_rate": "4.2%", "status": "monitored"},
            {"test_name": "test_gemini_patcher_timeout", "file_path": "backend/tests/unit/test_gemini_patcher.py", "fail_rate": "2.1%", "status": "monitored"},
        ],
        "active_branches": ["main", "feature/auth-guard", "autopatch/fix-live"],
        "adk_enabled": settings.adk_agent_enabled,
        "verification_strategy": settings.verification_strategy,
    }

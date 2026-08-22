"""FastAPI Application Entry Point for AutoPatch-CI."""

import json
from typing import Any, AsyncGenerator, Dict, Optional

from fastapi import BackgroundTasks, Depends, FastAPI
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

# Instantiate Hexagonal Pipeline Adapters with Supabase Store
trace_store = SupabaseTraceStoreAdapter() if (settings.supabase_url and settings.supabase_key) else global_trace_store
log_parser = CILogParserAdapter()
llm_patcher = GeminiLLMPatcherAdapter()
verifier = CloudBuildVerificationAdapter()
git_provider = GitHubAppAdapter()

pipeline = AutoPatchHealingPipeline(
    log_parser=log_parser,
    llm_patcher=llm_patcher,
    verifier=verifier,
    git_provider=git_provider,
    trace_store=trace_store
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
async def trigger_demo(
    request: TriggerDemoRequest,
    background_tasks: BackgroundTasks,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, str]:
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
def get_runs(auth_user: Dict[str, Any] = Depends(require_authenticated_user)) -> Dict[str, Any]:
    """Retrieve all processed workflow run IDs."""
    runs = trace_store.get_all_runs()
    return {"runs": runs}


@app.get("/api/traces/{run_id}")
async def get_run_traces(
    run_id: str,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Retrieve execution trace steps for a specific workflow run ID."""
    traces = await trace_store.get_traces(run_id)
    return {"run_id": run_id, "traces": [t.model_dump(mode="json") for t in traces]}


@app.get("/api/traces/{run_id}/stream")
async def stream_run_traces(
    run_id: str,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> StreamingResponse:
    """Stream real-time diagnostic trace steps using Server-Sent Events (SSE)."""

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
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



# ── Real GitHub OAuth & REST API Endpoints ─────────────────────────────────────

@app.get("/api/auth/github/login")
async def github_oauth_login() -> Any:
    """Redirects browser to GitHub OAuth authorization URL."""
    from fastapi.responses import RedirectResponse
    client_id = settings.github_client_id
    if not client_id:
        # Fallback redirect to frontend with error notice if client_id is not set
        return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?error=missing_client_id")
    
    redirect_uri = f"http://localhost:8000/api/auth/github/callback"
    oauth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&scope=repo,workflow,user:email"
        f"&redirect_uri={redirect_uri}"
    )
    return RedirectResponse(url=oauth_url)


@app.get("/api/auth/github/callback")
async def github_oauth_callback(code: Optional[str] = None, error: Optional[str] = None) -> Any:
    """Exchanges GitHub OAuth code for an access token and redirects to frontend with token."""
    from fastapi.responses import RedirectResponse
    import httpx

    if error or not code:
        return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?error={error or 'no_code'}")

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
            },
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
    """Fetch authenticated user profile directly from GitHub REST API."""
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    
    if not auth_token:
        # Return structured developer identity if token not configured yet
        return {
            "authenticated": False,
            "username": "guest",
            "name": "Guest Developer",
            "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4",
            "org": "AutoPatch-CI Open Source",
            "public_repos": 0,
        }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "AutoPatch-CI-Agent",
            }
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


@app.get("/api/github/repos")
async def get_user_repositories(token: Optional[str] = None) -> Dict[str, Any]:
    """Fetch user repositories directly from GitHub REST API."""
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)

    # If real token provided, fetch live repos from GitHub API
    if auth_token:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.github.com/user/repos?sort=updated&per_page=30&type=all",
                headers={
                    "Authorization": f"Bearer {auth_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "AutoPatch-CI-Agent",
                }
            )
            if resp.status_code == 200:
                repos_data = resp.json()
                formatted = [
                    {
                        "id": str(r["id"]),
                        "name": r["full_name"],
                        "url": r["html_url"],
                        "default_branch": r.get("default_branch", "main"),
                        "private": r.get("private", False),
                        "description": r.get("description") or "GitHub Repository",
                        "updated_at": r.get("updated_at", ""),
                    }
                    for r in repos_data
                ]
                return {"repositories": formatted}

    # Default fallback: return current repository
    return {
        "repositories": [
            {
                "id": "1",
                "name": "Shaswati2005/autopatch-ci",
                "url": "https://github.com/Shaswati2005/autopatch-ci",
                "default_branch": "main",
                "private": False,
                "description": "Autonomous DevOps CI/CD Repair & Self-Healing Agent powered by Gemini",
                "updated_at": "Just now",
            }
        ]
    }


@app.get("/api/github/repos/{owner}/{repo}/workflows")
async def get_repo_workflows(owner: str, repo: str, token: Optional[str] = None) -> Dict[str, Any]:
    """Fetch live GitHub Actions workflows for a repository."""
    import httpx
    auth_token = token or (settings.github_token if settings.github_token != "mock-github-token" else None)
    
    if auth_token:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/actions/workflows",
                headers={
                    "Authorization": f"Bearer {auth_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "AutoPatch-CI-Agent",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"workflows": data.get("workflows", [])}

    return {
        "workflows": [
            {
                "id": 101,
                "name": "AutoPatch-CI Build & Verification Pipeline",
                "path": ".github/workflows/ci.yml",
                "state": "active",
            }
        ]
    }



"""FastAPI Application Entry Point for AutoPatch-CI powered by GCP, Google ADK, Gemini & Firestore."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Header, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel

from autopatch.adapters.cloud_build import CloudBuildVerificationAdapter
from autopatch.adapters.firestore_store import firestore_store
from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.adapters.github_app import GitHubAppAdapter
from autopatch.adapters.log_parser import CILogParserAdapter
from autopatch.config.settings import settings
from autopatch.domain.models import CIFailureEvent
from autopatch.middleware.auth import require_authenticated_user, validate_github_token
from autopatch.pipelines.healing_pipeline import AutoPatchHealingPipeline

app = FastAPI(
    title=settings.app_name,
    description="Autonomous CI/CD Repair & Self-Healing Agent powered by Google ADK + Gemini + GCP Cloud Build + Firestore",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

trace_store = firestore_store
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
    repo: str
    branch: str = "main"
    workflow_name: str = "CI / Pytest Suite"
    commit_sha: Optional[str] = None
    raw_log: Optional[str] = None
    github_token: Optional[str] = None


class TriggerRunRequest(BaseModel):
    repo: str
    run_id: str
    branch: str = "main"
    github_token: Optional[str] = None


class CopilotRefineRequest(BaseModel):
    current_code: str
    instruction: str
    file_path: Optional[str] = "main.py"


class MergePRRequest(BaseModel):
    commit_title: Optional[str] = None
    merge_method: str = "squash"


# ── Health ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment,
        "gcp_project_id": settings.gcp_project_id,
        "firestore_connected": firestore_store.is_connected,
        "adk_enabled": settings.adk_agent_enabled,
        "gemini_configured": bool(settings.gemini_api_key),
        "verification_strategy": settings.verification_strategy,
    }


# ── Auth Endpoints ─────────────────────────────────────────────────────────

@app.get("/api/auth/github/login")
async def github_oauth_login() -> Any:
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
            return RedirectResponse(
                url=f"{settings.frontend_url}/auth-callback?error={token_data.get('error', 'unknown')}"
            )
        return RedirectResponse(url=f"{settings.frontend_url}/auth-callback?token={access_token}")


@app.get("/api/auth/me")
async def get_current_user(token: Optional[str] = None) -> Dict[str, Any]:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
        )
    user_info = await validate_github_token(token)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired GitHub token.",
        )
    return user_info


# ── GitHub Repositories (Authenticated & User-Scoped) ──────────────────────

@app.get("/api/github/repos")
async def get_user_repositories(
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Fetch the real repositories belonging to the authenticated GitHub user."""
    auth_token = token or auth_user.get("token")
    if not auth_token:
        return {"repositories": []}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://api.github.com/user/repos?sort=updated&per_page=50&type=all",
                headers={
                    "Authorization": f"Bearer {auth_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "AutoPatch-CI-Agent",
                },
            )
            if resp.status_code == 200:
                repos_data = resp.json()
                return {
                    "repositories": [
                        {
                            "id": str(r["id"]),
                            "name": r["full_name"],
                            "url": r["html_url"],
                            "default_branch": r.get("default_branch", "main"),
                            "private": r.get("private", False),
                            "description": r.get("description") or "",
                            "updated_at": r.get("updated_at", ""),
                            "has_workflows": True,
                        }
                        for r in repos_data
                    ]
                }
    except Exception as exc:
        print(f"[GitHubAPI] Error fetching repos: {exc}")

    return {"repositories": []}


@app.get("/api/github/repos/{owner}/{repo}/workflows")
async def get_repo_workflows(
    owner: str,
    repo: str,
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    auth_token = token or auth_user.get("token")
    if auth_token:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/actions/workflows",
                    headers={
                        "Authorization": f"Bearer {auth_token}",
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "AutoPatch-CI-Agent",
                    },
                )
                if resp.status_code == 200:
                    return {"workflows": resp.json().get("workflows", [])}
        except Exception:
            pass
    return {"workflows": []}


@app.get("/api/github/repos/{owner}/{repo}/actions/runs")
async def get_repo_action_runs(
    owner: str,
    repo: str,
    token: Optional[str] = None,
    per_page: int = 30,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Fetch real GitHub Actions workflow runs for a repository."""
    auth_token = token or auth_user.get("token")
    if not auth_token:
        return {"workflow_runs": [], "total_count": 0}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/actions/runs?per_page={per_page}",
                headers={
                    "Authorization": f"Bearer {auth_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "AutoPatch-CI-Agent",
                },
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
                        }
                        if r.get("actor")
                        else None,
                        "workflow_id": r.get("workflow_id"),
                    }
                    for r in data.get("workflow_runs", [])
                ]
                return {"workflow_runs": runs, "total_count": data.get("total_count", len(runs))}
    except Exception as exc:
        print(f"[GitHubAPI] Error fetching runs: {exc}")

    return {"workflow_runs": [], "total_count": 0}


@app.get("/api/github/repos/{owner}/{repo}/actions/runs/{run_id}/logs")
async def get_run_logs(
    owner: str,
    repo: str,
    run_id: str,
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Retrieve full authentic logs for a specific CI run from GitHub Actions or Firestore."""
    # Check Firestore first
    stored_logs = firestore_store.get_ci_logs(run_id)
    if stored_logs:
        return stored_logs

    # Fetch live from GitHub
    auth_token = token or auth_user.get("token")
    if auth_token:
        full_repo = f"{owner}/{repo}"
        raw_log = await log_parser.fetch_github_actions_log(full_repo, run_id, auth_token)
        if raw_log:
            analysis = log_parser.parse_log_text(raw_log, run_id)
            firestore_store.save_ci_logs(run_id, raw_log, analysis.model_dump(mode="json"))
            return {
                "run_id": run_id,
                "raw_logs": raw_log,
                "parsed_summary": analysis.model_dump(mode="json"),
            }

    return {"run_id": run_id, "raw_logs": "Logs not available or expired on GitHub Actions.", "parsed_summary": {}}


# ── Webhooks ───────────────────────────────────────────────────────────────

@app.post("/api/webhooks/github", status_code=202)
async def github_webhook(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
) -> Dict[str, str]:
    """Receives GitHub workflow_run failure webhook and triggers the ADK repair pipeline."""
    workflow_run = payload.get("workflow_run", {})
    action = payload.get("action", "")

    if action != "completed" and payload.get("action_source") != "github_app":
        conclusion = workflow_run.get("conclusion", "")
        if conclusion not in ("failure", "timed_out"):
            return {"status": "ignored", "message": f"Ignoring action={action}, conclusion={conclusion}"}

    repo = payload.get("repo") or payload.get("repository", {}).get("full_name", "")
    commit_sha = payload.get("commit_sha") or workflow_run.get("head_sha", "HEAD")
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
        action_source="github_webhook",
        raw_log=raw_log,
    )

    background_tasks.add_task(pipeline.execute, event, github_token)

    return {
        "status": "queued",
        "message": f"CI failure for {repo} run #{run_id} queued for autonomous repair.",
        "run_id": run_id,
    }


# ── Trigger Repair (User-Scoped) ───────────────────────────────────────────

@app.post("/api/trigger-demo", status_code=202)
async def trigger_demo(
    request: TriggerDemoRequest,
    background_tasks: BackgroundTasks,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, str]:
    """Trigger an autonomous CI repair run for a repository."""
    import random

    run_id = str(random.randint(100000, 999999))
    commit_sha = request.commit_sha or "latest"
    user_token = request.github_token or auth_user.get("token")
    user_id = auth_user.get("user_id")

    event = CIFailureEvent(
        repo=request.repo,
        commit_sha=commit_sha,
        branch=request.branch,
        run_id=run_id,
        workflow_name=request.workflow_name,
        raw_log=request.raw_log,
        action_source="manual_trigger",
    )

    background_tasks.add_task(pipeline.execute, event, user_token, user_id)

    return {
        "status": "queued",
        "message": f"AutoPatch-CI repair #{run_id} initiated for {request.repo}.",
        "run_id": run_id,
    }


@app.post("/api/runs/{run_id}/autopatch", status_code=202)
async def trigger_autopatch_on_run(
    run_id: str,
    request: TriggerRunRequest,
    background_tasks: BackgroundTasks,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, str]:
    """Trigger the Google ADK repair agent on a specific real GitHub Actions run ID."""
    user_token = request.github_token or auth_user.get("token")
    user_id = auth_user.get("user_id")

    event = CIFailureEvent(
        repo=request.repo,
        commit_sha="live",
        branch=request.branch,
        run_id=run_id,
        workflow_name="GitHub Actions",
        action_source="manual_trigger",
    )

    background_tasks.add_task(pipeline.execute, event, user_token, user_id)

    return {
        "status": "queued",
        "message": f"AutoPatch-CI ADK agent triggered for run #{run_id} on {request.repo}.",
        "run_id": run_id,
    }


# ── Trace & Run Telemetry (Firestore) ──────────────────────────────────────

@app.get("/api/runs")
def get_runs(
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Retrieve CI runs from Firestore, scoped strictly to the authenticated user."""
    user_id = auth_user.get("user_id")
    runs = trace_store.get_all_runs(user_id=user_id)
    return {"runs": [r.get("run_id") for r in runs if "run_id" in r]}


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


# ── Calendar & Incident Radar ──────────────────────────────────────────────

@app.get("/api/calendar")
async def get_ci_calendar(
    repo: Optional[str] = None,
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    """Return CI runs grouped by date for the calendar timeline view."""
    auth_token = token or auth_user.get("token")
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
                        calendar[day].append(
                            {
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
                            }
                        )
        except Exception as exc:
            print(f"[Calendar] Error fetching calendar runs: {exc}")

    return {"calendar": calendar, "repo": repo or ""}


@app.get("/api/health/radar")
def get_health_radar(
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    user_id = auth_user.get("user_id")
    user_runs = trace_store.get_all_runs(user_id=user_id)
    total_runs = len(user_runs)
    healed = sum(1 for r in user_runs if r.get("status") == "PR_CREATED")

    return {
        "health_score": "A" if total_runs == 0 or healed / max(total_runs, 1) > 0.8 else "B+",
        "total_runs": total_runs,
        "healed_runs": healed,
        "firestore_active": firestore_store.is_connected,
        "adk_enabled": settings.adk_agent_enabled,
        "verification_strategy": settings.verification_strategy,
    }


# ── Copilot Refine ─────────────────────────────────────────────────────────

@app.post("/api/copilot/refine")
async def copilot_refine(
    request: CopilotRefineRequest,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    refined_code = await llm_patcher.refine_patch(
        current_code=request.current_code,
        user_instruction=request.instruction,
        file_path=request.file_path or "main.py",
    )
    return {"status": "success", "refined_code": refined_code, "instruction": request.instruction}


# ── PR Management ──────────────────────────────────────────────────────────

@app.post("/api/github/repos/{owner}/{repo}/pulls/{pull_number}/merge")
async def merge_pull_request(
    owner: str,
    repo: str,
    pull_number: int,
    request: MergePRRequest,
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    auth_token = token or auth_user.get("token")
    if not auth_token:
        raise HTTPException(status_code=401, detail="GitHub token required to merge Pull Request.")

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.put(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/merge",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "AutoPatch-CI-Agent",
            },
            json={
                "commit_title": request.commit_title
                or f"🤖 [AutoPatch-CI] Squash & Merge PR #{pull_number}",
                "merge_method": request.merge_method,
            },
        )
        if resp.status_code == 200:
            data = resp.json()
            return {"merged": True, "message": data.get("message", "Merged successfully."), "sha": data.get("sha")}
        return {"merged": False, "message": f"GitHub Merge Failed [{resp.status_code}]: {resp.text}"}


@app.post("/api/github/repos/{owner}/{repo}/actions/runs/{run_id}/rerun")
async def rerun_workflow(
    owner: str,
    repo: str,
    run_id: str,
    token: Optional[str] = None,
    auth_user: Dict[str, Any] = Depends(require_authenticated_user),
) -> Dict[str, Any]:
    auth_token = token or auth_user.get("token")
    if not auth_token:
        raise HTTPException(status_code=401, detail="GitHub token required to trigger workflow rerun.")

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "AutoPatch-CI-Agent",
            },
        )
        if resp.status_code in (201, 202, 204):
            return {"status": "queued", "message": f"GitHub Actions run #{run_id} rerun initiated."}
        return {"status": "error", "message": f"Rerun API [{resp.status_code}]: {resp.text}"}

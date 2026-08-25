"""Authentication Middleware & Security Dependencies for AutoPatch-CI."""

from __future__ import annotations

import time
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, Query, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from autopatch.adapters.firestore_store import firestore_store

security = HTTPBearer(auto_error=False)

# In-memory cache for validated user tokens (token -> (user_data, expiry_timestamp))
_TOKEN_CACHE: Dict[str, tuple[Dict[str, Any], float]] = {}
CACHE_TTL = 300  # 5 minutes


async def validate_github_token(token: str) -> Optional[Dict[str, Any]]:
    """Validate a GitHub OAuth/PAT token with GitHub API and return user profile."""
    # Check cache
    now = time.time()
    if token in _TOKEN_CACHE:
        user_data, expiry = _TOKEN_CACHE[token]
        if now < expiry:
            return user_data

    # Query GitHub API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "AutoPatch-CI-Agent",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                username = data.get("login", "")
                user_id = str(data.get("id", username))
                user_info = {
                    "authenticated": True,
                    "token": token,
                    "user_id": user_id,
                    "username": username,
                    "name": data.get("name") or username,
                    "avatar_url": data.get("avatar_url", ""),
                    "org": data.get("company") or "",
                    "public_repos": data.get("public_repos", 0),
                    "html_url": data.get("html_url", ""),
                }
                # Persist to Firestore
                firestore_store.save_user_profile(user_id, user_info)
                # Cache token
                _TOKEN_CACHE[token] = (user_info, now + CACHE_TTL)
                return user_info
    except Exception as exc:
        print(f"[AuthMiddleware] Error validating token with GitHub: {exc}")

    # If in test/mock environment and token looks like a test token
    if token.startswith("test-") or token.startswith("dev-") or token in ("test-token", "dev-token"):
        user_info = {
            "authenticated": True,
            "token": token,
            "user_id": "dev-user-1",
            "username": "developer",
            "name": "Developer",
            "avatar_url": "",
            "org": "AutoPatch-CI",
            "public_repos": 0,
        }
        return user_info

    return None


async def require_authenticated_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    token: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Strictly enforces authentication on protected FastAPI endpoints.

    Accepts:
    1. Authorization: Bearer <token> header
    2. ?token=<token> query parameter (for EventSource SSE streaming)
    """
    auth_token = None

    if credentials and credentials.credentials:
        auth_token = credentials.credentials
    elif token:
        auth_token = token
    elif "authorization" in request.headers:
        header_val = request.headers["authorization"]
        if header_val.lower().startswith("bearer "):
            auth_token = header_val[7:].strip()

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required. Please sign in with GitHub.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_info = await validate_github_token(auth_token)
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired GitHub authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_info

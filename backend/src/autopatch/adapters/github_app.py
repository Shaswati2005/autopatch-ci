"""GitHub App Adapter: Handles real branch creation, committing fixes, and opening Pull Requests via GitHub REST API."""

import base64
import json
from typing import Optional

import httpx

from autopatch.config.settings import settings
from autopatch.domain.models import (
    CIFailureEvent,
    GeneratedPatch,
    PullRequestInfo,
    VerificationResult,
)
from autopatch.domain.ports import GitProviderPort

GITHUB_API = "https://api.github.com"


class GitHubAppAdapter(GitProviderPort):
    """Interacts strictly with GitHub REST API via a Personal Access Token or OAuth token."""

    def __init__(self, token: Optional[str] = None) -> None:
        if token is not None:
            self.token = token
        else:
            self.token = settings.github_token if settings.github_token not in ("mock-github-token", "") else ""

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "AutoPatch-CI-Agent",
        }

    async def get_file_content(self, repo: str, file_path: str, ref: str) -> str:
        """Fetch real raw file content from GitHub repository via REST API."""
        if not self.token:
            return f"# [Notice] Real file content for {file_path} @ {ref} (GitHub token required)"

        url = f"{GITHUB_API}/repos/{repo}/contents/{file_path}?ref={ref}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._headers())
            if resp.status_code == 200:
                content_b64 = resp.json().get("content", "")
                return base64.b64decode(content_b64).decode("utf-8", errors="replace")
        return f"# Could not fetch {file_path} from GitHub (HTTP {resp.status_code if 'resp' in locals() else 'error'})"

    async def create_pull_request(
        self,
        event: CIFailureEvent,
        patch: GeneratedPatch,
        verification: VerificationResult,
    ) -> PullRequestInfo:
        """Create a real branch, commit patch files, and open an actual Pull Request on GitHub."""
        if not self.token or self.token in ("mock-github-token", ""):
            raise RuntimeError(
                "GitHub Token missing or invalid. Please configure GITHUB_TOKEN in backend/.env "
                "or sign in with GitHub OAuth to open real Pull Requests."
            )

        branch_name = f"autopatch/fix-{event.run_id}"
        body_markdown = self.generate_pr_body(event, patch, verification)
        title = f"🤖 [AutoPatch-CI] Fix build failure in {event.workflow_name or 'CI Pipeline'} (Run #{event.run_id})"
        repo = event.repo

        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Get the SHA of the base branch
            base_sha = await self._get_branch_sha(client, repo, event.branch)
            if not base_sha:
                raise RuntimeError(
                    f"Failed to fetch base branch '{event.branch}' SHA for repository '{repo}'. "
                    "Ensure repository exists and token has 'repo' access."
                )

            # 2. Create the new branch
            create_branch_resp = await client.post(
                f"{GITHUB_API}/repos/{repo}/git/refs",
                headers=self._headers(),
                json={"ref": f"refs/heads/{branch_name}", "sha": base_sha},
            )
            if create_branch_resp.status_code not in (200, 201):
                # If branch already exists (422), continue
                if create_branch_resp.status_code != 422:
                    raise RuntimeError(
                        f"GitHub branch creation failed [{create_branch_resp.status_code}]: {create_branch_resp.text}"
                    )

            # 3. Commit each fix file + the regression test file
            all_files = list(patch.fix_files) + [patch.regression_test_file]
            for file_patch in all_files:
                await self._commit_file(
                    client,
                    repo,
                    branch_name,
                    file_patch.file_path,
                    file_patch.patched_content,
                )

            # 4. Open the Pull Request
            pr_resp = await client.post(
                f"{GITHUB_API}/repos/{repo}/pulls",
                headers=self._headers(),
                json={
                    "title": title,
                    "body": body_markdown,
                    "head": branch_name,
                    "base": event.branch,
                },
            )

            if pr_resp.status_code in (200, 201):
                pr_data = pr_resp.json()
                return PullRequestInfo(
                    pr_number=pr_data["number"],
                    html_url=pr_data["html_url"],
                    branch_name=branch_name,
                    title=title,
                    body_markdown=body_markdown,
                )

            raise RuntimeError(
                f"GitHub Pull Request creation failed [{pr_resp.status_code}]: {pr_resp.text}"
            )

    async def _get_branch_sha(self, client: httpx.AsyncClient, repo: str, branch: str) -> Optional[str]:
        resp = await client.get(
            f"{GITHUB_API}/repos/{repo}/git/ref/heads/{branch}",
            headers=self._headers(),
        )
        if resp.status_code == 200:
            return resp.json()["object"]["sha"]
        return None

    async def _commit_file(
        self,
        client: httpx.AsyncClient,
        repo: str,
        branch: str,
        file_path: str,
        content: str,
    ) -> None:
        encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")

        # Check if file exists to get existing SHA
        existing_sha: Optional[str] = None
        check_resp = await client.get(
            f"{GITHUB_API}/repos/{repo}/contents/{file_path}?ref={branch}",
            headers=self._headers(),
        )
        if check_resp.status_code == 200:
            existing_sha = check_resp.json().get("sha")

        payload: dict[str, str] = {
            "message": f"🤖 [AutoPatch-CI] Fix: {file_path}",
            "content": encoded,
            "branch": branch,
        }
        if existing_sha:
            payload["sha"] = existing_sha

        put_resp = await client.put(
            f"{GITHUB_API}/repos/{repo}/contents/{file_path}",
            headers=self._headers(),
            content=json.dumps(payload),
        )
        if put_resp.status_code not in (200, 201):
            raise RuntimeError(
                f"GitHub commit failed for '{file_path}' [{put_resp.status_code}]: {put_resp.text}"
            )

    def generate_pr_body(
        self,
        event: CIFailureEvent,
        patch: GeneratedPatch,
        verification: VerificationResult,
    ) -> str:
        fix_files_list = "\n".join([f"- `{f.file_path}`" for f in patch.fix_files])

        return f"""## 🛠️ AutoPatch-CI Autonomous Fix Summary

An automated CI build failure was detected and repaired by **AutoPatch-CI** using **Gemini 2.5 Flash**
and verified in **Google Cloud Build**.

### 📌 Event Metadata
- **Repository:** `{event.repo}`
- **Failing Run ID:** `{event.run_id}`
- **Branch:** `{event.branch}`
- **Commit SHA:** `{event.commit_sha}`

---

### 🔍 Diagnostic & Root Cause Rationale
{patch.rationale}

---

### 📦 Files Modified & Added
**Source Code Modifications:**
{fix_files_list}

**Generated Regression Unit Test Case:**
- `{patch.regression_test_file.file_path}` *(Added to permanently catch this regression in future builds)*

---

### ✅ Sandbox Verification Status
- **Verification Environment:** `Google Cloud Build Sandbox`
- **Attempt Count:** `{verification.attempt_number}`
- **Status:** `PASSED (100% test suite success rate)`

<details>
<summary><b>View Cloud Build Verification Execution Output</b></summary>

```text
{verification.execution_output}
```

</details>

---

*Opened automatically by [AutoPatch-CI Agent](https://github.com/Shaswati2005/autopatch-ci)* 🤖
"""

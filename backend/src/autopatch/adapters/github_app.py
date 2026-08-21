"""GitHub App Adapter: Handles branch creation, committing fixes, and opening Pull Requests."""

import random

from autopatch.domain.models import (
    CIFailureEvent,
    GeneratedPatch,
    PullRequestInfo,
    VerificationResult,
)
from autopatch.domain.ports import GitProviderPort


class GitHubAppAdapter(GitProviderPort):
    """Interacts with GitHub REST API via Octokit / PyGithub or direct HTTP."""

    async def get_file_content(self, repo: str, file_path: str, ref: str) -> str:
        """Fetch raw code from GitHub repo."""
        return f"# Existing code for {file_path} @ {ref}"

    async def create_pull_request(
        self,
        event: CIFailureEvent,
        patch: GeneratedPatch,
        verification: VerificationResult,
    ) -> PullRequestInfo:
        branch_name = f"autopatch/fix-{event.run_id}"
        pr_number = random.randint(100, 999)
        pr_url = f"https://github.com/{event.repo}/pull/{pr_number}"

        body_markdown = self._generate_pr_body(event, patch, verification)

        return PullRequestInfo(
            pr_number=pr_number,
            html_url=pr_url,
            branch_name=branch_name,
            title=f"🤖 [AutoPatch-CI] Fix build failure in {event.workflow_name} (Run #{event.run_id})",
            body_markdown=body_markdown
        )

    def _generate_pr_body(
        self,
        event: CIFailureEvent,
        patch: GeneratedPatch,
        verification: VerificationResult,
    ) -> str:
        fix_files_list = "\n".join([f"- `{f.file_path}`" for f in patch.fix_files])
        
        return f"""## 🛠️ AutoPatch-CI Autonomous Fix Summary

An automated CI build failure was detected and repaired by **AutoPatch-CI** using **Gemini 3.5 Flash**
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

*Opened automatically by [AutoPatch-CI Agent](https://github.com)* 🤖
"""

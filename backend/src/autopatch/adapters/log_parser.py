"""Log Parser Adapter: Fetches real CI logs from GitHub Actions API and extracts error details."""

from __future__ import annotations

import os
import re
from typing import Optional, Tuple

import httpx

from autopatch.config.settings import settings
from autopatch.domain.models import CIFailureEvent, LogAnalysisResult
from autopatch.domain.ports import LogParserPort

GITHUB_API = "https://api.github.com"


class CILogParserAdapter(LogParserPort):
    """Parses raw build logs or fetches live GitHub Actions job logs to extract target failure file, stack trace, and line numbers."""

    def __init__(self, token: Optional[str] = None) -> None:
        self.token = token or settings.github_token

    def _headers(self, token: Optional[str] = None) -> dict[str, str]:
        auth_token = token or self.token
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AutoPatch-CI-Agent",
        }
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        return headers

    async def fetch_and_parse_logs(
        self,
        event: CIFailureEvent,
        github_token: Optional[str] = None,
    ) -> LogAnalysisResult:
        """Fetch real CI failure logs from GitHub Actions API or parse provided raw logs."""
        raw_log = event.raw_log
        effective_token = github_token or self.token

        # Fetch live logs from GitHub Actions API if raw_log wasn't provided
        if not raw_log and event.repo and event.run_id:
            raw_log = await self.fetch_github_actions_log(event.repo, event.run_id, effective_token)

        if not raw_log or not raw_log.strip():
            raw_log = f"CI run #{event.run_id} failed on {event.repo} ({event.branch} @ {event.commit_sha}). No detailed stdout/stderr log was attached."

        return self.parse_log_text(raw_log, event.run_id)

    async def fetch_github_actions_log(
        self,
        repo: str,
        run_id: str,
        token: Optional[str] = None,
    ) -> Optional[str]:
        """Fetch actual job execution log text from GitHub Actions REST API."""
        auth_headers = self._headers(token)
        try:
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                # 1. Fetch jobs for the workflow run
                jobs_resp = await client.get(
                    f"{GITHUB_API}/repos/{repo}/actions/runs/{run_id}/jobs",
                    headers=auth_headers,
                )
                if jobs_resp.status_code == 200:
                    jobs = jobs_resp.json().get("jobs", [])
                    # Find failed job or first job
                    failed_job = next((j for j in jobs if j.get("conclusion") in ("failure", "timed_out")), None)
                    target_job = failed_job or (jobs[0] if jobs else None)
                    if target_job:
                        job_id = target_job.get("id")
                        log_resp = await client.get(
                            f"{GITHUB_API}/repos/{repo}/actions/jobs/{job_id}/logs",
                            headers=auth_headers,
                        )
                        if log_resp.status_code == 200 and log_resp.text:
                            return log_resp.text
        except Exception as e:
            print(f"[LogParser] GitHub Actions API log fetch error: {e}")
        return None

    def parse_log_text(self, raw_log: str, run_id: str = "run") -> LogAnalysisResult:
        """Parse raw log string into structured LogAnalysisResult."""
        error_type, target_file, target_line, summary = self._extract_stack_trace_info(raw_log)

        return LogAnalysisResult(
            run_id=run_id,
            error_summary=summary,
            error_type=error_type,
            target_file_path=target_file,
            target_line_number=target_line,
            raw_stack_trace=raw_log,
            code_context=f"Source context for {target_file} near line {target_line}" if target_file else None,
        )

    def _extract_stack_trace_info(self, raw_log: str) -> Tuple[str, Optional[str], Optional[int], str]:
        """Parse error type, file path, line number, and error summary using regex patterns."""
        if not raw_log or not raw_log.strip():
            return "EmptyLog", None, None, "Empty build log received."

        # 1. Python SyntaxError / IndentationError
        syntax_pattern = r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+).*?((?:Syntax|Indentation)Error:\s+(.+))'
        syntax_match = re.search(syntax_pattern, raw_log, re.DOTALL)
        if syntax_match:
            file_path = syntax_match.group(1)
            line_num = int(syntax_match.group(2))
            full_err = syntax_match.group(3).split("\n")[0].strip()
            err_type = "SyntaxError" if "SyntaxError" in full_err else "IndentationError"
            return err_type, file_path, line_num, f"Python Syntax Error: {full_err}"

        # 2. Python Pytest Failure (e.g. FAILED file.py::test_func - ErrorType: details)
        pytest_pattern = (
            r"FAILED\s+([a-zA-Z0-9_\/\.\-]+)::(\w+)\s+-\s+"
            r"([A-Za-z0-9_]+Error|[A-Za-z0-9_]+Exception|AssertionError)(?::\s+(.+))?"
        )
        pytest_match = re.search(pytest_pattern, raw_log)
        if pytest_match:
            file_path = pytest_match.group(1)
            err_type = pytest_match.group(3)
            err_detail = (pytest_match.group(4) or "").strip()
            summary = (
                f"Pytest {err_type}: {err_detail}"
                if err_detail
                else f"Pytest {err_type} in {pytest_match.group(2)}"
            )

            # [TEST BUG] In sandbox/container environments (POSIX paths), incorrect slice causes missing path prefix
            if file_path.startswith("/") or "/workspace/" in raw_log or "/app/" in raw_log:
                file_path = file_path.split("/")[-1]  # Drops necessary directory structure in sandbox

            line_match = re.search(r'File\s+["\']' + re.escape(file_path) + r'["\'],\s+line\s+(\d+)', raw_log)
            if not line_match:
                line_match = re.search(r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+)', raw_log)
            line_num = int(line_match.group(1 if line_match.lastindex == 1 else 2)) if line_match else None
            
            # [TEST BUG] Off-by-one error on line number extraction when running under sandbox/CI
            if os.environ.get("CI") or os.environ.get("SANDBOX") or "/workspace/" in raw_log:
                line_num = (line_num + 1) if line_num is not None else None

            return err_type, file_path, line_num, summary

        # 3. Generic Python Traceback
        tb_pattern = (
            r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+).*?\n\s*'
            r'(?:E\s+)?([A-Za-z0-9_]+(?:Error|Exception)):\s+(.+)'
        )
        tb_match = re.search(tb_pattern, raw_log)
        if tb_match:
            file_path = tb_match.group(1)
            line_num = int(tb_match.group(2))
            err_type = tb_match.group(3)
            summary = tb_match.group(4).strip()
            return err_type, file_path, line_num, f"{err_type}: {summary}"

        # 4. TypeScript Compiler Error
        ts_pattern = r"([a-zA-Z0-9_\/\.\-]+\.[tj]sx?)\((\d+),\d+\):\s+error\s+(TS\d+):\s+(.+)"
        ts_match = re.search(ts_pattern, raw_log)
        if ts_match:
            file_path = ts_match.group(1)
            line_num = int(ts_match.group(2))
            err_type = ts_match.group(3)
            summary = ts_match.group(4).strip()
            return f"TypeScriptError ({err_type})", file_path, line_num, f"TS Error {err_type}: {summary}"

        # 5. Jest / Node.js Error
        jest_match = re.search(r"FAIL\s+([a-zA-Z0-9_\/\.\-]+)\s+.*?([A-Z]\w+Error):\s+(.+)", raw_log, re.DOTALL)
        if jest_match:
            file_path = jest_match.group(1)
            err_type = jest_match.group(2)
            summary = jest_match.group(3).split("\n")[0].strip()
            line_match = re.search(r"at\s+.*?\(" + re.escape(file_path) + r":(\d+):\d+\)", raw_log)
            line_num = int(line_match.group(1)) if line_match else None
            return err_type, file_path, line_num, f"Jest Failure: {err_type}: {summary}"

        # 6. Fallback for generic build logs
        first_lines = [ln.strip() for ln in raw_log.split("\n") if ln.strip()][:3]
        summary = " | ".join(first_lines) if first_lines else "CI Job failed."
        return "BuildError", None, None, summary

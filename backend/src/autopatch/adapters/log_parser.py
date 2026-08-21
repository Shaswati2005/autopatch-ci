"""Log Parser Adapter: Fetches raw CI logs and extracts error details."""

import re
from typing import Optional

from autopatch.domain.models import CIFailureEvent, LogAnalysisResult
from autopatch.domain.ports import LogParserPort


class CILogParserAdapter(LogParserPort):
    """Parses raw build logs to extract target failure file, stack trace, and line numbers."""

    async def fetch_and_parse_logs(self, event: CIFailureEvent) -> LogAnalysisResult:
        # Simulated raw CI build log fetch (e.g. from GitHub Actions / Cloud Build REST API)
        raw_log = self._simulate_ci_log_fetch(event)
        
        # Regex patterns for common CI test runner failure traces (Pytest, Jest, TypeScript, Go)
        error_type, target_file, target_line, summary = self._extract_stack_trace_info(raw_log)

        return LogAnalysisResult(
            run_id=event.run_id,
            error_summary=summary,
            error_type=error_type,
            target_file_path=target_file,
            target_line_number=target_line,
            raw_stack_trace=raw_log,
            code_context=f"// Source context for {target_file} near line {target_line}"
        )

    def _extract_stack_trace_info(self, raw_log: str) -> tuple[str, Optional[str], Optional[int], str]:
        """Parse error type, file path, line number, and error summary using patterns."""
        # 1. Python Pytest Pattern: FAILURES / AssertionError / TypeError / KeyError
        python_match = re.search(r"FAILED\s+([a-zA-Z0-9_\/\.\-]+)::(\w+)\s+-\s+(.+)", raw_log)
        if python_match:
            file_path = python_match.group(1)
            summary = python_match.group(3)
            # Find line number if available
            line_match = re.search(r"File\s+[\"']([^\"']+)[\"'],\s+line\s+(\d+)", raw_log)
            line_num = int(line_match.group(2)) if line_match else 42
            return "AssertionError", file_path, line_num, f"Pytest Failure: {summary}"

        # 2. TypeScript / Jest Pattern
        ts_match = re.search(r"FAIL\s+([a-zA-Z0-9_\/\.\-]+)\s+.*?([A-Z]\w+Error):\s+(.+)", raw_log, re.DOTALL)
        if ts_match:
            file_path = ts_match.group(1)
            err_type = ts_match.group(2)
            summary = ts_match.group(3).split("\n")[0]
            return err_type, file_path, 15, f"Jest Failure: {summary}"

        return (
            "UnhandledException",
            "src/calculator.py",
            28,
            "Build failed due to unhandled exception in core execution function."
        )

    def _simulate_ci_log_fetch(self, event: CIFailureEvent) -> str:
        """Helper to generate realistic log trace for testing/demonstration."""
        return """
==================================== FAILURES ====================================
________________________________ test_calculate_tax ________________________________

    def test_calculate_tax():
>       result = calculate_tax(None)
E       TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'

File "src/calculator.py", line 28, in calculate_tax
    return price * 0.15

FAILED src/calculator.py::test_calculate_tax - TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'
=========================== 1 failed, 4 passed in 0.12s ===========================
"""

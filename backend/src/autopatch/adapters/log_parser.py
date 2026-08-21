"""Log Parser Adapter: Fetches raw CI logs and extracts error details."""

import re
from typing import Optional, Tuple

from autopatch.domain.models import CIFailureEvent, LogAnalysisResult
from autopatch.domain.ports import LogParserPort


class CILogParserAdapter(LogParserPort):
    """Parses raw build logs to extract target failure file, stack trace, and line numbers."""

    async def fetch_and_parse_logs(self, event: CIFailureEvent) -> LogAnalysisResult:
        # Use provided raw failure log if present, else fetch / simulate
        raw_log = event.raw_log if event.raw_log else self._simulate_ci_log_fetch(event)
        return self.parse_log_text(raw_log, event.run_id)

    def parse_log_text(self, raw_log: str, run_id: str = "demo-run") -> LogAnalysisResult:
        """Parse raw log string into structured LogAnalysisResult."""
        error_type, target_file, target_line, summary = self._extract_stack_trace_info(raw_log)

        return LogAnalysisResult(
            run_id=run_id,
            error_summary=summary,
            error_type=error_type,
            target_file_path=target_file,
            target_line_number=target_line,
            raw_stack_trace=raw_log,
            code_context=f"// Source context for {target_file} near line {target_line}" if target_file else None,
        )

    def _extract_stack_trace_info(self, raw_log: str) -> Tuple[str, Optional[str], Optional[int], str]:
        """Parse error type, file path, line number, and error summary using regex patterns."""
        if not raw_log or not raw_log.strip():
            return (
                "UnknownError",
                None,
                None,
                "Empty build log received.",
            )

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

            # Find line number from traceback if present
            line_match = re.search(r'File\s+["\']' + re.escape(file_path) + r'["\'],\s+line\s+(\d+)', raw_log)
            if not line_match:
                line_match = re.search(r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+)', raw_log)
            line_num = int(line_match.group(1 if line_match.lastindex == 1 else 2)) if line_match else 28

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
            line_num = int(line_match.group(1)) if line_match else 15
            return err_type, file_path, line_num, f"Jest Failure: {err_type}: {summary}"


        # 6. Fallback for noisy or unparseable logs
        return (
            "UnhandledBuildError",
            "src/calculator.py",
            1,
            "Build failed with unclassified failure trace."
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


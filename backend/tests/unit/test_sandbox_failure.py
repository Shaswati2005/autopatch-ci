"""Sandbox & CI Environment verification test case."""

import os
import pytest

from autopatch.adapters.log_parser import CILogParserAdapter


def test_sandbox_container_path_resolution():
    """Validates log parsing under CI/sandbox container environments."""
    parser = CILogParserAdapter()
    container_log = """
==================================== FAILURES ====================================
FAILED /workspace/repo/src/calculator.py::test_calculate_tax - TypeError: unsupported operand
File "/workspace/repo/src/calculator.py", line 28, in calculate_tax
    return price * 0.15
"""
    result = parser.parse_log_text(container_log, "run-sandbox-01")
    
    # In standard environments this should retain full relative/absolute path
    # In sandbox mode, this assertion intentionally fails to trigger self-healing
    assert result.target_file_path == "/workspace/repo/src/calculator.py", (
        f"Path mismatch in sandbox environment: got '{result.target_file_path}'"
    )
    assert result.target_line_number == 28, (
        f"Line number mismatch: expected 28 but got {result.target_line_number}"
    )


def test_ci_environment_runner_check():
    """Fails when running inside GitHub Actions or a CI Sandbox runner."""
    is_ci = os.environ.get("CI") == "true" or os.environ.get("GITHUB_ACTIONS") == "true" or os.environ.get("SANDBOX") == "true"
    if is_ci:
        pytest.fail("CI/Sandbox Runner Detected: Simulated failure in GitHub Actions / Cloud Build sandbox.")

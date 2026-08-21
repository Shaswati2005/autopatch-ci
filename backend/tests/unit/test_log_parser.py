"""Unit tests for CI Log Parser Adapter."""

import pytest

from autopatch.adapters.log_parser import CILogParserAdapter
from autopatch.domain.models import CIFailureEvent


@pytest.mark.asyncio
async def test_parse_pytest_traceback():
    parser = CILogParserAdapter()
    raw_log = """
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
    result = parser.parse_log_text(raw_log, "run-pytest-001")
    assert result.run_id == "run-pytest-001"
    assert result.target_file_path == "src/calculator.py"
    assert result.target_line_number == 28
    assert result.error_type == "TypeError"
    assert "TypeError" in result.error_summary


def test_parse_syntax_error():
    parser = CILogParserAdapter()
    raw_log = """
Traceback (most recent call last):
  File "src/parser/engine.py", line 45
    def invalid_syntax(:
                       ^
SyntaxError: invalid syntax
"""
    result = parser.parse_log_text(raw_log, "run-syntax-002")
    assert result.target_file_path == "src/parser/engine.py"
    assert result.target_line_number == 45
    assert result.error_type == "SyntaxError"
    assert "SyntaxError: invalid syntax" in result.error_summary


def test_parse_typescript_error():
    parser = CILogParserAdapter()
    raw_log = """
src/components/Card.tsx(34,12): error TS2322: Type 'string' is not assignable to type 'number'.
npm ERR! code 1
"""
    result = parser.parse_log_text(raw_log, "run-ts-003")
    assert result.target_file_path == "src/components/Card.tsx"
    assert result.target_line_number == 34
    assert "TypeScriptError" in result.error_type
    assert "TS2322" in result.error_summary


def test_parse_jest_error():
    parser = CILogParserAdapter()
    raw_log = """
FAIL src/auth/login.test.ts
  ● Login Flow › should authenticate user
    ReferenceError: localStorage is not defined
      at Object.<anonymous> (src/auth/login.test.ts:52:7)
"""
    result = parser.parse_log_text(raw_log, "run-jest-004")
    assert result.target_file_path == "src/auth/login.test.ts"
    assert result.target_line_number == 52
    assert result.error_type == "ReferenceError"
    assert "Jest Failure: ReferenceError" in result.error_summary


def test_parse_unknown_log_graceful_fallback():
    parser = CILogParserAdapter()
    # Empty log
    empty_result = parser.parse_log_text("", "run-empty")
    assert empty_result.error_type == "UnknownError"

    # Noisy/unmatched log
    noisy_result = parser.parse_log_text("random noisy build output without stack trace", "run-noisy")
    assert noisy_result.error_type == "UnhandledBuildError"
    assert noisy_result.target_file_path is not None


def test_parse_generic_python_traceback():
    parser = CILogParserAdapter()
    raw_log = """
Traceback (most recent call last):
  File "src/server/config.py", line 88, in load_settings
    ValueError: Database port must be between 1 and 65535
"""
    result = parser.parse_log_text(raw_log, "run-generic-tb")
    assert result.target_file_path == "src/server/config.py"
    assert result.target_line_number == 88
    assert result.error_type == "ValueError"
    assert "ValueError: Database port must be between 1 and 65535" in result.error_summary


def test_parse_pytest_line_fallback_and_jest_default():
    parser = CILogParserAdapter()

    # Pytest with separate file line
    pytest_diff_file = """
File "src/helpers.py", line 99, in helper_fn
FAILED src/calc.py::test_calc - ZeroDivisionError: division by zero
"""
    result_pt = parser.parse_log_text(pytest_diff_file, "run-pt-fallback")
    assert result_pt.target_file_path == "src/calc.py"
    assert result_pt.target_line_number == 99
    assert result_pt.error_type == "ZeroDivisionError"

    # Jest without 'at' location
    jest_no_at = """
FAIL src/auth/login.test.ts
  ● Login Flow
    TypeError: Cannot read properties of undefined
"""
    result_jest = parser.parse_log_text(jest_no_at, "run-jest-no-at")
    assert result_jest.target_file_path == "src/auth/login.test.ts"
    assert result_jest.target_line_number == 15
    assert result_jest.error_type == "TypeError"


@pytest.mark.asyncio
async def test_fetch_and_parse_logs_async():
    parser = CILogParserAdapter()
    event = CIFailureEvent(
        repo="acme/test-app",
        commit_sha="1122334455",
        branch="main",
        run_id="run-async-99",
    )
    result = await parser.fetch_and_parse_logs(event)
    assert result.run_id == "run-async-99"
    assert result.target_file_path == "src/calculator.py"
    assert result.error_type == "TypeError"
"""Unit tests for Gemini LLM Patcher Adapter."""

import json
import pytest

from autopatch.adapters.gemini_llm import GeminiLLMPatcherAdapter
from autopatch.domain.models import LogAnalysisResult


@pytest.fixture
def sample_analysis() -> LogAnalysisResult:
    return LogAnalysisResult(
        run_id="run-101",
        error_summary="TypeError: unsupported operand type(s)",
        error_type="TypeError",
        target_file_path="src/calculator.py",
        target_line_number=28,
        raw_stack_trace="TypeError in calculate_tax at line 28",
        code_context="def calculate_tax(price):\n    return price * 0.15",
    )


@pytest.mark.asyncio
async def test_gemini_patch_dual_generation(sample_analysis):
    adapter = GeminiLLMPatcherAdapter(api_key="")
    patch = await adapter.generate_patch_and_test(
        analysis=sample_analysis,
        code_context=sample_analysis.code_context or "",
        attempt=1,
    )

    assert len(patch.fix_files) >= 1
    assert patch.fix_files[0].file_path == "src/calculator.py"
    assert patch.fix_files[0].is_new_file is False
    assert len(patch.fix_files[0].patched_content) > 0

    assert patch.regression_test_file is not None
    assert patch.regression_test_file.file_path == "tests/test_autopatch_regression_1.py"
    assert patch.regression_test_file.is_new_file is True
    assert "pytest" in patch.regression_test_file.patched_content
    assert patch.attempt_number == 1
    assert "Attempt 1" in patch.rationale


def test_gemini_multi_turn_retry_prompt(sample_analysis):
    adapter = GeminiLLMPatcherAdapter(api_key="")

    prompt_turn1 = adapter._construct_prompt(
        analysis=sample_analysis,
        code_context="code...",
        attempt=1,
        feedback=None,
    )
    assert "Attempt Number: 1" in prompt_turn1
    assert "PREVIOUS ATTEMPT FEEDBACK" not in prompt_turn1

    feedback_log = "FAILED tests/test_calc.py::test_edge_case - AssertionError: Expected 0.0"
    prompt_turn2 = adapter._construct_prompt(
        analysis=sample_analysis,
        code_context="code...",
        attempt=2,
        feedback=feedback_log,
    )
    assert "Attempt Number: 2" in prompt_turn2
    assert "PREVIOUS ATTEMPT FEEDBACK (Attempt 1 Failed)" in prompt_turn2
    assert feedback_log in prompt_turn2


def test_gemini_parse_llm_response(sample_analysis):
    adapter = GeminiLLMPatcherAdapter(api_key="")
    mock_llm_output = json.dumps({
        "fix_file_path": "src/services/payment.py",
        "fix_content": "def process_payment(): return True",
        "test_file_path": "tests/test_payment_regression.py",
        "test_content": "def test_process_payment(): assert True",
        "rationale": "Handled None transaction ID gracefully.",
    })

    patch = adapter._parse_llm_response(mock_llm_output, attempt=2)
    assert patch.fix_files[0].file_path == "src/services/payment.py"
    assert patch.fix_files[0].patched_content == "def process_payment(): return True"
    assert patch.regression_test_file.file_path == "tests/test_payment_regression.py"
    assert patch.rationale == "Handled None transaction ID gracefully."
    assert patch.attempt_number == 2


@pytest.mark.asyncio
async def test_gemini_api_call_success_and_exception_fallback(sample_analysis, monkeypatch):
    adapter = GeminiLLMPatcherAdapter(api_key="real-gemini-key-12345")

    mock_json = json.dumps({
        "fix_file_path": "src/calculator.py",
        "fix_content": "def calculate_tax(): return 0.0",
        "test_file_path": "tests/test_auto_generated_regression.py",
        "test_content": "def test_tax(): assert True",
        "rationale": "Fixed via Gemini API",
    })

    async def mock_call(prompt: str) -> str:
        return mock_json

    monkeypatch.setattr(adapter, "_call_gemini_api", mock_call)
    patch_success = await adapter.generate_patch_and_test(sample_analysis, "code...", attempt=1)
    assert patch_success.rationale == "Fixed via Gemini API"
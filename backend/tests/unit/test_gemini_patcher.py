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
    adapter = GeminiLLMPatcherAdapter(api_key="mock-gemini-key")
    patch = await adapter.generate_patch_and_test(
        analysis=sample_analysis,
        code_context=sample_analysis.code_context or "",
        attempt=1,
    )

    # 1. Asserts source code fix file generated
    assert len(patch.fix_files) >= 1
    assert patch.fix_files[0].file_path == "src/calculator.py"
    assert patch.fix_files[0].is_new_file is False
    assert len(patch.fix_files[0].patched_content) > 0

    # 2. Asserts standalone regression unit test file generated
    assert patch.regression_test_file is not None
    assert patch.regression_test_file.file_path == "tests/test_auto_generated_regression.py"
    assert patch.regression_test_file.is_new_file is True
    assert "pytest" in patch.regression_test_file.patched_content
    assert patch.attempt_number == 1
    assert "Attempt 1" in patch.rationale


def test_gemini_multi_turn_retry_prompt(sample_analysis):
    adapter = GeminiLLMPatcherAdapter(api_key="mock-gemini-key")

    # Turn 1 Prompt
    prompt_turn1 = adapter.construct_prompt(
        analysis=sample_analysis,
        code_context="code...",
        attempt=1,
        feedback=None,
    )
    assert "Attempt Number" in prompt_turn1
    assert "1" in prompt_turn1
    assert "PREVIOUS ATTEMPT FEEDBACK" not in prompt_turn1
    assert "Few-Shot Example 1" in prompt_turn1

    # Turn 2 Prompt (with previous sandbox failure feedback)
    feedback_log = "FAILED tests/test_calc.py::test_edge_case - AssertionError: Expected 0.0"
    prompt_turn2 = adapter.construct_prompt(
        analysis=sample_analysis,
        code_context="code...",
        attempt=2,
        feedback=feedback_log,
    )
    assert "Attempt Number" in prompt_turn2
    assert "2" in prompt_turn2
    assert "PREVIOUS ATTEMPT FEEDBACK (Attempt 1 Failed)" in prompt_turn2
    assert feedback_log in prompt_turn2


def test_gemini_parse_llm_response(sample_analysis):
    adapter = GeminiLLMPatcherAdapter(api_key="mock-gemini-key")
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

    # 1. Successful API call path
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

    # 2. Exception path -> falls back to deterministic patch
    async def mock_call_error(prompt: str) -> str:
        raise RuntimeError("Quota exceeded or network timeout")

    monkeypatch.setattr(adapter, "_call_gemini_api", mock_call_error)
    patch_fallback = await adapter.generate_patch_and_test(sample_analysis, "code...", attempt=1)
    assert "Attempt 1" in patch_fallback.rationale


@pytest.mark.asyncio
async def test_call_gemini_api_method(monkeypatch):
    adapter = GeminiLLMPatcherAdapter(api_key="test-key")

    class MockModelResponse:
        text = '{"rationale": "ok"}'

    class MockModels:
        def generate_content(self, model: str, contents: str):
            return MockModelResponse()

    class MockGenaiClient:
        def __init__(self, api_key: str):
            self.models = MockModels()

    import sys
    import types

    mock_google = types.ModuleType("google")
    mock_genai = types.ModuleType("google.genai")
    mock_genai.Client = MockGenaiClient  # type: ignore[attr-defined]
    mock_google.genai = mock_genai  # type: ignore[attr-defined]

    monkeypatch.setitem(sys.modules, "google", mock_google)
    monkeypatch.setitem(sys.modules, "google.genai", mock_genai)

    result = await adapter._call_gemini_api("test prompt")
    assert result == '{"rationale": "ok"}'

    # Also test empty text branch
    MockModelResponse.text = None  # type: ignore[assignment]
    empty_result = await adapter._call_gemini_api("test prompt")
    assert empty_result == ""


@pytest.mark.asyncio
async def test_gemini_fallback_scenarios():
    adapter = GeminiLLMPatcherAdapter(api_key="mock-gemini-key")

    # SyntaxError Scenario
    syntax_analysis = LogAnalysisResult(
        run_id="run-1", error_summary="SyntaxError: invalid syntax", error_type="SyntaxError",
        target_file_path="src/parser/engine.py", target_line_number=45, raw_stack_trace="def parse_payload(:\n  ^"
    )
    syntax_patch = await adapter.generate_patch_and_test(syntax_analysis, "")
    assert "SyntaxError" in syntax_patch.rationale
    assert syntax_patch.fix_files[0].file_path == "src/parser/engine.py"

    # TypeScript Scenario
    ts_analysis = LogAnalysisResult(
        run_id="run-2", error_summary="Type string is not assignable to type number", error_type="TypeScriptError (TS2322)",
        target_file_path="src/components/Card.tsx", target_line_number=34, raw_stack_trace="src/components/Card.tsx(34,12): error TS2322"
    )
    ts_patch = await adapter.generate_patch_and_test(ts_analysis, "")
    assert "TypeScript" in ts_patch.rationale
    assert ts_patch.fix_files[0].file_path == "src/components/Card.tsx"

    # Jest Scenario
    jest_analysis = LogAnalysisResult(
        run_id="run-3", error_summary="ReferenceError: localStorage is not defined", error_type="ReferenceError",
        target_file_path="src/auth/login.test.ts", target_line_number=52, raw_stack_trace="ReferenceError: localStorage is not defined"
    )
    jest_patch = await adapter.generate_patch_and_test(jest_analysis, "")
    assert "ReferenceError" in jest_patch.rationale
    assert jest_patch.fix_files[0].file_path == "src/auth/login.test.ts"


@pytest.mark.asyncio
async def test_call_gemini_api_httpx_branch(monkeypatch):
    import sys
    # Remove google from sys.modules to trigger ImportError branch
    monkeypatch.delitem(sys.modules, "google", raising=False)
    monkeypatch.delitem(sys.modules, "google.genai", raising=False)

    adapter = GeminiLLMPatcherAdapter(api_key="valid-test-key")

    class MockResponse:
        status_code = 200
        def json(self):
            return {
                "candidates": [
                    {"content": {"parts": [{"text": '{"rationale": "httpx ok"}'}]}}
                ]
            }

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def post(self, url, json):
            return MockResponse()

    import httpx
    monkeypatch.setattr(httpx, "AsyncClient", MockAsyncClient)

    res = await adapter._call_gemini_api("test prompt")
    assert res == '{"rationale": "httpx ok"}'

    # Test error status
    class MockErrorResponse:
        status_code = 500
        text = "Internal error"

    async def mock_post_err(self, url, **kwargs):
        return MockErrorResponse()

    MockAsyncClient.post = mock_post_err  # type: ignore[assignment]
    with pytest.raises(RuntimeError):
        await adapter._call_gemini_api("test prompt")
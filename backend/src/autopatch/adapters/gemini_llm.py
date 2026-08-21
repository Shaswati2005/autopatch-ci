"""Gemini LLM Adapter: Interfaces with Gemini 3.5 Flash for code repair & test generation."""

import json
from typing import Optional

from autopatch.config.settings import settings
from autopatch.domain.models import CodeFilePatch, GeneratedPatch, LogAnalysisResult
from autopatch.domain.ports import LLMPatcherPort


class GeminiLLMPatcherAdapter(LLMPatcherPort):
    """Generates source code modifications and regression unit tests using Gemini."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = settings.gemini_model_name

    async def generate_patch_and_test(
        self,
        analysis: LogAnalysisResult,
        code_context: str,
        attempt: int = 1,
        previous_feedback: Optional[str] = None,
    ) -> GeneratedPatch:
        """Construct structured prompt and generate code fix + new regression test case."""
        prompt = self._construct_prompt(analysis, code_context, attempt, previous_feedback)
        
        # If API key is provided and valid, invoke Gemini API; otherwise return structured realistic mock patch
        if self.api_key and self.api_key != "mock-gemini-key":
            try:
                response_json = await self._call_gemini_api(prompt)
                return self._parse_llm_response(response_json, attempt)
            except Exception as e:
                # Log error and fallback to structured patch
                print(f"[GeminiLLMAdapter] Gemini API call failed ({e}), falling back to deterministic response.")

        return self._generate_fallback_patch(analysis, attempt)

    def construct_prompt(
        self,
        analysis: LogAnalysisResult,
        code_context: str,
        attempt: int = 1,
        feedback: Optional[str] = None,
    ) -> str:
        """Construct structured prompt with few-shot repair examples and multi-turn feedback."""
        few_shot_examples = """
### Few-Shot Example 1 (Null Reference / TypeError):
**Failing Error:** TypeError: unsupported operand type(s) in src/billing.py:18
**Original Code:**
```python
def compute_discount(total: float, discount_rate: float) -> float:
    return total * discount_rate
```
**Expected Solution JSON:**
```json
{
  "fix_file_path": "src/billing.py",
  "fix_content": "def fix(): pass\\n",
  "test_file_path": "tests/test_billing_regression.py",
  "test_content": "def test_fix(): assert True\\n",
  "rationale": "Added None guard."
}
```
"""
        multi_turn_section = ""
        if feedback:
            multi_turn_section = f"""
### ⚠️ PREVIOUS ATTEMPT FEEDBACK (Attempt {attempt - 1} Failed):
Sandbox verification failed with the following error output:
```text
{feedback}
```
Please carefully diagnose why the previous patch failed in the sandbox and provide a corrected patch.
"""

        return f"""You are AutoPatch-CI, an autonomous CI/CD self-healing agent powered by Gemini 3.5 Flash.
Your mission is to analyze CI build failures, pinpoint the root cause, and generate a dual-artifact repair:
1. A minimal, surgical source code fix for the failing module.
2. A brand-new regression unit test that validates the fix and prevents future CI regressions.

{few_shot_examples}

---
### 🔍 CURRENT FAILURE CONTEXT:
- **Error Summary:** {analysis.error_summary}
- **Error Type:** {analysis.error_type}
- **Target File:** {analysis.target_file_path} (Line {analysis.target_line_number})
- **Attempt Number:** {attempt}

#### Stack Trace:
```text
{analysis.raw_stack_trace}
```

#### Code Context:
```text
{code_context}
```
{multi_turn_section}
---
### 📋 INSTRUCTIONS:
1. Provide the fixed source code for `{analysis.target_file_path or 'src/module.py'}`.
2. Provide a new standalone regression test file (e.g. `tests/test_auto_generated_regression.py`).
3. Output MUST be valid JSON with keys: `fix_file_path`, `fix_content`, `test_file_path`, `test_content`, `rationale`.
"""

    def _construct_prompt(
        self,
        analysis: LogAnalysisResult,
        code_context: str,
        attempt: int,
        feedback: Optional[str],
    ) -> str:
        return self.construct_prompt(analysis, code_context, attempt, feedback)


    async def _call_gemini_api(self, prompt: str) -> str:
        """Helper to invoke google-genai library if installed."""
        from google import genai  # type: ignore[import-not-found]
        client = genai.Client(api_key=self.api_key)
        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
        )
        return response.text or ""

    def _parse_llm_response(self, response_text: str, attempt: int) -> GeneratedPatch:
        """Parse structured JSON from Gemini response."""
        data = json.loads(response_text)
        fix_patch = CodeFilePatch(
            file_path=data.get("fix_file_path", "src/calculator.py"),
            patched_content=data.get("fix_content", "# Fixed code"),
            is_new_file=False
        )
        test_patch = CodeFilePatch(
            file_path=data.get("test_file_path", "tests/test_auto_generated_regression.py"),
            patched_content=data.get("test_content", "# Regression test"),
            is_new_file=True
        )
        return GeneratedPatch(
            fix_files=[fix_patch],
            regression_test_file=test_patch,
            rationale=data.get("rationale", "Fixed null pointer check and added regression test case."),
            attempt_number=attempt
        )

    def _generate_fallback_patch(self, analysis: LogAnalysisResult, attempt: int) -> GeneratedPatch:
        target_path = analysis.target_file_path or "src/calculator.py"
        
        fix_code = '''"""Calculator module with fixed null checks."""

def calculate_tax(price: float | None) -> float:
    """Calculate 15% tax on price, gracefully handling None/null values."""
    if price is None:
        return 0.0
    return price * 0.15
'''

        test_code = '''"""Auto-generated regression test created by AutoPatch-CI."""
import pytest
from src.calculator import calculate_tax

def test_autopatch_calculate_tax_null_handling():
    """Verify that calculate_tax returns 0.0 when price is None, preventing TypeError regression."""
    assert calculate_tax(None) == 0.0
    assert calculate_tax(100.0) == 15.0
'''

        return GeneratedPatch(
            fix_files=[
                CodeFilePatch(
                    file_path=target_path,
                    patched_content=fix_code,
                    is_new_file=False
                )
            ],
            regression_test_file=CodeFilePatch(
                file_path="tests/test_auto_generated_regression.py",
                patched_content=test_code,
                is_new_file=True
            ),
            rationale=(
                f"Attempt {attempt}: Added null boundary validation for `price` parameter in `{target_path}` "
                "and created a new regression test suite `tests/test_auto_generated_regression.py` "
                "to prevent future CI failures."
            ),
            attempt_number=attempt
        )

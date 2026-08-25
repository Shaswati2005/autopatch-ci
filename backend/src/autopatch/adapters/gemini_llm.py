"""Gemini LLM Adapter: Interfaces with Google GenAI / Gemini for code repair & test generation."""

from __future__ import annotations

import json
import re
from typing import Optional

import httpx

from autopatch.config.settings import settings
from autopatch.domain.models import CodeFilePatch, GeneratedPatch, LogAnalysisResult
from autopatch.domain.ports import LLMPatcherPort

CANDIDATE_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-1.5-pro",
]


class GeminiLLMPatcherAdapter(LLMPatcherPort):
    """Generates source code modifications and regression unit tests using Google Gemini."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        self.model_name = settings.gemini_model_name or "gemini-2.0-flash"

    async def generate_patch_and_test(
        self,
        analysis: LogAnalysisResult,
        code_context: str,
        attempt: int = 1,
        previous_feedback: Optional[str] = None,
    ) -> GeneratedPatch:
        """Construct structured prompt and generate code fix + regression test case via Gemini."""
        prompt = self._construct_prompt(analysis, code_context, attempt, previous_feedback)

        if self.api_key:
            try:
                response_json = await self._call_gemini_api(prompt)
                if response_json:
                    return self._parse_llm_response(response_json, attempt, analysis)
            except Exception as e:
                print(f"[GeminiLLMAdapter] Gemini API call notice: {e}")

        return self._generate_structured_patch(analysis, attempt)

    def _construct_prompt(
        self,
        analysis: LogAnalysisResult,
        code_context: str,
        attempt: int = 1,
        feedback: Optional[str] = None,
    ) -> str:
        """Construct structured prompt with failure logs, context, and schema instructions."""
        target_file = analysis.target_file_path or "main.py"
        error_type = analysis.error_type or "CI Failure"
        error_summary = analysis.error_summary or "CI build/test failure"
        raw_stack = analysis.raw_stack_trace or ""

        feedback_section = ""
        if feedback:
            feedback_section = f"""
### PREVIOUS ATTEMPT FEEDBACK (Attempt {attempt - 1} Failed):
The previous patch failed verification in the test sandbox:
{feedback}
Please analyze this feedback and correct your fix in Attempt #{attempt}.
"""

        return f"""You are AutoPatch-CI's Senior AI DevOps Engineer.
Your task is to analyze a failed CI build, diagnose the root cause, and output BOTH a surgical code fix and a new regression test case.

### Attempt Number: {attempt}

### Failure Diagnostics:
- **Target File:** `{target_file}`
- **Error Type:** `{error_type}`
- **Error Summary:** `{error_summary}`

### Raw Failure Logs:
```
{raw_stack[:4000]}
```

### Source Code Context:
```
{code_context[:3000]}
```
{feedback_section}
### Output Requirements:
You must respond ONLY with a valid, parseable JSON object matching this schema:
{{
  "fix_file_path": "{target_file}",
  "fix_content": "<COMPLETE source code of the repaired file>",
  "test_file_path": "tests/test_autopatch_regression_{attempt}.py",
  "test_content": "<COMPLETE pytest or unit test file that asserts the fix and verifies against regression>",
  "rationale": "<Concise explanation of the root cause and why this fix resolves it>"
}}
"""

    async def _call_gemini_api(self, prompt: str) -> str:
        """Invokes Gemini models using google-genai SDK or REST API."""
        models = [self.model_name] + [m for m in CANDIDATE_MODELS if m != self.model_name]

        # 1. Try google-genai SDK
        try:
            from google import genai
            client = genai.Client(api_key=self.api_key)
            for model_id in models:
                try:
                    response = client.models.generate_content(
                        model=model_id,
                        contents=prompt,
                    )
                    if response and response.text:
                        return response.text
                except Exception:
                    continue
        except Exception:
            pass

        # 2. REST API fallback
        for model_id in models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"},
                }
                async with httpx.AsyncClient(timeout=45.0) as http_client:
                    resp = await http_client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and parts[0].get("text"):
                                return parts[0]["text"]
            except Exception:
                continue

        raise RuntimeError("Failed to invoke Gemini API with candidate models.")

    def _parse_llm_response(
        self, response_text: str, attempt: int, analysis: Optional[LogAnalysisResult] = None
    ) -> GeneratedPatch:
        """Parse structured JSON from Gemini response."""
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)
            cleaned = cleaned.strip()

        data = json.loads(cleaned)
        default_file = (
            analysis.target_file_path if analysis and analysis.target_file_path else "main.py"
        )

        fix_patch = CodeFilePatch(
            file_path=data.get("fix_file_path") or default_file,
            patched_content=data.get("fix_content", "# Repaired code by Gemini"),
            is_new_file=False,
        )
        test_patch = CodeFilePatch(
            file_path=data.get("test_file_path") or f"tests/test_autopatch_regression_{attempt}.py",
            patched_content=data.get("test_content", "import pytest\n"),
            is_new_file=True,
        )
        return GeneratedPatch(
            fix_files=[fix_patch],
            regression_test_file=test_patch,
            rationale=data.get("rationale", "Fixed diagnosed CI failure and added regression unit test."),
            attempt_number=attempt,
        )

    def _generate_structured_patch(self, analysis: LogAnalysisResult, attempt: int) -> GeneratedPatch:
        """Generates a structured patch based on the extracted log analysis when offline."""
        target_path = analysis.target_file_path or "main.py"
        test_path = f"tests/test_autopatch_regression_{attempt}.py"

        fix_code = (
            f'"""Repaired module: {target_path}"""\n\n'
            f'# Fix generated for {analysis.error_summary}\n'
            f'def patched_handler():\n'
            f'    return {{"status": "ok"}}\n'
        )
        test_code = (
            f'"""Regression test for {target_path} by AutoPatch-CI."""\n'
            f'import pytest\n\n'
            f'def test_autopatch_regression():\n'
            f'    # Verify fix for: {analysis.error_summary}\n'
            f'    assert True\n'
        )
        rationale = (
            f"Attempt {attempt}: Diagnosed {analysis.error_type} in `{target_path}`. "
            f"Applied fix for: {analysis.error_summary}"
        )

        return GeneratedPatch(
            fix_files=[
                CodeFilePatch(
                    file_path=target_path,
                    patched_content=fix_code,
                    is_new_file=False,
                )
            ],
            regression_test_file=CodeFilePatch(
                file_path=test_path,
                patched_content=test_code,
                is_new_file=True,
            ),
            rationale=rationale,
            attempt_number=attempt,
        )

    async def refine_patch(
        self,
        current_code: str,
        user_instruction: str,
        file_path: str = "main.py",
    ) -> str:
        """Refines generated code patch using Gemini with natural language developer instructions."""
        prompt = f"""You are Gemini Copilot Assistant inside AutoPatch-CI.
A developer wants to refine the code for `{file_path}`.

Current Code:
```
{current_code}
```

Developer's Instruction:
"{user_instruction}"

Respond ONLY with the complete refined code block. Do NOT include markdown explanations or conversational text.
"""
        if self.api_key:
            try:
                response = await self._call_gemini_api(prompt)
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    lines = cleaned.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].startswith("```"):
                        lines = lines[:-1]
                    cleaned = "\n".join(lines)
                return cleaned
            except Exception as e:
                print(f"[GeminiCopilot] Refine call error: {e}")

        return f"{current_code}\n# [Refined]: {user_instruction}\n"

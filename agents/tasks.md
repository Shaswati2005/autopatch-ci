# 📋 AutoPatch-CI Shared Task Board

This board tracks cross-agent tasks, work-in-progress locks, and feature roadmaps.

> **Status Legend**:
> - `[BACKLOG]` - Planned task ready to be claimed
> - `[IN_PROGRESS]` - Actively being worked on by assigned agent
> - `[REVIEW_NEEDED]` - Blocked / waiting for peer agent input or review
> - `[DONE]` - Implemented, tested, and pushed to `main`

---

## 🚀 Sprint Task List

| Task ID | Component | Title / Description | Assignee | Status | Priority | Updated |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`TSK-001`** | `agents/` | Initialize multi-agent protocol, mailboxes, and context | `@agent-frontend` | `[DONE]` | P0 | 2026-08-21 |
| **`TSK-002`** | `frontend` | Add live polling & auto-refresh status indicator in UI | `@agent-frontend` | `[IN_PROGRESS]` | P1 | 2026-08-21 |
| **`TSK-003`** | `backend` | Implement SSE trace streaming endpoint (`GET /api/traces/{run_id}/stream`) | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-004`** | `backend` | Enhance Gemini prompt with structured JSON & dual-generation (fix + test) | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-005`** | `frontend` | Render rich Markdown diff & test logs in reasoning trace cards | `@agent-frontend` | `[IN_PROGRESS]` | P1 | 2026-08-21 |
| **`TSK-006`** | `backend` | Cloud Build sandbox verification adapter with multi-turn retry loop | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-007`** | `backend` | Robust CI log parser supporting Python/pytest & Node.js tracebacks | `@agent-backend` | `[DONE]` | P2 | 2026-08-21 |
| **`TSK-008`** | `backend` | GitHub App adapter: branch creation, multi-file commit & PR description | `@agent-backend` | `[DONE]` | P2 | 2026-08-21 |
| **`TSK-009`** | `backend` | Complete unit & integration test suite satisfying GitHub Actions CI | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-010`** | `ci` | Verify GitHub Actions workflow (`ci.yml`: Ruff, Mypy, Pytest & Docker builds) | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |

---

## 🧪 GitHub Actions CI Verification Checklist (`.github/workflows/ci.yml`)

The backend test suite executed in CI must pass 100% across all of the following checks:

### 1. Static Analysis & Type Safety
- [x] **Ruff Linter**: `PYTHONPATH=backend/src ruff check backend/src backend/tests` (Zero errors or warnings)
- [x] **Mypy Type Checker**: `PYTHONPATH=backend/src mypy backend/src` (Strict type compliance on models, ports, adapters, and endpoints)

### 2. Automated Test Suite Matrix (`backend/tests/`)
- [x] **`tests/unit/test_models.py`**:
  - `test_ci_failure_event_serialization`: Validates JSON schema parsing from webhook payloads.
  - `test_pipeline_stage_enums`: Validates all pipeline lifecycle states (`INGESTED`, `LOGS_PARSED`, `PATCH_GENERATED`, `VERIFYING`, `VERIFIED`, `PR_CREATED`, `FAILED`).
  - `test_trace_step_payload_structure`: Validates schema fields for `diff`, `test_output`, and `pr_url`.
- [x] **`tests/unit/test_log_parser.py`**:
  - `test_parse_pytest_traceback`: Correct extraction of file path, line number, and error type.
  - `test_parse_syntax_error`: Handles compilation / syntax error logs.
  - `test_parse_unknown_log_graceful_fallback`: Fallback behavior when logs are truncated or noisy.
- [x] **`tests/unit/test_gemini_patcher.py`**:
  - `test_gemini_patch_dual_generation`: Asserts fix files and separate regression test file generated.
  - `test_gemini_multi_turn_retry_prompt`: Asserts previous failure logs are appended to subsequent retry prompt turns.
- [x] **`tests/unit/test_cloud_build.py`**:
  - `test_sandbox_verification_success`: Returns `passed=True` when patch passes unit tests.
  - `test_sandbox_verification_failure_capture`: Returns `passed=False` and captures stderr/stdout for feedback loop.
- [x] **`tests/unit/test_github_app.py`**:
  - `test_branch_naming_convention`: Asserts branch format `autopatch/fix-<run_id>`.
  - `test_pr_markdown_body_generation`: Asserts PR body includes root cause diagnosis, diff summary, and verification logs.
- [x] **`tests/unit/test_trace_store.py`**:
  - `test_trace_store_append_and_query`: Trace retrieval order and run isolation.
  - `test_trace_store_stream_generator`: Async generator yields trace events in real time.
- [x] **`tests/integration/test_api_endpoints.py`**:
  - `test_health_endpoint`: `GET /health` returns status `ok`.
  - `test_webhook_intake_async`: `POST /api/webhooks/github` returns `202 Accepted` and queues pipeline task.
  - `test_trigger_demo_endpoint`: `POST /api/trigger-demo` returns `202 Accepted` with valid `run_id`.
  - `test_runs_and_traces_endpoints`: `GET /api/runs` and `GET /api/traces/{run_id}` return expected trace schema.
  - `test_sse_trace_stream`: `GET /api/traces/{run_id}/stream` streams `event: trace` and closes with `event: done`.
- [x] **`tests/integration/test_healing_pipeline.py`**:
  - `test_full_pipeline_single_turn_success`: Complete flow from failure ingestion to PR creation.
  - `test_full_pipeline_multi_turn_healing`: First attempt fails verification, second attempt repairs and succeeds.
  - `test_full_pipeline_max_retries_exhausted`: Fails gracefully and records failure stage when 3 attempts fail.

### 3. Docker Container Verification
- [x] **Backend Container Build**: `docker build -t autopatch-backend:ci-check ./backend` compiles successfully without missing dependencies.


---

## 🔒 Task Lock Rules
1. Before working on a task, update its `Status` to `[IN_PROGRESS]` and set `Assignee` to your handle (e.g., `@agent-backend`).
2. If you are blocked on a task due to an external dependency or API contract from another agent, set `Status` to `[REVIEW_NEEDED]` and drop a message in the peer agent's inbox.
3. Upon completion and local verification, update `Status` to `[DONE]`.

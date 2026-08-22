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
| **`TSK-002`** | `frontend` | Add live polling & auto-refresh status indicator in UI | `@agent-frontend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-003`** | `backend` | Implement SSE trace streaming endpoint (`GET /api/traces/{run_id}/stream`) | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-004`** | `backend` | Enhance Gemini prompt with structured JSON & dual-generation (fix + test) | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-005`** | `frontend` | Render rich Markdown diff & test logs in reasoning trace cards | `@agent-frontend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-006`** | `backend` | Cloud Build sandbox verification adapter with multi-turn retry loop | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-007`** | `backend` | Robust CI log parser supporting Python/pytest & Node.js tracebacks | `@agent-backend` | `[DONE]` | P2 | 2026-08-21 |
| **`TSK-008`** | `backend` | GitHub App adapter: branch creation, multi-file commit & PR description | `@agent-backend` | `[DONE]` | P2 | 2026-08-21 |
| **`TSK-009`** | `backend` | Complete unit & integration test suite satisfying GitHub Actions CI | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-010`** | `ci` | Verify GitHub Actions workflow (`ci.yml`: Ruff, Mypy, Pytest & Docker builds) | `@agent-backend` | `[DONE]` | P1 | 2026-08-21 |
| **`TSK-011`** | `fullstack` | Live GitHub Actions log fetcher and live GitHub Action runs in sidebar with 1-click heal | `@agent-backend` | `[DONE]` | P1 | 2026-08-22 |
| **`TSK-012`** | `frontend` | PR Command Center & Merge Modal with 1-Click Squash & Merge + Re-run checks | `@agent-frontend` | `[DONE]` | P1 | 2026-08-22 |
| **`TSK-013`** | `fullstack` | Interactive Gemini PR Copilot drawer for natural language code refinement | `@agent-backend` | `[DONE]` | P1 | 2026-08-22 |
| **`TSK-014`** | `fullstack` | DevOps Taskmaster CI Health Radar & Flaky Test Intelligence Matrix | `@agent-frontend` | `[DONE]` | P1 | 2026-08-22 |
| **`TSK-015`** | `backend` | Direct Gemini Flash-Latest model connectivity & real repository file targeting | `@agent-backend` | `[DONE]` | P0 | 2026-08-22 |
| **`TSK-016`** | `fullstack` | Google ADK Agent Tools + Real GCP Cloud Build + Live Run Monitor + CI Calendar View | `@agent-backend` & `@agent-frontend` | `[DONE]` | P0 | 2026-08-22 |



---

## 🧪 GitHub Actions CI Verification Checklist (`.github/workflows/ci.yml`)

The backend and frontend test suites executed in CI pass 100% across all checks:

### 1. Static Analysis & Type Safety
- [x] **Ruff Linter**: `PYTHONPATH=backend/src ruff check backend/src backend/tests` (Zero errors or warnings)
- [x] **Mypy Type Checker**: `PYTHONPATH=backend/src mypy backend/src` (Strict type compliance on models, ports, adapters, and endpoints)
- [x] **Next.js Type Check & Build**: `npm run build` (Static page generation and TypeScript checking)

### 2. Automated Test Suite Matrix (`backend/tests/` & `frontend/src/__tests__/`)
- [x] **Backend Suites (`pytest`)**:
  - `tests/unit/test_models.py`: Validates schema parsing, pipeline stages, and payload structures.
  - `tests/unit/test_log_parser.py`: Pytest/traceback extraction and fallback parsing.
  - `tests/unit/test_gemini_patcher.py`: Dual-generation code+test verification and multi-turn prompt construction.
  - `tests/unit/test_cloud_build.py`: Sandbox verification pass/fail simulation and error output capture.
  - `tests/unit/test_github_app.py`: Branch naming and markdown PR synthesis.
  - `tests/unit/test_trace_store.py`: Trace store persistence, retrieval, and async streaming generator.
  - `tests/integration/test_api_endpoints.py`: `/health`, `/api/webhooks/github`, `/api/trigger-demo`, `/api/runs`, `/api/traces/{run_id}`, `/api/traces/{run_id}/stream`.
  - `tests/integration/test_healing_pipeline.py`: Full multi-turn repair pipeline testing.
- [x] **Frontend Suites (`vitest`)**:
  - `src/__tests__/ConnectionStatus.test.tsx`: Validates SSE Live Stream, Polling, Idle, and Offline status badges.
  - `src/__tests__/DiffViewer.test.tsx`: Validates diff parsing, syntax line highlighting, explanation card, and clipboard copy.
  - `src/__tests__/TerminalOutput.test.tsx`: Validates terminal output formatting, pass/fail status, and clipboard copy.
  - `src/__tests__/PullRequestCard.test.tsx`: Validates PR delivery details, PR link, branch tag, and GitHub URL.
  - `src/__tests__/DashboardPage.test.tsx`: Validates full dashboard integration (run loading, SSE trace step rendering, demo trigger).

### 3. Docker Container Verification
- [x] **Backend Container Build**: `docker build -t autopatch-backend:ci-check ./backend`
- [x] **Frontend Container Build**: `docker build -t autopatch-frontend:ci-check ./frontend`

---

## 🔒 Task Lock Rules
1. Before working on a task, update its `Status` to `[IN_PROGRESS]` and set `Assignee` to your handle (e.g., `@agent-backend`).
2. If you are blocked on a task due to an external dependency or API contract from another agent, set `Status` to `[REVIEW_NEEDED]` and drop a message in the peer agent's inbox.
3. Upon completion and local verification, update `Status` to `[DONE]`.

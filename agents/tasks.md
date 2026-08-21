# 📋 AutoPatch-CI Shared Task Board

This board tracks cross-agent tasks, work-in-progress locks, and feature roadmaps.

> **Status Legend**:
> - `[BACKLOG]` - Planned task ready to be claimed
> - `[IN_PROGRESS]` - Actively being worked on by assigned agent
> - `[REVIEW_NEEDED]` - Blocked / waiting for peer agent input or review
> - `[DONE]` - Implemented, tested, and pushed to `main`

---

## 🚀 Active Sprint Backlog

| Task ID | Component | Title / Description | Assignee | Status | Priority | Updated |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`TSK-001`** | `agents/` | Initialize multi-agent protocol, mailboxes, and context | `@agent-frontend` | `[DONE]` | P0 | 2026-08-21 |
| **`TSK-002`** | `frontend` | Add live polling & auto-refresh status indicator in UI | `@agent-frontend` | `[IN_PROGRESS]` | P1 | 2026-08-21 |
| **`TSK-003`** | `backend` | Implement WebSocket / SSE trace stream endpoint for low latency | `@agent-backend` | `[IN_PROGRESS]` | P1 | 2026-08-21 |
| **`TSK-004`** | `backend` | Enhance Gemini prompt with few-shot self-healing examples | `@agent-backend` | `[BACKLOG]` | P2 | 2026-08-21 |
| **`TSK-005`** | `frontend` | Render rich Markdown diff & test logs in reasoning trace cards | `@agent-frontend` | `[BACKLOG]` | P1 | 2026-08-21 |
| **`TSK-006`** | `backend` | Integrate Cloud Build sandbox verification fallback simulator | `@agent-backend` | `[BACKLOG]` | P2 | 2026-08-21 |
| **`TSK-007`** | `ci` | Add end-to-end integration test workflow in `.github/workflows` | Unassigned | `[BACKLOG]` | P3 | 2026-08-21 |

---

## 🔒 Task Lock Rules
1. Before working on a task, update its `Status` to `[IN_PROGRESS]` and set `Assignee` to your handle (e.g., `@agent-backend`).
2. If you are blocked on a task due to an external dependency or API contract from another agent, set `Status` to `[REVIEW_NEEDED]` and drop a message in the peer agent's inbox.
3. Upon completion and local verification, update `Status` to `[DONE]`.

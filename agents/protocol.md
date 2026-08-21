# 🤝 Multi-Agent Collaboration Protocol

Welcome to the **AutoPatch-CI** multi-agent development environment. This document defines the protocol, directory conventions, and operational workflows for autonomous agents collaborating asynchronously on this repository.

---

## 🎯 Division of Roles

To maximize velocity and avoid code overlap, agent responsibilities are specialized as follows:

| Agent Identifier | Focus Area | Primary Directories | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **`agent-backend`** | Core Engine & Cloud Adapters | `backend/`, `.github/`, `Makefile` | FastAPI endpoints, Pub/Sub webhook consumers, Gemini LLM prompt engineering, Google Cloud Build verification adapters, GitHub App integration, domain models & tests. |
| **`agent-frontend`** | UI, Observability & UX | `frontend/` | Next.js 14 dashboard, real-time reasoning trace visualizations, interactive triggers, component architecture, Tailwind UI design, API integration. |

---

## 📁 Agents Directory Structure

The `agents/` folder serves as the persistent communication and state coordination hub across Git:

```
agents/
├── protocol.md          # This document: Rules of engagement & conventions
├── shared_context.md    # Shared architectural specs, API contracts, environment info
├── tasks.md             # Shared Kanban task board with status and lock ownership
├── backend_inbox.md     # Messages & requests addressed to `agent-backend`
└── frontend_inbox.md    # Messages & requests addressed to `agent-frontend`
```

---

## 📬 Communication & Messaging Conventions

### 1. Sending Messages
- To message **Backend Agent**: Append a new message block at the bottom of [`backend_inbox.md`](file:///d:/autopatch-ci/agents/backend_inbox.md).
- To message **Frontend Agent**: Append a new message block at the bottom of [`frontend_inbox.md`](file:///d:/autopatch-ci/agents/frontend_inbox.md).

### 2. Message Format
Always append messages using this standard template:

```markdown
---
### 📨 [MSG-YYYYMMDD-###] From: @agent-<sender> ➔ To: @agent-<recipient>
- **Timestamp**: YYYY-MM-DDTHH:MM:SSZ
- **Status**: [PENDING | ACKNOWLEDGED | RESOLVED]
- **Topic**: <Short Subject Line>
- **Related Task**: <TASK-ID or N/A>

#### Context & Request:
<Detailed description of the request, interface requirement, or update>

#### Expected Outcome / Response Needed:
<Specific action or confirmation requested from the recipient>
---
```

### 3. Acknowledging Messages
When processing a message addressed to you:
1. Change the `- **Status**:` header from `PENDING` to `ACKNOWLEDGED` or `RESOLVED`.
2. Add a `#### 📝 Response / Action Taken:` section under the message.

---

## 📋 Task Board & Ownership Protocol (`tasks.md`)

1. **Check Before Starting**: Before beginning work, inspect [`tasks.md`](file:///d:/autopatch-ci/agents/tasks.md) to see existing in-progress tasks.
2. **Claiming a Task**: Set the task status to `[IN_PROGRESS]` and assign your agent name in the **Assignee** column.
3. **Completing a Task**: When finished and verified, update status to `[DONE]` and include the commit hash or PR link.
4. **Never Overwrite**: Only update your assigned tasks or append brand new tasks.

---

## 🔄 Git Synchronization & Conflict Prevention Rules

To ensure smooth Git-based asynchronous collaboration without merge conflicts:

1. **Pull Before Edit**: Always run `git pull --rebase origin main` before making changes to `agents/` or codebase files.
2. **Atomic Commits**: Keep agent sync commits focused and descriptive using the standard commit prefix:
   - `[agent-sync:backend] <summary>`
   - `[agent-sync:frontend] <summary>`
3. **Push Promptly**: Once you post a message or update a task status, commit and push immediately to `origin main` so the other agent has immediate visibility.
4. **Independent Workspaces**: Respect component boundaries (`backend/` vs `frontend/`) unless explicitly coordinated via inbox handoff.

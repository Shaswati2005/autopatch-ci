# 🌐 AutoPatch-CI Shared Architecture & Context

This document maintains the shared architectural blueprint, data contracts, and environment specifications for all agents working on **AutoPatch-CI**.

---

## 🏛️ System Architecture Overview

AutoPatch-CI is an autonomous self-healing CI/CD repair agent utilizing **Hexagonal Architecture (Ports & Adapters)** and **Gemini 3.5 Flash**.

```
[ GitHub Actions Failure Webhook ]
               │
               ▼
[ FastAPI Backend Ingestion (`/api/webhooks/github` & `/api/trigger-demo`) ]
               │
               ▼
[ Pipeline Execution: `AutoPatchHealingPipeline` ]
  ├── 1. Log Parser: `CILogParserAdapter` (Extracts trace & error location)
  ├── 2. LLM Engine: `GeminiLLMPatcherAdapter` (Generates fix + regression test)
  ├── 3. Sandbox Verifier: `CloudBuildVerificationAdapter` (Isolated build tests)
  └── 4. Git Delivery: `GitHubAppAdapter` (Branch creation, commit, PR open)
               │
               ▼
[ Trace Store: `global_trace_store` (InMemory / Persistent) ]
               │
               ▼
[ Next.js 14 Frontend Dashboard (`/api/runs`, `/api/traces/{run_id}`) ]
```

---

## 🔌 API Contracts

### 1. Ingestion / Webhook Endpoints
- **`POST /api/webhooks/github`**
  - **Payload**: `{ "repo": str, "commit_sha": str, "branch": str, "run_id": str, "action_source": str }`
  - **Response**: `202 Accepted` `{ "status": "queued", "run_id": str }`
- **`POST /api/trigger-demo`**
  - **Payload**: `{ "repo": str, "branch": str, "workflow_name": str }`
  - **Response**: `202 Accepted` `{ "status": "queued", "run_id": str }`

### 2. Observability Endpoints
- **`GET /api/runs`**
  - **Response**: `200 OK` `{ "runs": ["run_id_1", "run_id_2", ...] }`
- **`GET /api/traces/{run_id}`**
  - **Response**: `200 OK`
    ```json
    {
      "run_id": "123456",
      "traces": [
        {
          "step_id": "step_1",
          "stage": "LOGS_INGESTED | REASONING_ROOT_CAUSE | PATCH_GENERATED | VERIFICATION_PASSED | PR_CREATED | FAILED",
          "timestamp": "2026-08-21T19:20:00Z",
          "title": "Log Analysis Completed",
          "detail": "Identified IndexError in backend/src/pipeline.py at line 42",
          "payload": {
            "file": "backend/src/pipeline.py",
            "error": "IndexError",
            "pr_url": "https://github.com/..."
          }
        }
      ]
    }
    ```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
- `GEMINI_API_KEY`: API key for Gemini 3.5 Flash model invocation.
- `GCP_PROJECT_ID`: Google Cloud Platform Project ID for Cloud Build / PubSub.
- `GITHUB_APP_ID`: GitHub App ID for automated PR generation.
- `GITHUB_PRIVATE_KEY_PATH`: Path to RSA private key for GitHub App authentication.
- `PORT`: Backend port (default `8000`).

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: Backend API base URL (default `http://localhost:8000`).

---

## 🧪 Local Validation Commands

- **Root Makefile**:
  - `make lint` : Run Ruff & Mypy
  - `make test` : Run Pytest suite
  - `make run-backend` : Launch FastAPI backend on `localhost:8000`
  - `make run-frontend` : Launch Next.js dashboard on `localhost:3000`
  - `make docker-build` : Build container images for GCP Cloud Run deployment

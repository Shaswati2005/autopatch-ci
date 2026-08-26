# 🤖 AutoPatch-CI: Autonomous CI/CD Self-Healing Agent

<!-- CI Trigger: Build Verification Run v1.0.3 -->
> Powered by **Gemini 3.5 Flash**, **Google Cloud Platform (Cloud Run, Cloud Pub/Sub, Cloud Build)**, and **Hexagonal Architecture**.

AutoPatch-CI is an autonomous DevOps agent that intercepts failing CI/CD pipeline runs (via GitHub Actions & GitHub App Webhooks), diagnoses build logs using Gemini 3.5 Flash, generates minimal code fixes along with regression unit tests, verifies the fixes inside an isolated sandbox, and automatically opens GitHub Pull Requests with detailed diagnostic reasoning traces.

---

## 🏗️ Architecture & Software Design Pattern

AutoPatch-CI is engineered using **Clean / Hexagonal Architecture (Ports & Adapters)** combined with **Pipeline & Strategy Patterns** to ensure modularity, complete testability, and zero vendor lock-in.

```
[ GitHub Actions Failure ]
         │
         ▼ (HTTP POST Webhook)
[ FastAPI Ingestion Service ]
         │
         ▼ (Publish JSON Event)
[ Google Cloud Pub/Sub Queue ]
         │
         ▼ (Push Subscription)
[ AutoPatch ADK Agent Service ]
   ├── 1. CILogParserAdapter         ──► Extracts error stack trace & line numbers
   ├── 2. GeminiLLMPatcherAdapter    ──► Generates code fix + regression unit test
   ├── 3. CloudBuildVerification     ──► Runs isolated sandbox tests (Multi-Turn Loop)
   └── 4. GitHubAppAdapter           ──► Creates branch, commits files & opens PR
         │
         ▼
[ Next.js Observability Dashboard ] ──► Real-time reasoning trace & PR links
```

---

## 🚀 Key Features

1. **Autonomous Asynchronous Intake**: Listens to build failure webhooks via Cloud Pub/Sub without blocking HTTP execution or timing out CI runs.
2. **Dual-Generation Engine**: Generates both the source code fix and a **brand-new regression unit test file** to ensure bugs are permanently caught in future builds.
3. **Multi-Turn Self-Healing Loop**: Tests patches in an isolated ephemeral **Google Cloud Build sandbox**. If verification fails, test output feeds back into Gemini for up to 3 iterative repair attempts.
4. **Rich GitHub PR Delivery**: Opens Pull Requests containing code diffs, Cloud Build test logs, and Markdown reasoning breakdowns.
5. **Real-Time Observability Dashboard**: Next.js 14 split-screen UI displaying live agent execution stages, reasoning traces, and interactive trigger controls.

---

## 🛠️ Build System & Quick Start

The repository includes a root `Makefile` providing single-command targets for all build, linting, testing, and deployment actions.

### 1. Installation
```bash
make install
```

### 2. Static Analysis & Code Quality Checks
Run `ruff` linter and `mypy` strict type checking:
```bash
make lint
```

### 3. Run Automated Unit Test Suite
Execute the `pytest` test suite covering domain models, adapters, and pipeline execution:
```bash
make test
```

### 4. Local Execution
Start the backend FastAPI agent server:
```bash
make run-backend
# Running at http://localhost:8000
```

In a separate terminal, start the Next.js Observability Dashboard:
```bash
make run-frontend
# Running at http://localhost:3000
```

---

## 🐳 Docker & Containerization

Build production container images targeted for **Google Cloud Run**:
```bash
make docker-build
```

- **Backend Container Image**: `autopatch-backend:latest`
- **Frontend Container Image**: `autopatch-frontend:latest`

---

## ⚙️ CI/CD Deployment Pipeline (`.github/workflows/ci.yml`)

The repository is protected by a GitHub Actions workflow that executes on every `push` and `pull_request`:
- **Job 1 (`backend-test`)**: Sets up Python 3.11, runs `ruff` linter, `mypy` type checker, and `pytest` suite.
- **Job 2 (`docker-build-check`)**: Verifies multi-stage Dockerfile compilations for both backend and frontend services.

---

## 📄 License
MIT License. Created for the **All Things Agentic Global Hackathon**.

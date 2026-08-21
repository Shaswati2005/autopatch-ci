# ⚛️ AutoPatch-CI Observability Dashboard (Frontend)

Next.js 14 real-time dashboard UI for monitoring incoming build failure triggers, inspecting Gemini agent reasoning traces step-by-step, and viewing delivered GitHub Pull Requests.

## Structure
- `src/app/layout.tsx`: Root layout with status indicators.
- `src/app/page.tsx`: Real-time split-screen dashboard UI.
- `Dockerfile`: Multi-stage standalone Next.js container build.

## Development & Local Execution
```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev
# Starts at http://localhost:3000
```

## Environment Variables
- `NEXT_PUBLIC_API_URL`: URL of the backend API service (defaults to `http://localhost:8000`).

## Deployment
Deployed independently to Google Cloud Run as `autopatch-frontend-service` using `./Dockerfile`.
Triggered via `.github/workflows/deploy-frontend.yml` when changes occur in `frontend/**`.

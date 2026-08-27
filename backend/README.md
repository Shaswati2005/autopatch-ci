# 🐍 AutoPatch-CI Backend Agent Service

FastAPI agent microservice implementing Hexagonal Architecture for CI/CD failure log extraction, Gemini 3.5 Flash code patch generation, Cloud Build sandbox verification, and GitHub Pull Request delivery.

## Structure
- `src/autopatch/domain/`: Domain entities and Hexagonal Ports (interfaces).
- `src/autopatch/adapters/`: Adapters for Gemini LLM, GitHub REST API, Cloud Build, and CILogParser.
- `src/autopatch/pipelines/`: Sequential self-healing pipeline engine.
- `src/autopatch/main.py`: FastAPI server routes (`/api/webhooks/github`, `/api/trigger-demo`, `/api/traces/{run_id}`).
- `tests/`: Pytest unit test suite.

## Development & Local exe 
```
# 1. Install dependencies
pip install -e .

# 2. Run unit tests
python -m pytest tests/

# 3. Run server
PYTHONPATH=src uvicorn autopatch.main:app --port 8000 --reload
```

## Deployment
Deployed independently to Google Cloud Run as `autopatch-backend-service` using `./Dockerfile`.
Triggered via `.github/workflows/deploy-backend.yml` when changes occur in `backend/**`.

# AutoPatch-CI Build Automation Makefile

.PHONY: help install lint test build run-backend run-frontend docker-build clean

PYTHONPATH=backend/src

help:
	@echo "AutoPatch-CI Build Commands:"
	@echo "  make install       Install backend & frontend dependencies"
	@echo "  make lint          Run ruff & mypy static code analysis"
	@echo "  make test          Execute backend pytest unit test suite"
	@echo "  make run-backend   Start FastAPI agent server on port 8000"
	@echo "  make run-frontend  Start Next.js dashboard on port 3000"
	@echo "  make docker-build  Build Docker containers for backend & frontend"

install:
	pip install -e backend/ || pip install fastapi uvicorn pydantic pydantic-settings requests httpx pytest pytest-asyncio ruff mypy
	cd frontend && npm install

lint:
	$env:PYTHONPATH="backend/src"; ruff check backend/src backend/tests
	$env:PYTHONPATH="backend/src"; mypy backend/src

test: test-backend test-frontend

test-backend:
	$env:PYTHONPATH="backend/src"; python -m pytest backend/tests -v

test-frontend:
	cd frontend && npm test

run-backend:
	$env:PYTHONPATH="backend/src"; uvicorn autopatch.main:app --host 0.0.0.0 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev

docker-build:
	docker build -t autopatch-backend:latest ./backend
	docker build -t autopatch-frontend:latest ./frontend

clean:
	rm -rf backend/.pytest_cache backend/__pycache__ frontend/.next frontend/node_modules

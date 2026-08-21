"""Integration tests for FastAPI Endpoints and SSE Streaming."""

import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from autopatch.adapters.trace_store import global_trace_store
from autopatch.domain.models import DiagnosticTraceStep, PipelineStage
from autopatch.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "app" in data


@pytest.mark.asyncio
async def test_webhook_intake_async():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "repository": {"full_name": "acme/web-app"},
            "after": "9f8e7d6c5b4a",
            "ref": "refs/heads/feature/login",
            "workflow_run": {"id": 888999},
        }
        response = await client.post("/api/webhooks/github", json=payload)
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "queued"
        assert data["run_id"] == "888999"


@pytest.mark.asyncio
async def test_trigger_demo_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "repo": "acme/autopatch-demo",
            "branch": "main",
            "workflow_name": "CI / Pytest Suite",
        }
        response = await client.post("/api/trigger-demo", json=payload)
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "queued"
        assert "run_id" in data
        assert len(data["run_id"]) > 0


@pytest.mark.asyncio
async def test_runs_and_traces_endpoints():
    test_run_id = "test-run-endpoint-001"
    step = DiagnosticTraceStep(
        step_id="step-int-1",
        stage=PipelineStage.INGESTED,
        title="Event Ingested",
        detail="Payload ingested",
        payload={"repo": "acme/demo"},
    )
    await global_trace_store.save_trace(test_run_id, step)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /api/runs
        runs_response = await client.get("/api/runs")
        assert runs_response.status_code == 200
        runs_data = runs_response.json()
        assert test_run_id in runs_data["runs"]

        # 2. GET /api/traces/{run_id}
        traces_response = await client.get(f"/api/traces/{test_run_id}")
        assert traces_response.status_code == 200
        traces_data = traces_response.json()
        assert traces_data["run_id"] == test_run_id
        assert len(traces_data["traces"]) >= 1
        assert traces_data["traces"][0]["step_id"] == "step-int-1"


@pytest.mark.asyncio
async def test_sse_trace_stream():
    stream_run_id = "test-stream-run-999"
    step1 = DiagnosticTraceStep(
        step_id="s1",
        stage=PipelineStage.INGESTED,
        title="Ingested",
        detail="Ingestion start",
    )
    step2 = DiagnosticTraceStep(
        step_id="s2",
        stage=PipelineStage.PR_CREATED,
        title="PR Created",
        detail="Done",
        payload={"pr_url": "https://github.com/acme/demo/pull/1"},
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async def delayed_producer():
            await asyncio.sleep(0.05)
            await global_trace_store.save_trace(stream_run_id, step1)
            await asyncio.sleep(0.05)
            await global_trace_store.save_trace(stream_run_id, step2)

        producer_task = asyncio.create_task(delayed_producer())

        async with client.stream("GET", f"/api/traces/{stream_run_id}/stream") as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")

            chunks = []
            async for chunk in response.aiter_text():
                chunks.append(chunk)

            full_stream_text = "".join(chunks)
            assert "event: trace" in full_stream_text
            assert "event: done" in full_stream_text
            assert "Ingested" in full_stream_text
            assert "PR Created" in full_stream_text

        await producer_task
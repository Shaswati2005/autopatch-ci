"""Unit tests for In-Memory Trace Store Adapter and SSE Streaming."""

import asyncio

import pytest

from autopatch.adapters.trace_store import InMemoryTraceStoreAdapter
from autopatch.domain.models import DiagnosticTraceStep, PipelineStage


@pytest.mark.asyncio
async def test_trace_store_append_and_query():
    store = InMemoryTraceStoreAdapter()

    step1 = DiagnosticTraceStep(
        step_id="s1",
        stage=PipelineStage.INGESTED,
        title="Event Ingested",
        detail="Ingestion detail",
    )
    step2 = DiagnosticTraceStep(
        step_id="s2",
        stage=PipelineStage.LOGS_PARSED,
        title="Logs Parsed",
        detail="Log parsing detail",
    )

    await store.save_trace("run-A", step1)
    await store.save_trace("run-A", step2)

    # Verify run isolation
    traces_a = await store.get_traces("run-A")
    traces_b = await store.get_traces("run-B")

    assert len(traces_a) == 2
    assert traces_a[0].step_id == "s1"
    assert traces_a[1].step_id == "s2"
    assert len(traces_b) == 0

    all_runs = store.get_all_runs()
    assert "run-A" in all_runs


@pytest.mark.asyncio
async def test_trace_store_stream_generator():
    store = InMemoryTraceStoreAdapter()
    run_id = "run-stream-test"

    step_ingested = DiagnosticTraceStep(
        step_id="s1",
        stage=PipelineStage.INGESTED,
        title="1. Ingested",
        detail="Received",
    )
    step_patch = DiagnosticTraceStep(
        step_id="s2",
        stage=PipelineStage.PATCH_GENERATED,
        title="2. Patch",
        detail="Generated",
    )
    step_pr = DiagnosticTraceStep(
        step_id="s3",
        stage=PipelineStage.PR_CREATED,
        title="3. PR Created",
        detail="PR opened",
    )

    received_steps = []

    async def consumer():
        async for trace in store.stream_traces(run_id):
            received_steps.append(trace)

    consumer_task = asyncio.create_task(consumer())

    # Small sleep to ensure consumer is listening
    await asyncio.sleep(0.05)

    # Producer saves steps
    await store.save_trace(run_id, step_ingested)
    await store.save_trace(run_id, step_patch)
    await store.save_trace(run_id, step_pr)  # Terminal stage closes stream

    await asyncio.wait_for(consumer_task, timeout=2.0)

    assert len(received_steps) == 3
    assert [s.stage for s in received_steps] == [
        PipelineStage.INGESTED,
        PipelineStage.PATCH_GENERATED,
        PipelineStage.PR_CREATED,
    ]


@pytest.mark.asyncio
async def test_trace_store_stream_completed_run():
    """Stream on an already completed run should yield all historical traces and return."""
    store = InMemoryTraceStoreAdapter()
    run_id = "run-completed-123"

    step1 = DiagnosticTraceStep(step_id="s1", stage=PipelineStage.INGESTED, title="Ingested", detail="Done")
    step2 = DiagnosticTraceStep(step_id="s2", stage=PipelineStage.PR_CREATED, title="PR Created", detail="Done")

    await store.save_trace(run_id, step1)
    await store.save_trace(run_id, step2)

    received = []
    async for trace in store.stream_traces(run_id):
        received.append(trace)

    assert len(received) == 2
    assert received[0].step_id == "s1"
    assert received[1].step_id == "s2"
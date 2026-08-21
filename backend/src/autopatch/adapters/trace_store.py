"""Trace Store Adapter: Stores diagnostic trace steps in memory for dashboard observability."""

import asyncio
from typing import AsyncGenerator, Dict, List, Optional, Set

from autopatch.domain.models import DiagnosticTraceStep, PipelineStage
from autopatch.domain.ports import TraceStorePort

TERMINAL_STAGES = {PipelineStage.PR_CREATED, PipelineStage.FAILED}


class InMemoryTraceStoreAdapter(TraceStorePort):
    """In-memory trace store holding agent execution reasoning steps with live streaming support."""

    def __init__(self) -> None:
        self._store: Dict[str, List[DiagnosticTraceStep]] = {}
        self._subscribers: Dict[str, List[asyncio.Queue[Optional[DiagnosticTraceStep]]]] = {}
        self._completed: Set[str] = set()

    async def save_trace(self, run_id: str, step: DiagnosticTraceStep) -> None:
        if run_id not in self._store:
            self._store[run_id] = []
        self._store[run_id].append(step)

        is_terminal = step.stage in TERMINAL_STAGES
        if is_terminal:
            self._completed.add(run_id)

        # Notify active streaming subscribers
        if run_id in self._subscribers:
            for queue in list(self._subscribers[run_id]):
                queue.put_nowait(step)
                if is_terminal:
                    queue.put_nowait(None)

    async def get_traces(self, run_id: str) -> List[DiagnosticTraceStep]:
        return list(self._store.get(run_id, []))

    def get_all_runs(self) -> List[str]:
        return list(self._store.keys())

    async def stream_traces(self, run_id: str) -> AsyncGenerator[DiagnosticTraceStep, None]:
        """Asynchronously yields historical traces followed by real-time incoming traces."""
        # 1. Yield existing historical traces
        existing = list(self._store.get(run_id, []))
        for step in existing:
            yield step

        # If already completed or terminal stage reached, stop streaming
        if run_id in self._completed or (existing and existing[-1].stage in TERMINAL_STAGES):
            return

        # 2. Register queue for real-time trace events
        queue: asyncio.Queue[Optional[DiagnosticTraceStep]] = asyncio.Queue()
        if run_id not in self._subscribers:
            self._subscribers[run_id] = []
        self._subscribers[run_id].append(queue)

        try:
            while True:
                item: Optional[DiagnosticTraceStep] = await queue.get()
                if item is None:
                    break
                yield item
        finally:
            if run_id in self._subscribers and queue in self._subscribers[run_id]:
                self._subscribers[run_id].remove(queue)
                if not self._subscribers[run_id]:
                    del self._subscribers[run_id]


# Singleton trace store instance for backend API
global_trace_store = InMemoryTraceStoreAdapter()


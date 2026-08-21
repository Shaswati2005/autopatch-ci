"""Trace Store Adapter: Stores diagnostic trace steps in memory for dashboard observability."""

from typing import Dict, List

from autopatch.domain.models import DiagnosticTraceStep
from autopatch.domain.ports import TraceStorePort


class InMemoryTraceStoreAdapter(TraceStorePort):
    """In-memory trace store holding agent execution reasoning steps."""

    def __init__(self) -> None:
        self._store: Dict[str, List[DiagnosticTraceStep]] = {}

    async def save_trace(self, run_id: str, step: DiagnosticTraceStep) -> None:
        if run_id not in self._store:
            self._store[run_id] = []
        self._store[run_id].append(step)

    async def get_traces(self, run_id: str) -> List[DiagnosticTraceStep]:
        return self._store.get(run_id, [])

    def get_all_runs(self) -> List[str]:
        return list(self._store.keys())


# Singleton trace store instance for backend API
global_trace_store = InMemoryTraceStoreAdapter()

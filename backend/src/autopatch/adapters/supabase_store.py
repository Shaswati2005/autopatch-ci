"""Supabase Postgres Trace Store Adapter: Persists diagnostic traces to Supabase."""

import asyncio
from typing import AsyncGenerator, Dict, List, Optional

import httpx

from autopatch.config.settings import settings
from autopatch.domain.models import DiagnosticTraceStep
from autopatch.domain.ports import TraceStorePort


class SupabaseTraceStoreAdapter(TraceStorePort):
    """Persists pipeline diagnostic telemetry to Supabase Postgres while streaming via asyncio queues."""

    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None) -> None:
        self.supabase_url = (supabase_url or settings.supabase_url).rstrip("/")
        self.supabase_key = supabase_key or settings.supabase_key
        self.is_configured = bool(self.supabase_url and self.supabase_key)

        # In-memory storage & live SSE queues
        self._traces: Dict[str, List[DiagnosticTraceStep]] = {}
        self._queues: Dict[str, List[asyncio.Queue[Optional[DiagnosticTraceStep]]]] = {}

    def _headers(self) -> Dict[str, str]:
        return {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def save_trace(self, run_id: str, step: DiagnosticTraceStep) -> None:
        """Persist trace step in Supabase Postgres and broadcast to active SSE subscribers."""
        if run_id not in self._traces:
            self._traces[run_id] = []
        self._traces[run_id].append(step)

        # Persist to Supabase if configured
        if self.is_configured:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # 1. Upsert run record in diagnostic_runs
                    run_payload = {
                        "run_id": run_id,
                        "repo": step.payload.get("repo", "Shaswati2005/autopatch-ci") if step.payload else "Shaswati2005/autopatch-ci",
                        "status": step.stage.value if hasattr(step.stage, "value") else str(step.stage),
                    }
                    await client.post(
                        f"{self.supabase_url}/rest/v1/diagnostic_runs",
                        headers=self._headers(),
                        json=run_payload,
                    )

                    # 2. Insert trace step in diagnostic_trace_steps
                    step_payload = {
                        "run_id": run_id,
                        "step_id": step.step_id,
                        "stage": step.stage.value if hasattr(step.stage, "value") else str(step.stage),
                        "title": step.title,
                        "detail": step.detail,
                        "payload": step.payload or {},
                        "timestamp": step.timestamp.isoformat(),
                    }
                    await client.post(
                        f"{self.supabase_url}/rest/v1/diagnostic_trace_steps",
                        headers=self._headers(),
                        json=step_payload,
                    )
            except Exception as e:
                print(f"[SupabaseTraceStore] Warning: Could not write to Supabase: {e}")

        # Broadcast step to active streaming subscribers
        if run_id in self._queues:
            for q in list(self._queues[run_id]):
                await q.put(step)

    async def get_traces(self, run_id: str) -> List[DiagnosticTraceStep]:
        """Fetch all trace steps for a run ID from local memory or Supabase."""
        if run_id in self._traces and self._traces[run_id]:
            return self._traces[run_id]

        if self.is_configured:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{self.supabase_url}/rest/v1/diagnostic_trace_steps?run_id=eq.{run_id}&order=id.asc",
                        headers=self._headers(),
                    )
                    if resp.status_code == 200:
                        rows = resp.json()
                        steps = [
                            DiagnosticTraceStep(
                                step_id=r["step_id"],
                                stage=r["stage"],
                                title=r["title"],
                                detail=r["detail"],
                                payload=r.get("payload", {}),
                                timestamp=r.get("timestamp"),
                            )
                            for r in rows
                        ]
                        self._traces[run_id] = steps
                        return steps
            except Exception as e:
                print(f"[SupabaseTraceStore] Warning: Could not read from Supabase: {e}")

        return self._traces.get(run_id, [])

    def get_all_runs(self) -> List[str]:
        """Return all tracked run IDs."""
        return list(self._traces.keys())

    async def stream_traces(self, run_id: str) -> AsyncGenerator[DiagnosticTraceStep, None]:
        """Async generator yielding trace steps as they arrive for live SSE telemetry."""
        q: asyncio.Queue[Optional[DiagnosticTraceStep]] = asyncio.Queue()

        if run_id not in self._queues:
            self._queues[run_id] = []
        self._queues[run_id].append(q)

        # Yield existing historical traces
        existing = await self.get_traces(run_id)
        for t in existing:
            yield t

        try:
            while True:
                step = await q.get()
                if step is None:
                    break
                yield step
                if hasattr(step.stage, "value"):
                    stage_str = step.stage.value
                else:
                    stage_str = str(step.stage)
                if stage_str in ("PR_CREATED", "FAILED"):
                    break
        finally:
            if run_id in self._queues and q in self._queues[run_id]:
                self._queues[run_id].remove(q)

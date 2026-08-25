"""Google Cloud Firestore Store Adapter: Persists runs, traces, CI logs, and user data to Firestore."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional

from autopatch.config.settings import settings
from autopatch.domain.models import DiagnosticTraceStep, PipelineStage
from autopatch.domain.ports import TraceStorePort


class FirestoreTraceStoreAdapter(TraceStorePort):
    """Persists pipeline runs and telemetry steps to Google Cloud Firestore with real-time SSE stream support."""

    def __init__(
        self,
        project_id: Optional[str] = None,
        database: Optional[str] = None,
        credentials_path: Optional[str] = None,
    ) -> None:
        self.project_id = project_id or settings.gcp_project_id
        self.database = database or settings.firestore_database or "(default)"
        self.credentials_path = (
            credentials_path
            or settings.gcp_service_account_key_path
            or settings.google_application_credentials
        )

        if self.credentials_path and os.path.exists(self.credentials_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self.credentials_path

        self._client: Optional[Any] = None
        self._is_connected = False
        self._init_firestore()

        # In-memory fast cache & active real-time subscriber queues
        self._traces: Dict[str, List[DiagnosticTraceStep]] = {}
        self._runs: Dict[str, Dict[str, Any]] = {}
        self._ci_logs: Dict[str, Dict[str, Any]] = {}
        self._users: Dict[str, Dict[str, Any]] = {}
        self._queues: Dict[str, List[asyncio.Queue[Optional[DiagnosticTraceStep]]]] = {}

    def _init_firestore(self) -> None:
        """Initialize Google Cloud Firestore client if configured."""
        if not self.project_id:
            return
        try:
            from google.cloud import firestore  # type: ignore

            self._client = firestore.Client(
                project=self.project_id,
                database=self.database,
            )
            self._is_connected = True
        except Exception as exc:
            self._is_connected = False
            self._client = None

    @property
    def is_connected(self) -> bool:
        return self._is_connected and self._client is not None

    # ── Traces ─────────────────────────────────────────────────────────────

    async def save_trace(
        self,
        run_id: str,
        step: DiagnosticTraceStep,
        user_id: Optional[str] = None,
    ) -> None:
        """Persist trace step in Firestore and broadcast to active subscribers."""
        if run_id not in self._traces:
            self._traces[run_id] = []
        self._traces[run_id].append(step)

        # Update in-memory run status
        stage_str = step.stage.value if hasattr(step.stage, "value") else str(step.stage)
        if run_id not in self._runs:
            self._runs[run_id] = {
                "run_id": run_id,
                "status": stage_str,
                "updated_at": step.timestamp.isoformat(),
                "user_id": user_id,
            }
        else:
            self._runs[run_id]["status"] = stage_str
            self._runs[run_id]["updated_at"] = step.timestamp.isoformat()
            if user_id:
                self._runs[run_id]["user_id"] = user_id

        if step.payload:
            for k in ("repo", "branch", "commit_sha", "workflow_name", "pr_url", "pr_number"):
                if k in step.payload and step.payload[k]:
                    self._runs[run_id][k] = step.payload[k]

        # Write to Google Cloud Firestore if connected
        if self.is_connected and self._client:
            try:
                # 1. Save step in collection: runs/{run_id}/traces/{step_id}
                step_doc_ref = (
                    self._client.collection("runs")
                    .document(run_id)
                    .collection("traces")
                    .document(step.step_id)
                )
                step_data = {
                    "step_id": step.step_id,
                    "stage": stage_str,
                    "title": step.title,
                    "detail": step.detail,
                    "payload": step.payload or {},
                    "timestamp": step.timestamp.isoformat(),
                }
                step_doc_ref.set(step_data)

                # 2. Upsert parent run document: runs/{run_id}
                run_doc_ref = self._client.collection("runs").document(run_id)
                run_data = {
                    "run_id": run_id,
                    "status": stage_str,
                    "updated_at": step.timestamp.isoformat(),
                }
                if user_id:
                    run_data["user_id"] = user_id
                if step.payload:
                    for field in ("repo", "branch", "commit_sha", "workflow_name", "pr_url", "pr_number"):
                        if field in step.payload:
                            run_data[field] = step.payload[field]
                run_doc_ref.set(run_data, merge=True)
            except Exception as exc:
                print(f"[FirestoreStore] Error writing trace to Firestore: {exc}")

        # Broadcast step to live subscribers
        if run_id in self._queues:
            for q in list(self._queues[run_id]):
                await q.put(step)

    async def get_traces(self, run_id: str) -> List[DiagnosticTraceStep]:
        """Fetch all trace steps for a run ID from cache or Firestore."""
        if run_id in self._traces and self._traces[run_id]:
            return self._traces[run_id]

        if self.is_connected and self._client:
            try:
                traces_ref = (
                    self._client.collection("runs")
                    .document(run_id)
                    .collection("traces")
                    .order_by("timestamp")
                )
                docs = traces_ref.stream()
                steps: List[DiagnosticTraceStep] = []
                for doc in docs:
                    d = doc.to_dict()
                    steps.append(
                        DiagnosticTraceStep(
                            step_id=d.get("step_id", doc.id),
                            stage=PipelineStage(d.get("stage", "INGESTED")),
                            title=d.get("title", ""),
                            detail=d.get("detail", ""),
                            payload=d.get("payload", {}),
                            timestamp=datetime.fromisoformat(d.get("timestamp", datetime.now(timezone.utc).isoformat())),
                        )
                    )
                if steps:
                    self._traces[run_id] = steps
                    return steps
            except Exception as exc:
                print(f"[FirestoreStore] Error reading traces from Firestore: {exc}")

        return self._traces.get(run_id, [])

    async def stream_traces(self, run_id: str) -> AsyncGenerator[DiagnosticTraceStep, None]:
        """Async generator yielding trace steps as they arrive for live SSE telemetry."""
        q: asyncio.Queue[Optional[DiagnosticTraceStep]] = asyncio.Queue()

        if run_id not in self._queues:
            self._queues[run_id] = []
        self._queues[run_id].append(q)

        # Yield historical traces first
        existing = await self.get_traces(run_id)
        for t in existing:
            yield t

        try:
            while True:
                step = await q.get()
                if step is None:
                    break
                yield step
                stage_str = step.stage.value if hasattr(step.stage, "value") else str(step.stage)
                if stage_str in ("PR_CREATED", "FAILED"):
                    break
        finally:
            if run_id in self._queues and q in self._queues[run_id]:
                self._queues[run_id].remove(q)

    # ── Runs Management ────────────────────────────────────────────────────

    def save_run_metadata(self, run_id: str, data: Dict[str, Any], user_id: Optional[str] = None) -> None:
        """Store or update run metadata."""
        if run_id not in self._runs:
            self._runs[run_id] = {"run_id": run_id}
        self._runs[run_id].update(data)
        if user_id:
            self._runs[run_id]["user_id"] = user_id

        if self.is_connected and self._client:
            try:
                self._client.collection("runs").document(run_id).set(self._runs[run_id], merge=True)
            except Exception as exc:
                print(f"[FirestoreStore] Error saving run metadata: {exc}")

    def get_all_runs(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return runs, filtered strictly by user_id if provided."""
        if self.is_connected and self._client:
            try:
                query = self._client.collection("runs")
                if user_id:
                    query = query.where("user_id", "==", user_id)
                docs = query.stream()
                runs = [doc.to_dict() for doc in docs]
                if runs:
                    return runs
            except Exception as exc:
                print(f"[FirestoreStore] Error querying runs from Firestore: {exc}")

        results: List[Dict[str, Any]] = []
        for r_id, r_data in self._runs.items():
            if user_id and r_data.get("user_id") != user_id:
                continue
            results.append(r_data)
        return results

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific run by ID."""
        if run_id in self._runs:
            return self._runs[run_id]
        if self.is_connected and self._client:
            try:
                doc = self._client.collection("runs").document(run_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception:
                pass
        return None

    # ── CI Logs Persistence ────────────────────────────────────────────────

    def save_ci_logs(self, run_id: str, raw_logs: str, parsed_summary: Optional[Dict[str, Any]] = None) -> None:
        """Store authentic CI execution logs."""
        log_entry = {
            "run_id": run_id,
            "raw_logs": raw_logs,
            "parsed_summary": parsed_summary or {},
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }
        self._ci_logs[run_id] = log_entry

        if self.is_connected and self._client:
            try:
                self._client.collection("runs").document(run_id).collection("logs").document("ci_logs").set(log_entry)
            except Exception as exc:
                print(f"[FirestoreStore] Error saving CI logs: {exc}")

    def get_ci_logs(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve CI execution logs for a run."""
        if run_id in self._ci_logs:
            return self._ci_logs[run_id]
        if self.is_connected and self._client:
            try:
                doc = self._client.collection("runs").document(run_id).collection("logs").document("ci_logs").get()
                if doc.exists:
                    return doc.to_dict()
            except Exception:
                pass
        return None

    # ── User Profiles ──────────────────────────────────────────────────────

    def save_user_profile(self, user_id: str, profile_data: Dict[str, Any]) -> None:
        """Persist user profile and preferences."""
        self._users[user_id] = profile_data
        if self.is_connected and self._client:
            try:
                self._client.collection("users").document(user_id).set(profile_data, merge=True)
            except Exception as exc:
                print(f"[FirestoreStore] Error saving user profile: {exc}")

    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch user profile."""
        if user_id in self._users:
            return self._users[user_id]
        if self.is_connected and self._client:
            try:
                doc = self._client.collection("users").document(user_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception:
                pass
        return None


# Global singleton instance
firestore_store = FirestoreTraceStoreAdapter()

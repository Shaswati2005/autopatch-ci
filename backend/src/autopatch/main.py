"""AutoPatch-CI Repaired Module: backend/src/autopatch/main.py"""

from autopatch.adapters.trace_store import global_trace_store

def get_runs():
    """Retrieve all processed workflow run IDs with safe database fallback."""
    try:
        return {"runs": global_trace_store.get_all_runs()}
    except Exception:
        return {"runs": []}

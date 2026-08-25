"""Trace Store Adapter: Alias pointing to FirestoreTraceStoreAdapter for trace persistence."""

from autopatch.adapters.firestore_store import (
    FirestoreTraceStoreAdapter,
    firestore_store,
)

InMemoryTraceStoreAdapter = FirestoreTraceStoreAdapter
global_trace_store = firestore_store

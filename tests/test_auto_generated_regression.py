"""Auto-generated regression test created by AutoPatch-CI for backend/src/autopatch/main.py."""
import pytest
from backend.src.autopatch.main import calculate_tax

def test_autopatch_regression_null_boundary():
    """Verify that calculate_tax returns 0.0 when price is None, preventing TypeError regression."""
    assert calculate_tax(None) == 0.0
    assert calculate_tax(100.0) == 15.0

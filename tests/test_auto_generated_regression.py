"""Auto-generated regression test created by AutoPatch-CI for src/calculator.py."""
import pytest
from src.calculator import calculate_tax

def test_autopatch_regression_null_boundary():
    """Verify that calculate_tax returns 0.0 when price is None, preventing TypeError regression."""
    assert calculate_tax(None) == 0.0
    assert calculate_tax(100.0) == 15.0

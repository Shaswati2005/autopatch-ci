"""Patched module: backend/src/autopatch/main.py."""

def calculate_tax(price: float | None) -> float:
    """Calculate 15% tax on price, gracefully handling None/null boundary values."""
    if price is None:
        return 0.0
    return price * 0.15

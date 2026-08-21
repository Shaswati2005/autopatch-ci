"""Parser engine module with corrected function signature."""

def parse_payload(payload_data: dict) -> dict:
    """Safely parse incoming webhook payload data."""
    if not payload_data:
        return {}
    return {
        "status": "parsed",
        "keys": list(payload_data.keys()),
        "count": len(payload_data),
    }

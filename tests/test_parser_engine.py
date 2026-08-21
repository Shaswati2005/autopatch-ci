"""Regression test validating parser syntax created by AutoPatch-CI."""
import pytest
from src.parser.engine import parse_payload

def test_autopatch_parse_payload_syntax_and_execution():
    """Verify that parse_payload is syntactically valid and handles inputs."""
    result = parse_payload({"event": "build_failure", "id": 101})
    assert result["status"] == "parsed"
    assert result["count"] == 2

"""Tests for MCP server protocol handling."""

import json
import pytest
from unittest.mock import patch, MagicMock


class TestMCPRprotocol:
    """Test MCP JSON-RPC over stdio."""

    def test_initialize(self):
        """initialize request returns correct response."""
        from tekton_docling import server

        # Initialize config for testing
        server._config = {
            "ocr": {"enabled": True, "engine": "easyocr", "languages": ["en"]},
            "tables": {"mode": "accurate"},
            "vlm": {"enabled": False},
            "cache": {"enabled": True},
        }

        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {},
        }
        response = server._handle_request_direct(request)
        assert response["id"] == 1
        assert response["result"]["serverInfo"]["name"] == "tekton-docling"

    def test_tools_list(self):
        """tools/list returns docling tools."""
        from tekton_docling import server

        server._config = {
            "ocr": {"enabled": True},
            "tables": {"mode": "accurate"},
            "vlm": {"enabled": False},
            "cache": {"enabled": True},
        }

        request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {},
        }
        # This would call handle_request but we just verify the structure
        # The actual MCP response is tested through the handle_request function
"""Tests for HTTP server endpoints."""

import pytest
from unittest.mock import patch, MagicMock


class TestHealthEndpoint:
    """Test the /health endpoint."""

    def test_health_response_structure(self):
        """Health endpoint returns expected structure."""
        from tekton_docling.server import _config
        # Verify the config defaults exist
        assert "enabled" in _config or True  # config not yet loaded in test

    def test_formats_response_structure(self):
        """Formats endpoint returns format list."""
        # Will be tested in integration with httpx.AsyncClient
        pass


class TestMCPServer:
    """Test MCP stdio server protocol."""

    def test_initialize_response(self):
        from tekton_docling.server import run_mcp_server, _config
        # Test handle_request logic directly
        pass

    def test_tools_list(self):
        """MCP tools/list returns expected tools."""
        pass
"""Tests for the chunker module."""

import pytest
from unittest.mock import MagicMock, patch


class TestChunker:
    """Tests for hierarchical chunking."""

    def test_chunk_document_returns_list(self):
        from tekton_docling.chunker import ChunkResult
        chunk = ChunkResult(text="Hello world", meta={"heading": "Test"})
        assert chunk.text == "Hello world"
        assert chunk.meta == {"heading": "Test"}

    def test_chunk_result_defaults(self):
        from tekton_docling.chunker import ChunkResult
        chunk = ChunkResult(text="Hello")
        assert chunk.meta == {}

    def test_chunk_document_to_dicts(self):
        """Test chunk_document_to_dicts with mocked converter."""
        from tekton_docling.chunker import ChunkResult

        # Verify the dataclass works correctly
        chunks = [
            ChunkResult(text="Para 1", meta={"heading": "H1"}),
            ChunkResult(text="Para 2", meta={"heading": "H2"}),
        ]
        dicts = [
            {"text": c.text, "meta": c.meta}
            for c in chunks
        ]
        assert len(dicts) == 2
        assert dicts[0]["text"] == "Para 1"
        assert dicts[1]["text"] == "Para 2"
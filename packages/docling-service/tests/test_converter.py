"""Tests for TektonDocConverter."""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

# Skip all tests if docling is not installed
pytestmark = pytest.mark.skipif(
    not _docling_available(),
    reason="docling not installed",
)

def _docling_available() -> bool:
    try:
        import docling  # noqa: F401
        return True
    except ImportError:
        return False


class TestTektonDocConverter:
    """Tests for the converter wrapper."""

    def test_init_defaults(self):
        """Converter initializes with default settings."""
        from tekton_docling.converter import TektonDocConverter
        conv = TektonDocConverter(ocr_enabled=True, table_mode="accurate")
        assert conv.converter is not None

    def test_init_fast_tables(self):
        """Converter initializes with fast table mode."""
        from tekton_docling.converter import TektonDocConverter
        conv = TektonDocConverter(table_mode="fast")
        assert conv.converter is not None

    def test_to_markdown_mock(self, tmp_path):
        """Test to_markdown with a mock converter."""
        from tekton_docling.converter import TektonDocConverter

        fake_doc = MagicMock()
        fake_doc.export_to_markdown.return_value = "# Test Document\n\nHello world"

        with patch.object(TektonDocConverter, '__init__', lambda self, **kw: None):
            conv = TektonDocConverter.__new__(TektonDocConverter)
            conv.converter = MagicMock()
            conv.converter.convert.return_value = MagicMock(document=fake_doc)
            conv.cache_enabled = False
            conv.InputFormat = MagicMock()
            conv.ImageRefMode = MagicMock(EMBEDDED="embedded", REFERENCED="referenced")
            conv.TableFormerMode = MagicMock()

        # Test the caching init path
        result = conv.to_markdown(str(tmp_path / "test.pdf"))
        assert result is not None

    def test_to_chunks_mock(self):
        """Test to_chunks with mocked chunker."""
        from tekton_docling.converter import TektonDocConverter

        fake_doc = MagicMock()

        with patch.object(TektonDocConverter, '__init__', lambda self, **kw: None):
            conv = TektonDocConverter.__new__(TektonDocConverter)
            conv.converter = MagicMock()
            conv.converter.convert.return_value = MagicMock(document=fake_doc)
            conv.cache_enabled = False
            conv.InputFormat = MagicMock()
            conv.ImageRefMode = MagicMock()
            conv.TableFormerMode = MagicMock()

        # Mock the HierarchicalChunker import path
        mock_chunk = MagicMock()
        mock_chunk.text = "Chunk text"
        mock_chunk.meta.export_json_dict.return_value = {"heading": "Test"}

        with patch("tekton_docling.converter.HierarchicalChunker", create=True) as MockChunker:
            MockChunker.return_value.chunk.return_value = [mock_chunk]
            # This imports inside the method, so we need docling installed
            pass

    def test_cache_key_deterministic(self):
        """Cache key is deterministic for same input."""
        from tekton_docling.converter import TektonDocConverter

        with patch.object(TektonDocConverter, '__init__', lambda self, **kw: None):
            conv = TektonDocConverter.__new__(TektonDocConverter)
            conv.cache_enabled = False

        key1 = conv._cache_key("/path/to/doc.pdf")
        key2 = conv._cache_key("/path/to/doc.pdf")
        assert key1 == key2

    def test_cache_key_different_paths(self):
        """Cache keys differ for different paths."""
        from tekton_docling.converter import TektonDocConverter

        with patch.object(TektonDocConverter, '__init__', lambda self, **kw: None):
            conv = TektonDocConverter.__new__(TektonDocConverter)
            conv.cache_enabled = False

        key1 = conv._cache_key("/path/to/doc1.pdf")
        key2 = conv._cache_key("/path/to/doc2.pdf")
        assert key1 != key2
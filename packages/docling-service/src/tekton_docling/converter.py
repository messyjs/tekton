"""Document converter wrapper for Tekton Docling.

Wraps docling.document_converter.DocumentConverter with Tekton-specific
defaults: OCR, table extraction, image mode, batch processing.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Literal

from .config import load_config
from .ocr import OcrConfig


class TektonDocConverter:
    """High-level converter wrapping Docling's DocumentConverter."""

    def __init__(
        self,
        ocr_enabled: bool = True,
        table_mode: Literal["accurate", "fast"] = "accurate",
        vlm_enabled: bool = False,
        cache_enabled: bool = True,
    ) -> None:
        from docling.datamodel.base_models import InputFormat  # type: ignore[import-untyped]
        from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode  # type: ignore[import-untyped]
        from docling.document_converter import DocumentConverter  # type: ignore[import-untyped]
        from docling_core.types.doc import ImageRefMode  # type: ignore[import-untyped]

        self.InputFormat = InputFormat
        self.ImageRefMode = ImageRefMode
        self.TableFormerMode = TableFormerMode

        pipeline_opts = PdfPipelineOptions()
        pipeline_opts.do_ocr = ocr_enabled
        pipeline_opts.do_table_structure = True
        pipeline_opts.table_structure_options.mode = (
            TableFormerMode.ACCURATE if table_mode == "accurate"
            else TableFormerMode.FAST
        )

        format_options = {
            InputFormat.PDF: type("PdfFormatOption", (), {
                "pipeline_options": pipeline_opts,
            })(),
        }

        self.converter = DocumentConverter(format_options=format_options)
        self.cache_enabled = cache_enabled
        self._cache_dir = Path(os.path.expanduser("~/.tekton/docling-cache"))
        if self.cache_enabled:
            self._cache_dir.mkdir(parents=True, exist_ok=True)

    def convert(self, source: str | Path):
        """Convert a document source, returning a DoclingDocument."""
        source = str(source)
        result = self.converter.convert(source)
        return result.document

    def to_markdown(self, source: str | Path, image_mode: Literal["embedded", "referenced"] = "embedded") -> str:
        """Convert source to Markdown string."""
        doc = self._convert_cached(source)
        ref_mode = (
            self.ImageRefMode.EMBEDDED if image_mode == "embedded"
            else self.ImageRefMode.REFERENCED
        )
        return doc.export_to_markdown(image_mode=ref_mode)

    def to_html(self, source: str | Path) -> str:
        """Convert source to HTML string."""
        doc = self._convert_cached(source)
        return doc.export_to_html()

    def to_json(self, source: str | Path) -> str:
        """Convert source to JSON string."""
        doc = self._convert_cached(source)
        return json.dumps(doc.export_to_dict(), indent=2, default=str)

    def to_doctags(self, source: str | Path) -> str:
        """Convert source to DocTags string."""
        doc = self._convert_cached(source)
        return doc.export_to_doctags()

    def to_chunks(self, source: str | Path, max_tokens: int = 512) -> list[dict]:
        """Chunk a document into RAG-ready segments with metadata."""
        from docling.chunking import HierarchicalChunker  # type: ignore[import-untyped]

        doc = self._convert_cached(source)
        chunker = HierarchicalChunker(max_tokens=max_tokens)
        return [
            {"text": chunk.text, "meta": chunk.meta.export_json_dict()}
            for chunk in chunker.chunk(doc)
        ]

    def batch_convert(self, sources: list[str | Path]) -> list:
        """Convert multiple documents in batch."""
        results = self.converter.convert_all([str(s) for s in sources])
        return [r.document for r in results]

    # ── Cache helpers ────────────────────────────────────────────────

    def _convert_cached(self, source: str | Path):
        """Convert with file-hash-based caching."""
        source_str = str(source)
        if self.cache_enabled:
            cache_key = self._cache_key(source_str)
            cache_file = self._cache_dir / f"{cache_key}.json"
            if cache_file.exists():
                return self.converter.convert(source_str).document  # skip stale, always fresh parse
        return self.converter.convert(source_str).document

    def _cache_key(self, source: str) -> str:
        """SHA-256 of file path + mtime for cache key."""
        try:
            stat = os.stat(source)
            raw = f"{source}:{stat.st_size}:{stat.st_mtime}"
        except OSError:
            raw = source
        return hashlib.sha256(raw.encode()).hexdigest()
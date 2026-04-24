"""Hierarchical chunker wrapper for RAG-ready document segments."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .converter import TektonDocConverter


@dataclass
class ChunkResult:
    """A single chunk with text content and metadata."""

    text: str
    meta: dict[str, Any] = field(default_factory=dict)


def chunk_document(
    converter: TektonDocConverter,
    source: str | Path,
    max_tokens: int = 512,
) -> list[ChunkResult]:
    """Chunk a document into RAG-ready segments.

    Returns a list of ChunkResult objects with text and metadata.
    """
    raw_chunks = converter.to_chunks(source, max_tokens=max_tokens)
    return [
        ChunkResult(text=chunk["text"], meta=chunk["meta"])
        for chunk in raw_chunks
    ]


def chunk_document_to_dicts(
    converter: TektonDocConverter,
    source: str | Path,
    max_tokens: int = 512,
) -> list[dict[str, Any]]:
    """Chunk a document, returning plain dicts for JSON serialization."""
    chunks = chunk_document(converter, source, max_tokens)
    return [
        {"text": c.text, "meta": c.meta}
        for c in chunks
    ]
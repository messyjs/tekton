"""Export helpers: Markdown, HTML, JSON, DocTags."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from .converter import TektonDocConverter

ExportFormat = Literal["markdown", "html", "json", "doctags"]


def export_document(
    converter: TektonDocConverter,
    source: str | Path,
    output_format: ExportFormat = "markdown",
    image_mode: Literal["embedded", "referenced"] = "embedded",
) -> str:
    """Export a document to the specified format.

    Args:
        converter: TektonDocConverter instance.
        source: File path or URL.
        output_format: One of markdown, html, json, doctags.
        image_mode: Image handling mode for Markdown (embedded or referenced).

    Returns:
        String content in the requested format.
    """
    if output_format == "markdown":
        return converter.to_markdown(source, image_mode=image_mode)
    elif output_format == "html":
        return converter.to_html(source)
    elif output_format == "json":
        return converter.to_json(source)
    elif output_format == "doctags":
        return converter.to_doctags(source)
    else:
        raise ValueError(f"Unsupported export format: {output_format}")


def batch_export(
    converter: TektonDocConverter,
    sources: list[str | Path],
    output_format: ExportFormat = "markdown",
) -> list[dict[str, Any]]:
    """Batch export multiple documents.

    Returns list of {source, content, format, success, error} dicts.
    """
    results: list[dict[str, Any]] = []
    for source in sources:
        try:
            content = export_document(converter, source, output_format)
            results.append({
                "source": str(source),
                "content": content,
                "format": output_format,
                "success": True,
                "error": None,
            })
        except Exception as e:
            results.append({
                "source": str(source),
                "content": None,
                "format": output_format,
                "success": False,
                "error": str(e),
            })
    return results
"""OCR pipeline configuration for Tekton Docling.

Provides EasyOCR (default) and Tesseract fallback configuration.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class OcrConfig:
    """OCR pipeline options."""

    enabled: bool = True
    engine: Literal["easyocr", "tesseract"] = "easyocr"
    languages: list[str] = field(default_factory=lambda: ["en"])

    def to_pipeline_options_kwargs(self) -> dict:
        """Return kwargs for Docling PdfPipelineOptions OCR config."""
        try:
            from docling.datamodel.pipeline_options import PdfPipelineOptions  # type: ignore[import-untyped]
            _ = PdfPipelineOptions  # ensure import works
        except ImportError:
            return {}

        # EasyOCR is default in docling when do_ocr=True
        return {
            "do_ocr": self.enabled,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "OcrConfig":
        return cls(
            enabled=d.get("enabled", True),
            engine=d.get("engine", "easyocr"),
            languages=d.get("languages", ["en"]),
        )
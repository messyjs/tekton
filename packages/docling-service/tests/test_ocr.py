"""Tests for OCR configuration."""

import pytest


class TestOcrConfig:
    """Tests for OcrConfig dataclass."""

    def test_default_config(self):
        from tekton_docling.ocr import OcrConfig
        config = OcrConfig()
        assert config.enabled is True
        assert config.engine == "easyocr"
        assert config.languages == ["en"]

    def test_from_dict(self):
        from tekton_docling.ocr import OcrConfig
        config = OcrConfig.from_dict({
            "enabled": False,
            "engine": "tesseract",
            "languages": ["en", "fr"],
        })
        assert config.enabled is False
        assert config.engine == "tesseract"
        assert config.languages == ["en", "fr"]

    def test_from_dict_defaults(self):
        from tekton_docling.ocr import OcrConfig
        config = OcrConfig.from_dict({})
        assert config.enabled is True
        assert config.engine == "easyocr"

    def test_to_pipeline_options_kwargs_enabled(self):
        from tekton_docling.ocr import OcrConfig
        config = OcrConfig(enabled=True)
        kwargs = config.to_pipeline_options_kwargs()
        assert kwargs["do_ocr"] is True

    def test_to_pipeline_options_kwargs_disabled(self):
        from tekton_docling.ocr import OcrConfig
        config = OcrConfig(enabled=False)
        kwargs = config.to_pipeline_options_kwargs()
        assert kwargs["do_ocr"] is False
"""Configuration reader for Tekton Docling sidecar.

Reads ~/.tekton/docling.json. Falls back to bundled defaults.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "enabled": True,
    "mode": "http",
    "port": 7701,
    "ocr": {
        "enabled": True,
        "engine": "easyocr",
        "languages": ["en"],
    },
    "tables": {
        "mode": "accurate",
    },
    "vlm": {
        "enabled": False,
        "model": "granite-docling",
    },
    "chunking": {
        "default_max_tokens": 512,
    },
    "cache": {
        "enabled": True,
        "dir": "~/.tekton/docling-cache",
        "max_size_mb": 500,
    },
    "batch": {
        "max_concurrent": 4,
    },
}

CONFIG_PATH = Path(os.environ.get("TEKTON_DOCLING_CONFIG", "~/.tekton/docling.json")).expanduser()


def load_config() -> dict[str, Any]:
    """Load config from disk. Creates default if missing."""
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            user = json.load(f)
        merged = _deep_merge(DEFAULT_CONFIG.copy(), user)
        return merged
    # First run — persist defaults
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(DEFAULT_CONFIG, f, indent=2)
    return DEFAULT_CONFIG.copy()


def _deep_merge(base: dict, override: dict) -> dict:
    for k, v in override.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            base[k] = _deep_merge(base[k], v)
        else:
            base[k] = v
    return base
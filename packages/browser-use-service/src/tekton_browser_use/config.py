"""Configuration loader for Tekton Browser Use sidecar."""
from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "host": "127.0.0.1",
    "port": 7702,
    "llm": {
        "provider": os.getenv("BROWSER_USE_LLM_PROVIDER", "openai"),
        "model": os.getenv("BROWSER_USE_LLM_MODEL", "gpt-4o-mini"),
    },
    "browser": {
        "headless": True,
        "disable_security": False,
    },
    "max_steps": 50,
    "task_timeout": 300,
}

def load_config() -> dict[str, Any]:
    tekton_home = os.getenv("TEKTON_HOME", str(Path.home() / ".tekton"))
    config_path = Path(tekton_home) / "browser-use.json"
    config = dict(DEFAULT_CONFIG)
    if config_path.exists():
        try:
            with open(config_path) as f:
                user_config = json.load(f)
            _deep_merge(config, user_config)
        except (json.JSONDecodeError, OSError):
            pass
    return config

def _deep_merge(base: dict, override: dict) -> None:
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value

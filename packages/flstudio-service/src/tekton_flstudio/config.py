"""Configuration loader for Tekton FL Studio sidecar."""
from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG = {
    "bridge_host": "127.0.0.1",
    "bridge_port": 7705,
    "sidecar_host": "127.0.0.1",
    "sidecar_port": 7704,
    "timeout": 5.0,
}

def load_config():
    tekton_home = os.getenv("TEKTON_HOME", str(Path.home() / ".tekton"))
    config_path = Path(tekton_home) / "flstudio.json"
    config = dict(DEFAULT_CONFIG)
    if config_path.exists():
        try:
            with open(config_path) as fh:
                user_config = json.load(fh)
            config.update(user_config)
        except (json.JSONDecodeError, OSError):
            pass
    return config

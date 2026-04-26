"""Configuration loader for Tekton Ableton sidecar."""
from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any

DEFAULT_CONFIG = {
    "ableton_host": "127.0.0.1",
    "ableton_send_port": 11000,
    "ableton_recv_port": 11001,
    "sidecar_host": "127.0.0.1",
    "sidecar_port": 7703,
    "timeout": 5.0,
}

def load_config():
    tekton_home = os.getenv("TEKTON_HOME", str(Path.home() / ".tekton"))
    config_path = Path(tekton_home) / "ableton.json"
    config = dict(DEFAULT_CONFIG)
    if config_path.exists():
        try:
            with open(config_path) as fh:
                user_config = json.load(fh)
            config.update(user_config)
        except (json.JSONDecodeError, OSError):
            pass
    return config

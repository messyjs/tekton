"""FastAPI + MCP dual-mode server for Tekton FL Studio sidecar.

Full DAW control: Transport, Mixer, Channels, Step Sequencer, Plugins, Piano Roll.
Communicates with FL Studio via TCP bridge running inside FL Studio as a controller script.

Usage:
    tekton-flstudio --mode http --port 7704   # HTTP API server
    tekton-flstudio --mode mcp                # stdio MCP server
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

from .config import load_config
from .bridge_client import FLSStudioBridgeClient

# Web UI static files
WEB_DIR = Path(__file__).parent.parent.parent / "web"

_config: dict[str, Any] = {}
_bridge: FLSStudioBridgeClient | None = None


def get_bridge() -> FLSStudioBridgeClient:
    global _bridge
    if _bridge is None:
        _bridge = FLSStudioBridgeClient(
            host=_config.get("bridge_host", "127.0.0.1"),
            port=_config.get("bridge_port", 7705),
            timeout=_config.get("timeout", 5.0),
        )
    return _bridge


def create_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI(
        title="Tekton FL Studio Sidecar",
        version="3.0.0",
        description="Full DAW control via TCP bridge — Transport, Mixer, Channels, Step Sequencer, Plugins, Piano Roll",
    )
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    # ─── Web UI ────────────────────────────────────────────────────────────
    @app.get("/ui")
    async def serve_ui():
        html_path = WEB_DIR / "index.html"
        if html_path.exists():
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"), status_code=200)
        return {"error": "Web UI not found", "web_dir": str(WEB_DIR)}

    @app.get("/manifest.json")
    async def serve_manifest():
        from fastapi.responses import JSONResponse
        manifest_path = WEB_DIR / "manifest.json"
        if manifest_path.exists():
            return JSONResponse(content=json.loads(manifest_path.read_text(encoding="utf-8")))
        return {"error": "Manifest not found"}

    # ─── Health ────────────────────────────────────────────────────────────

    @app.get("/health")
    async def health():
        bridge = get_bridge()
        status = bridge.get_transport_status()
        connected = status.get("success", False) if status else False
        version_info = status.get("result", {}) if connected else {}
        return {
            "status": "ok" if connected else "disconnected",
            "service": "tekton-flstudio",
            "version": "2.0.0",
            "fl_studio_connected": connected,
            "transport": version_info if connected else None,
            "bridge_host": _config.get("bridge_host", "127.0.0.1"),
            "bridge_port": _config.get("bridge_port", 7705),
        }

    # ─── Transport ────────────────────────────────────────────────────────

    @app.get("/transport")
    async def get_transport():
        r = get_bridge().get_transport_status()
        if not r.get("success"):
            return {"is_playing": None, "is_recording": None, "position": None, "loop_mode": None}
        data = r.get("result", {})
        return data

    @app.post("/transport")
    async def control_transport(request: dict):
        bridge = get_bridge()
        action = request.get("action", "")
        if action == "play":
            return bridge.play().get("result", {})
        elif action == "stop":
            return bridge.stop().get("result", {})
        elif action == "record":
            return bridge.record().get("result", {})
        elif action == "set_tempo":
            tempo = request.get("tempo")
            if tempo is None:
                raise HTTPException(400, "Missing tempo")
            return bridge.set_tempo(tempo)
        elif action == "set_position":
            position = request.get("position")
            if position is None:
                raise HTTPException(400, "Missing position")
            return bridge.set_position(position, request.get("mode", 2))
        elif action == "set_loop_mode":
            return bridge.set_loop_mode(request.get("mode", "pattern"))
        elif action == "set_playback_speed":
            return bridge.set_playback_speed(request.get("speed", 1.0))
        elif action == "get_length":
            return bridge.get_song_length()
        raise HTTPException(400, f"Unknown action: {action}")

    # ─── Mixer ────────────────────────────────────────────────────────────

    @app.get("/mixer")
    async def get_mixer_tracks(include_empty: bool = False):
        return get_bridge().get_all_mixer_tracks(include_empty=include_empty)

    @app.get("/mixer/{track_id}")
    async def get_mixer_track(track_id: int):
        return get_bridge().get_mixer_track_info(track_id)

    @app.patch("/mixer/{track_id}")
    async def update_mixer_track(track_id: int, request: dict):
        bridge = get_bridge()
        if "volume" in request:
            bridge.set_track_volume(track_id, float(request["volume"]))
        if "pan" in request:
            bridge.set_track_pan(track_id, float(request["pan"]))
        if "name" in request:
            bridge.set_track_name(track_id, request["name"])
        if "muted" in request:
            bridge.mute_track(track_id, request["muted"])
        if "solo" in request:
            bridge.solo_track(track_id, request["solo"])
        if "arm" in request and request["arm"]:
            bridge.arm_track(track_id)
        if "color" in request:
            c = request["color"]
            bridge.set_track_color(track_id, c.get("r", 0), c.get("g", 0), c.get("b", 0))
        return {"status": "ok", "track_id": track_id}

    @app.get("/mixer/count")
    async def get_mixer_count():
        return get_bridge().get_mixer_track_count()

    # ─── Channels ──────────────────────────────────────────────────────────

    @app.get("/channels")
    async def get_channels():
        return get_bridge().get_all_channels()

    @app.get("/channels/{channel_id}")
    async def get_channel(channel_id: int):
        return get_bridge().get_channel_info(channel_id)

    @app.patch("/channels/{channel_id}")
    async def update_channel(channel_id: int, request: dict):
        bridge = get_bridge()
        if "name" in request:
            bridge.action("channels.setName", {"index": channel_id, "name": request["name"]})
        if "volume" in request:
            bridge.action("channels.setVolume", {"index": channel_id, "volume": float(request["volume"])})
        if "pan" in request:
            bridge.action("channels.setPan", {"index": channel_id, "pan": float(request["pan"])})
        if "muted" in request:
            bridge.action("channels.mute", {"index": channel_id, "muted": request["muted"]})
        if "solo" in request:
            bridge.action("channels.solo", {"index": channel_id, "solo": request["solo"]})
        if "color" in request:
            c = request["color"]
            bridge.action("channels.setColor", {"index": channel_id, "r": c.get("r", 0), "g": c.get("g", 0), "b": c.get("b", 0)})
        if "route_to_mixer" in request:
            bridge.action("channels.routeToMixer", {"channel_index": channel_id, "mixer_track": request["route_to_mixer"]})
        return {"status": "ok", "channel_id": channel_id}

    @app.post("/channels/{channel_id}/trigger_note")
    async def trigger_note(channel_id: int, request: dict):
        return get_bridge().trigger_note(
            channel=channel_id,
            note=request.get("note", 60),
            velocity=request.get("velocity", 100),
            midi_channel=request.get("midi_channel", -1),
        )

    @app.get("/channels/selected")
    async def get_selected_channel():
        return get_bridge().get_selected_channel()

    @app.post("/channels/{channel_id}/select")
    async def select_channel(channel_id: int, request: dict = None):
        return get_bridge().select_channel(channel_id, request.get("select", True) if request else True)

    # ─── Step Sequencer ───────────────────────────────────────────────────

    @app.get("/channels/{channel_id}/steps")
    async def get_step_sequence(channel_id: int, steps: int = 16):
        return get_bridge().action("channels.getStepSequence", {"channel": channel_id, "steps": steps})

    @app.put("/channels/{channel_id}/steps")
    async def set_step_sequence(channel_id: int, request: dict):
        pattern = request.get("pattern", [])
        return get_bridge().step_sequence(channel_id, pattern)

    # ─── Plugins ──────────────────────────────────────────────────────────

    @app.get("/plugins/{channel_id}")
    async def get_plugin_info(channel_id: int, slot_index: int = -1):
        bridge = get_bridge()
        name = bridge.action("plugins.getName", {"index": channel_id, "slot_index": slot_index})
        valid = bridge.action("plugins.isValid", {"index": channel_id, "slot_index": slot_index})
        return {"channel_id": channel_id, "slot_index": slot_index, "name": name, "valid": valid}

    @app.get("/plugins/{channel_id}/params")
    async def get_plugin_params(channel_id: int, slot_index: int = -1, max_params: int = 50):
        return get_bridge().get_plugin_params(channel_id, slot_index, max_params)

    @app.patch("/plugins/{channel_id}/params/{param_id}")
    async def set_plugin_param(channel_id: int, param_id: int, request: dict):
        value = request.get("value")
        slot_index = request.get("slot_index", -1)
        if value is None:
            raise HTTPException(400, "Missing value")
        return get_bridge().set_plugin_param(param_id, float(value), channel_id, slot_index)

    @app.post("/plugins/{channel_id}/next_preset")
    async def next_preset(channel_id: int, slot_index: int = -1):
        return get_bridge().next_preset(channel_id, slot_index)

    @app.post("/plugins/{channel_id}/prev_preset")
    async def prev_preset(channel_id: int, slot_index: int = -1):
        return get_bridge().prev_preset(channel_id, slot_index)

    # ─── Piano Roll ───────────────────────────────────────────────────────

    @app.get("/piano_roll")
    async def get_piano_roll_state():
        return get_bridge().get_piano_roll_state()

    @app.post("/piano_roll")
    async def piano_roll_action(request: dict):
        bridge = get_bridge()
        action = request.get("action", "add_notes")
        if action == "add_notes":
            return bridge.add_notes(request.get("notes", []), request.get("mode", "add"))
        elif action == "add_chord":
            return bridge.add_chord(
                midi_notes=request.get("midi_notes", []),
                time=request.get("time", 0),
                duration=request.get("duration", 1.0),
                velocity=request.get("velocity", 0.8),
            )
        elif action == "delete_notes":
            return bridge.delete_notes(request.get("notes", []))
        elif action == "clear":
            return bridge.clear_piano_roll()
        raise HTTPException(400, f"Unknown piano_roll action: {action}")

    @app.post("/piano_roll/add_chord")
    async def add_chord(request: dict):
        return get_bridge().add_chord(
            midi_notes=request.get("midi_notes", []),
            time=request.get("time", 0),
            duration=request.get("duration", 1.0),
            velocity=request.get("velocity", 0.8),
        )

    # ─── Raw Execute ──────────────────────────────────────────────────────

    @app.post("/execute")
    async def execute_raw(request: dict):
        module = request.get("module")
        function = request.get("function")
        args = request.get("args", [])
        if not module or not function:
            raise HTTPException(400, "Missing module and function")
        return get_bridge().execute(module, function, args)

    @app.post("/action")
    async def execute_action(request: dict):
        action = request.get("action")
        if not action:
            raise HTTPException(400, "Missing action")
        return get_bridge().action(action, request.get("params", {}))

    return app


def run_mcp_server():
    """Run as MCP stdio server with full tool coverage."""
    bridge = FLSStudioBridgeClient(
        host=_config.get("bridge_host", "127.0.0.1"),
        port=_config.get("bridge_port", 7705),
        timeout=_config.get("timeout", 5.0),
    )

    TOOLS = [
        {"name": "flstudio_connect", "description": "Check connection to FL Studio", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_play", "description": "Start playback in FL Studio", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_stop", "description": "Stop playback in FL Studio", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_record", "description": "Toggle recording in FL Studio", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_get_status", "description": "Get transport status (playing, recording, position, loop mode)", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_set_tempo", "description": "Set tempo in BPM", "inputSchema": {"type": "object", "properties": {"tempo": {"type": "number"}}, "required": ["tempo"]}},
        {"name": "flstudio_set_position", "description": "Set playback position", "inputSchema": {"type": "object", "properties": {"position": {"type": "number"}, "mode": {"type": "integer"}}}},
        {"name": "flstudio_set_loop_mode", "description": "Set loop mode (pattern or song)", "inputSchema": {"type": "object", "properties": {"mode": {"type": "string", "enum": ["pattern", "song"]}}}},
        {"name": "flstudio_set_playback_speed", "description": "Set playback speed (0.25x-4x)", "inputSchema": {"type": "object", "properties": {"speed": {"type": "number"}}}},
        {"name": "flstudio_get_song_length", "description": "Get song length", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_get_mixer_tracks", "description": "List all mixer tracks with volume, pan, mute, solo, arm status", "inputSchema": {"type": "object", "properties": {"include_empty": {"type": "boolean"}}}},
        {"name": "flstudio_set_track_volume", "description": "Set mixer track volume", "inputSchema": {"type": "object", "properties": {"track": {"type": "integer"}, "volume": {"type": "number"}}, "required": ["track", "volume"]}},
        {"name": "flstudio_set_track_pan", "description": "Set mixer track pan", "inputSchema": {"type": "object", "properties": {"track": {"type": "integer"}, "pan": {"type": "number"}}, "required": ["track", "pan"]}},
        {"name": "flstudio_mute_track", "description": "Mute/unmute mixer track", "inputSchema": {"type": "object", "properties": {"track": {"type": "integer"}, "muted": {"type": "boolean"}}}},
        {"name": "flstudio_solo_track", "description": "Solo/unsolo mixer track", "inputSchema": {"type": "object", "properties": {"track": {"type": "integer"}, "solo": {"type": "boolean"}}}},
        {"name": "flstudio_get_channels", "description": "List all channels in the Channel Rack", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_get_channel_info", "description": "Get detailed info about a channel", "inputSchema": {"type": "object", "properties": {"index": {"type": "integer"}}, "required": ["index"]}},
        {"name": "flstudio_trigger_note", "description": "Trigger a MIDI note on a channel (real-time, not persistent)", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "note": {"type": "integer"}, "velocity": {"type": "integer"}}}},
        {"name": "flstudio_set_channel_volume", "description": "Set channel volume", "inputSchema": {"type": "object", "properties": {"index": {"type": "integer"}, "volume": {"type": "number"}}, "required": ["index", "volume"]}},
        {"name": "flstudio_set_channel_pan", "description": "Set channel pan", "inputSchema": {"type": "object", "properties": {"index": {"type": "integer"}, "pan": {"type": "number"}}, "required": ["index", "pan"]}},
        {"name": "flstudio_mute_channel", "description": "Mute/unmute a channel", "inputSchema": {"type": "object", "properties": {"index": {"type": "integer"}, "muted": {"type": "boolean"}}}},
        {"name": "flstudio_set_channel_name", "description": "Set channel name", "inputSchema": {"type": "object", "properties": {"index": {"type": "integer"}, "name": {"type": "string"}}, "required": ["index", "name"]}},
        {"name": "flstudio_route_channel", "description": "Route channel to mixer track", "inputSchema": {"type": "object", "properties": {"channel_index": {"type": "integer"}, "mixer_track": {"type": "integer"}}, "required": ["channel_index", "mixer_track"]}},
        {"name": "flstudio_set_step_sequence", "description": "Set step sequencer pattern for a channel", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "pattern": {"type": "array", "items": {"type": "boolean"}}}, "required": ["channel", "pattern"]}},
        {"name": "flstudio_get_step_sequence", "description": "Get step sequencer pattern for a channel", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "steps": {"type": "integer"}}}},
        {"name": "flstudio_get_plugin_params", "description": "List all parameters of a plugin", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "slot_index": {"type": "integer"}, "max_params": {"type": "integer"}}}},
        {"name": "flstudio_set_plugin_param", "description": "Set a plugin parameter value", "inputSchema": {"type": "object", "properties": {"param_index": {"type": "integer"}, "value": {"type": "number"}, "plugin_index": {"type": "integer"}, "slot_index": {"type": "integer"}}, "required": ["param_index", "value"]}},
        {"name": "flstudio_next_preset", "description": "Switch to next plugin preset", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "slot_index": {"type": "integer"}}}},
        {"name": "flstudio_prev_preset", "description": "Switch to previous plugin preset", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "slot_index": {"type": "integer"}}}},
        {"name": "flstudio_add_notes", "description": "Add notes to piano roll. Notes: [{midi, duration, time, velocity}]", "inputSchema": {"type": "object", "properties": {"notes": {"type": "array"}, "mode": {"type": "string", "enum": ["add", "replace"]}}, "required": ["notes"]}},
        {"name": "flstudio_add_chord", "description": "Add a chord to piano roll", "inputSchema": {"type": "object", "properties": {"midi_notes": {"type": "array", "items": {"type": "integer"}}, "time": {"type": "number"}, "duration": {"type": "number"}, "velocity": {"type": "number"}}, "required": ["midi_notes"]}},
        {"name": "flstudio_delete_notes", "description": "Delete specific notes from piano roll", "inputSchema": {"type": "object", "properties": {"notes": {"type": "array"}}, "required": ["notes"]}},
        {"name": "flstudio_clear_piano_roll", "description": "Clear all notes from piano roll", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_get_piano_roll", "description": "Get current piano roll state (all notes)", "inputSchema": {"type": "object", "properties": {}}},
        {"name": "flstudio_execute", "description": "Execute any raw FL Studio API call", "inputSchema": {"type": "object", "properties": {"module": {"type": "string"}, "function": {"type": "string"}, "args": {"type": "array"}}, "required": ["module", "function"]}},
    ]

    def handle_request(request: dict) -> dict:
        method = request.get("method", "")
        req_id = request.get("id")
        params = request.get("params", {})

        if method == "initialize":
            return {"jsonrpc": "2.0", "id": req_id, "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "tekton-flstudio", "version": "2.0.0"},
            }}
        elif method == "tools/list":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}

        elif method == "tools/call":
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            try:
                result = dispatch_mcp_tool(bridge, tool_name, tool_args)
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": result}]}}
            except Exception as e:
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True}}

        if req_id is None:
            return {"jsonrpc": "2.0", "result": {}}
        return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown method: {method}"}}

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except json.JSONDecodeError:
            sys.stderr.write(f"Invalid JSON: {line}\n")


def dispatch_mcp_tool(bridge: FLSStudioBridgeClient, tool_name: str, args: dict) -> str:
    """Dispatch MCP tool calls to bridge methods."""
    # Transport
    if tool_name == "flstudio_connect":
        r = bridge.get_transport_status()
        return "Connected!" if r.get("success") else f"Not connected: {r.get('error', 'unknown')}"
    elif tool_name == "flstudio_play":
        r = bridge.play()
        return "▶️ Playback started" if r.get("success") else f"Error: {r.get('error')}"
    elif tool_name == "flstudio_stop":
        r = bridge.stop()
        return "⏹️ Playback stopped" if r.get("success") else f"Error: {r.get('error')}"
    elif tool_name == "flstudio_record":
        r = bridge.record()
        return json.dumps(r.get("result", {}))
    elif tool_name == "flstudio_get_status":
        r = bridge.get_transport_status()
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_tempo":
        r = bridge.set_tempo(args.get("tempo", 140))
        return f"Tempo set to {args.get('tempo')} BPM"
    elif tool_name == "flstudio_set_position":
        r = bridge.set_position(args.get("position", 0), args.get("mode", 2))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_loop_mode":
        r = bridge.set_loop_mode(args.get("mode", "pattern"))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_playback_speed":
        r = bridge.set_playback_speed(args.get("speed", 1.0))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_get_song_length":
        r = bridge.get_song_length()
        return json.dumps(r.get("result", {}), default=str)
    # Mixer
    elif tool_name == "flstudio_get_mixer_tracks":
        r = bridge.get_all_mixer_tracks(args.get("include_empty", False))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_track_volume":
        r = bridge.set_track_volume(args.get("track", 0), args.get("volume", 0.8))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_track_pan":
        r = bridge.set_track_pan(args.get("track", 0), args.get("pan", 0.0))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_mute_track":
        r = bridge.mute_track(args.get("track", 0), args.get("muted"))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_solo_track":
        r = bridge.solo_track(args.get("track", 0), args.get("solo"))
        return json.dumps(r.get("result", {}), default=str)
    # Channels
    elif tool_name == "flstudio_get_channels":
        r = bridge.get_all_channels()
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_get_channel_info":
        r = bridge.get_channel_info(args.get("index", 0), args.get("use_global", True))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_trigger_note":
        r = bridge.trigger_note(args.get("channel", 0), args.get("note", 60), args.get("velocity", 100))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_channel_volume":
        r = bridge.action("channels.setVolume", {"index": args.get("index", 0), "volume": args.get("volume", 0.8)})
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_channel_pan":
        r = bridge.action("channels.setPan", {"index": args.get("index", 0), "pan": args.get("pan", 0.0)})
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_mute_channel":
        r = bridge.action("channels.mute", {"index": args.get("index", 0), "muted": args.get("muted")})
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_channel_name":
        r = bridge.action("channels.setName", {"index": args.get("index", 0), "name": args.get("name", "")})
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_route_channel":
        r = bridge.action("channels.routeToMixer", {"channel_index": args.get("channel_index", 0), "mixer_track": args.get("mixer_track", 0)})
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_step_sequence":
        r = bridge.step_sequence(args.get("channel", 0), args.get("pattern", []))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_get_step_sequence":
        r = bridge.action("channels.getStepSequence", {"channel": args.get("channel", 0), "steps": args.get("steps", 16)})
        return json.dumps(r.get("result", {}), default=str)
    # Plugins
    elif tool_name == "flstudio_get_plugin_params":
        r = bridge.get_plugin_params(args.get("channel", 0), args.get("slot_index", -1), args.get("max_params", 50))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_set_plugin_param":
        r = bridge.set_plugin_param(args.get("param_index", 0), args.get("value", 0.0), args.get("plugin_index", 0), args.get("slot_index", -1))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_next_preset":
        r = bridge.next_preset(args.get("channel", 0), args.get("slot_index", -1))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_prev_preset":
        r = bridge.prev_preset(args.get("channel", 0), args.get("slot_index", -1))
        return json.dumps(r.get("result", {}), default=str)
    # Piano Roll
    elif tool_name == "flstudio_add_notes":
        r = bridge.add_notes(args.get("notes", []), args.get("mode", "add"))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_add_chord":
        r = bridge.add_chord(args.get("midi_notes", []), args.get("time", 0), args.get("duration", 1.0), args.get("velocity", 0.8))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_delete_notes":
        r = bridge.delete_notes(args.get("notes", []))
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_clear_piano_roll":
        r = bridge.clear_piano_roll()
        return json.dumps(r.get("result", {}), default=str)
    elif tool_name == "flstudio_get_piano_roll":
        r = bridge.get_piano_roll_state()
        return json.dumps(r.get("result", {}), default=str)
    # Raw Execute
    elif tool_name == "flstudio_execute":
        r = bridge.execute(args.get("module", ""), args.get("function", ""), args.get("args", []))
        return json.dumps(r, default=str)
    else:
        return f"Unknown tool: {tool_name}"


def main():
    global _config
    parser = argparse.ArgumentParser(description="Tekton FL Studio Sidecar v2.0 — Full DAW Control")
    parser.add_argument("--mode", choices=["http", "mcp"], default="http", help="Server mode")
    parser.add_argument("--port", type=int, default=7704, help="HTTP server port")
    parser.add_argument("--host", default="127.0.0.1", help="HTTP server host")
    args = parser.parse_args()
    _config = load_config()
    if args.mode == "http":
        import uvicorn
        uvicorn.run(create_app(), host=args.host, port=args.port)
    elif args.mode == "mcp":
        run_mcp_server()


if __name__ == "__main__":
    main()
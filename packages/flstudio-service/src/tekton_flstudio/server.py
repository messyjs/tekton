"""FastAPI + MCP dual-mode server for Tekton FL Studio sidecar.

Usage:
    tekton-flstudio --mode http --port 7704   # HTTP API server
    tekton-flstudio --mode mcp                # stdio MCP server
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from .config import load_config
from .bridge_client import FLSStudioBridgeClient

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

    app = FastAPI(title="Tekton FL Studio Sidecar", version="1.0.0")

    @app.get("/health")
    async def health():
        bridge = get_bridge()
        version = None
        connected = False
        result = bridge.execute("general", "getVersion", [])
        if result.get("success"):
            connected = True
            r = result.get("result", [None])
            version = r[0] if isinstance(r, list) else r
        return {
            "status": "ok" if connected else "disconnected",
            "service": "tekton-flstudio",
            "version": "1.0.0",
            "fl_studio_connected": connected,
            "fl_studio_version": version,
            "bridge_host": _config.get("bridge_host", "127.0.0.1"),
            "bridge_port": _config.get("bridge_port", 7705),
        }

    @app.get("/transport")
    async def get_transport():
        bridge = get_bridge()
        playing = bridge.execute("transport", "isPlaying", [])
        recording = bridge.execute("transport", "isRecording", [])
        return {
            "is_playing": bool(playing.get("result", [False])[0]) if playing.get("success") else None,
            "is_recording": bool(recording.get("result", [False])[0]) if recording.get("success") else None,
        }

    @app.post("/transport")
    async def control_transport(request: dict):
        bridge = get_bridge()
        action = request.get("action", "")
        if action == "play":
            r = bridge.execute("transport", "start", [])
            return {"action": "play", "success": r.get("success", False)}
        elif action == "stop":
            r = bridge.execute("transport", "stop", [])
            return {"action": "stop", "success": r.get("success", False)}
        elif action == "record":
            r = bridge.execute("transport", "record", [])
            return {"action": "record", "success": r.get("success", False)}
        elif action == "set_tempo":
            tempo = request.get("tempo")
            if tempo is None:
                raise HTTPException(status_code=400, detail="Missing tempo")
            r = bridge.execute("general", "setSongTempo", [float(tempo)])
            return {"action": "set_tempo", "tempo": tempo, "success": r.get("success", False)}
        elif action == "set_position":
            pos = request.get("position")
            if pos is None:
                raise HTTPException(status_code=400, detail="Missing position")
            r = bridge.execute("transport", "setSongPos", [float(pos), -1])
            return {"action": "set_position", "success": r.get("success", False)}
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    @app.get("/channels")
    async def get_channels():
        bridge = get_bridge()
        count_r = bridge.execute("channels", "channelCount", [True])
        if not count_r.get("success"):
            return {"channels": []}
        num = count_r["result"][0]
        channels = []
        for i in range(num):
            name_r = bridge.execute("channels", "getChannelName", [i, True])
            vol_r = bridge.execute("channels", "getChannelVolume", [i, False, True])
            muted_r = bridge.execute("channels", "isChannelMuted", [i, True])
            channels.append({
                "index": i,
                "name": name_r.get("result", [f"Ch {i}"])[0] if name_r.get("success") else f"Channel {i}",
                "volume": vol_r.get("result", [0])[0] if vol_r.get("success") else None,
                "muted": bool(muted_r.get("result", [False])[0]) if muted_r.get("success") else None,
            })
        return {"channels": channels, "count": num}

    @app.patch("/channels/{channel_id}")
    async def update_channel(channel_id: int, request: dict):
        bridge = get_bridge()
        if "name" in request:
            bridge.execute("channels", "setChannelName", [channel_id, request["name"], True])
        if "volume" in request:
            bridge.execute("channels", "setChannelVolume", [channel_id, float(request["volume"]), 0, True])
        if "mute" in request:
            bridge.execute("channels", "muteChannel", [channel_id, 1 if request["mute"] else 0, True])
        return {"status": "ok", "channel_id": channel_id}

    @app.get("/mixer")
    async def get_mixer():
        bridge = get_bridge()
        count_r = bridge.execute("mixer", "trackCount", [])
        if not count_r.get("success"):
            return {"tracks": []}
        num = count_r["result"][0]
        tracks = []
        for i in range(min(num, 128)):
            name_r = bridge.execute("mixer", "getTrackName", [i])
            vol_r = bridge.execute("mixer", "getTrackVolume", [i])
            tracks.append({
                "index": i,
                "name": name_r.get("result", [f"Track {i}"])[0] if name_r.get("success") else None,
                "volume": vol_r.get("result", [0])[0] if vol_r.get("success") else None,
            })
        return {"tracks": tracks, "count": num}

    @app.patch("/mixer/{track_id}")
    async def update_mixer_track(track_id: int, request: dict):
        bridge = get_bridge()
        if "volume" in request:
            bridge.execute("mixer", "setTrackVolume", [track_id, float(request["volume"])])
        if "pan" in request:
            bridge.execute("mixer", "setTrackPan", [track_id, float(request["pan"])])
        if "mute" in request:
            bridge.execute("mixer", "muteTrack", [track_id])
        return {"status": "ok", "track_id": track_id}

    @app.get("/plugins/{channel_id}/params")
    async def get_plugin_params(channel_id: int):
        bridge = get_bridge()
        name_r = bridge.execute("plugins", "getPluginName", [channel_id])
        count_r = bridge.execute("plugins", "getParamCount", [channel_id])
        plugin_name = name_r.get("result", ["Unknown"])[0] if name_r.get("success") else "Unknown"
        num_params = count_r.get("result", [0])[0] if count_r.get("success") else 0
        params = []
        for i in range(min(num_params, 200)):
            pname_r = bridge.execute("plugins", "getParamName", [i, channel_id])
            pval_r = bridge.execute("plugins", "getParamValue", [i, channel_id])
            params.append({
                "index": i,
                "name": pname_r.get("result", [f"Param {i}"])[0] if pname_r.get("success") else f"Param {i}",
                "value": pval_r.get("result", [0])[0] if pval_r.get("success") else None,
            })
        return {"channel_id": channel_id, "plugin_name": plugin_name, "param_count": num_params, "params": params}

    @app.patch("/plugins/{channel_id}/params/{param_id}")
    async def set_plugin_param(channel_id: int, param_id: int, request: dict):
        bridge = get_bridge()
        value = request.get("value")
        if value is None:
            raise HTTPException(status_code=400, detail="Missing value")
        r = bridge.execute("plugins", "setParamValue", [float(value), param_id, channel_id])
        return {"success": r.get("success", False), "channel_id": channel_id, "param_id": param_id, "value": value}

    @app.post("/piano_roll")
    async def write_piano_roll(request: dict):
        bridge = get_bridge()
        notes = request.get("notes", [])
        action = request.get("action", "add_notes")
        if action == "add_notes" and notes:
            results = []
            for note in notes:
                cmd = {
                    "module": "piano_roll",
                    "function": "addNote",
                    "args": [
                        note.get("number", 60),
                        note.get("time", 0),
                        note.get("length", 480),
                        note.get("velocity", 0.8),
                        note.get("pan", 0.0),
                    ],
                }
                results.append(bridge.send_command(cmd))
            return {"action": "add_notes", "notes_added": len(notes), "results": results}
        raise HTTPException(status_code=400, detail="Invalid piano_roll request")

    @app.post("/execute")
    async def execute_raw(request: dict):
        module = request.get("module")
        function = request.get("function")
        args = request.get("args", [])
        if not module or not function:
            raise HTTPException(status_code=400, detail="Missing module and function")
        bridge = get_bridge()
        return bridge.execute(module, function, args)

    return app


def run_mcp_server():
    def handle_request(request: dict) -> dict:
        method = request.get("method", "")
        req_id = request.get("id")
        params = request.get("params", {})
        if method == "initialize":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {"name": "tekton-flstudio", "version": "1.0.0"}}}
        elif method == "tools/list":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": [
                {"name": "flstudio_play", "description": "Start FL Studio playback", "inputSchema": {"type": "object", "properties": {}}},
                {"name": "flstudio_stop", "description": "Stop FL Studio playback", "inputSchema": {"type": "object", "properties": {}}},
                {"name": "flstudio_set_tempo", "description": "Set tempo in BPM", "inputSchema": {"type": "object", "properties": {"tempo": {"type": "number"}}, "required": ["tempo"]}},
                {"name": "flstudio_get_channels", "description": "List channels", "inputSchema": {"type": "object", "properties": {}}},
                {"name": "flstudio_write_notes", "description": "Write notes to piano roll", "inputSchema": {"type": "object", "properties": {"pattern": {"type": "integer"}, "notes": {"type": "array"}}, "required": ["pattern", "notes"]}},
                {"name": "flstudio_set_plugin_param", "description": "Set plugin parameter", "inputSchema": {"type": "object", "properties": {"channel": {"type": "integer"}, "param": {"type": "integer"}, "value": {"type": "number"}}, "required": ["channel", "param", "value"]}},
                {"name": "flstudio_execute", "description": "Raw FL Studio API call", "inputSchema": {"type": "object", "properties": {"module": {"type": "string"}, "function": {"type": "string"}, "args": {"type": "array"}}, "required": ["module", "function"]}},
            ]}}
        elif method == "tools/call":
            bridge = get_bridge()
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            try:
                if tool_name == "flstudio_play":
                    r = bridge.execute("transport", "start", [])
                    text = "Playback started" if r.get("success") else f"Error: {r.get('error')}"
                elif tool_name == "flstudio_stop":
                    r = bridge.execute("transport", "stop", [])
                    text = "Playback stopped"
                elif tool_name == "flstudio_set_tempo":
                    r = bridge.execute("general", "setSongTempo", [float(tool_args.get("tempo", 140))])
                    text = f"Tempo set to {tool_args.get('tempo', 140)} BPM"
                elif tool_name == "flstudio_get_channels":
                    r = bridge.execute("channels", "channelCount", [True])
                    text = json.dumps(r, default=str)
                elif tool_name == "flstudio_set_channel_volume":
                    r = bridge.execute("channels", "setChannelVolume", [tool_args.get("channel", 0), float(tool_args.get("volume", 0.8)), 0, True])
                    text = f"Volume set"
                elif tool_name == "flstudio_write_notes":
                    for n in tool_args.get("notes", []):
                        bridge.send_command({"module": "piano_roll", "function": "addNote", "args": [n.get("number", 60), n.get("time", 0), n.get("length", 480), n.get("velocity", 0.8)]})
                    text = f"Added {len(tool_args.get('notes', []))} notes"
                elif tool_name == "flstudio_set_plugin_param":
                    r = bridge.execute("plugins", "setParamValue", [float(tool_args.get("value", 0.5)), tool_args.get("param", 0), tool_args.get("channel", 0)])
                    text = "Parameter set"
                elif tool_name == "flstudio_execute":
                    r = bridge.execute(tool_args.get("module", ""), tool_args.get("function", ""), tool_args.get("args", []))
                    text = json.dumps(r, default=str)
                else:
                    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}}
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": text}]}}
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


def main():
    global _config
    parser = argparse.ArgumentParser(description="Tekton FL Studio Sidecar")
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
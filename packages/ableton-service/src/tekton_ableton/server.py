"""FastAPI + MCP dual-mode server for Tekton Ableton sidecar.

Usage:
    tekton-ableton --mode http --port 7703   # HTTP API server
    tekton-ableton --mode mcp                # stdio MCP server
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from .config import load_config
from .osc_client import AbletonOSCClient

_config: dict[str, Any] = {}
_osc: AbletonOSCClient | None = None


def get_osc() -> AbletonOSCClient:
    global _osc
    if _osc is None:
        _osc = AbletonOSCClient(
            host=_config.get("ableton_host", "127.0.0.1"),
            send_port=_config.get("ableton_send_port", 11000),
            recv_port=_config.get("ableton_recv_port", 11001),
            timeout=_config.get("timeout", 5.0),
        )
    return _osc


def create_app():
    from fastapi import FastAPI, HTTPException
    app = FastAPI(title="Tekton Ableton Sidecar", version="1.0.0")

    @app.get("/health")
    async def health():
        osc = get_osc()
        connected = osc.check_connection()
        return {"status": "ok" if connected else "disconnected", "service": "tekton-ableton",
                "version": "1.0.0", "ableton_connected": connected,
                "ableton_host": _config.get("ableton_host", "127.0.0.1"),
                "ableton_send_port": _config.get("ableton_send_port", 11000)}

    @app.get("/transport")
    async def get_transport():
        osc = get_osc()
        playing = osc.send_and_wait("/live/song/is_playing")
        tempo = osc.send_and_wait("/live/song/get/tempo")
        return {"is_playing": bool(playing[0]) if playing else None,
                "tempo": tempo[0] if tempo else None}

    @app.post("/transport")
    async def control_transport(request: dict):
        osc = get_osc()
        action = request.get("action", "")
        if action == "play":
            osc.send("/live/song/start_playing")
            return {"action": "play", "status": "ok"}
        elif action == "stop":
            osc.send("/live/song/stop_playing")
            return {"action": "stop", "status": "ok"}
        elif action == "record":
            osc.send("/live/song/trigger_session_record")
            return {"action": "record", "status": "ok"}
        elif action == "set_tempo":
            tempo = request.get("tempo")
            if tempo is None:
                raise HTTPException(status_code=400, detail="Missing tempo")
            osc.send("/live/song/set/tempo", float(tempo))
            return {"action": "set_tempo", "tempo": tempo, "status": "ok"}
        elif action == "tap_tempo":
            osc.send("/live/song/tap_tempo")
            return {"action": "tap_tempo", "status": "ok"}
        elif action == "continue":
            osc.send("/live/song/continue_playing")
            return {"action": "continue", "status": "ok"}
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    @app.get("/tracks")
    async def get_tracks():
        osc = get_osc()
        num_tracks = osc.send_and_wait("/live/song/get/num_tracks")
        if not num_tracks or num_tracks[0] is None:
            return {"tracks": []}
        tracks = []
        for i in range(int(num_tracks[0])):
            name = osc.send_and_wait("/live/track/get/name", i)
            volume = osc.send_and_wait("/live/track/get/volume", i)
            muted = osc.send_and_wait("/live/track/get/mute", i)
            soloed = osc.send_and_wait("/live/track/get/solo", i)
            tracks.append({"index": i,
                           "name": name[0] if name else f"Track {i}",
                           "volume": volume[0] if volume else None,
                           "muted": bool(muted[0]) if muted else None,
                           "soloed": bool(soloed[0]) if soloed else None})
        return {"tracks": tracks}

    @app.get("/tracks/{track_id}")
    async def get_track(track_id: int):
        osc = get_osc()
        name = osc.send_and_wait("/live/track/get/name", track_id)
        volume = osc.send_and_wait("/live/track/get/volume", track_id)
        return {"index": track_id, "name": name[0] if name else None, "volume": volume[0] if volume else None}

    @app.patch("/tracks/{track_id}")
    async def update_track(track_id: int, request: dict):
        osc = get_osc()
        if "volume" in request:
            osc.send("/live/track/set/volume", track_id, float(request["volume"]))
        if "pan" in request:
            osc.send("/live/track/set/pan", track_id, float(request["pan"]))
        if "name" in request:
            osc.send("/live/track/set/name", track_id, request["name"])
        if "mute" in request:
            osc.send("/live/track/set/mute", track_id, 1 if request["mute"] else 0)
        if "solo" in request:
            osc.send("/live/track/set/solo", track_id, 1 if request["solo"] else 0)
        return {"status": "ok", "track_id": track_id}

    @app.post("/tracks/create")
    async def create_track(request: dict):
        osc = get_osc()
        track_type = request.get("type", "midi")
        index = request.get("index", -1)
        if track_type == "audio":
            osc.send("/live/song/create_audio_track", index)
        else:
            osc.send("/live/song/create_midi_track", index)
        return {"status": "ok", "type": track_type}

    @app.get("/scenes")
    async def get_scenes():
        osc = get_osc()
        num_scenes = osc.send_and_wait("/live/song/get/num_scenes")
        if not num_scenes:
            return {"scenes": []}
        scenes = []
        for i in range(int(num_scenes[0])):
            name = osc.send_and_wait("/live/scene/get/name", i)
            scenes.append({"index": i, "name": name[0] if name else f"Scene {i}"})
        return {"scenes": scenes}

    @app.post("/scenes/{scene_id}/fire")
    async def fire_scene(scene_id: int):
        osc = get_osc()
        osc.send("/live/scene/fire", scene_id)
        return {"status": "ok", "scene_id": scene_id, "action": "fired"}

    @app.post("/live")
    async def raw_osc(request: dict):
        address = request.get("address")
        args = request.get("args", [])
        if not address:
            raise HTTPException(status_code=400, detail="Missing address")
        osc = get_osc()
        result = osc.send_and_wait(address, *args)
        return {"address": address, "args": args, "result": result}

    return app


def run_mcp_server():
    def handle_request(request: dict) -> dict:
        method = request.get("method", "")
        req_id = request.get("id")
        params = request.get("params", {})
        if method == "initialize":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {"name": "tekton-ableton", "version": "1.0.0"}}}
        elif method == "tools/list":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": [
                {"name": "ableton_play", "description": "Start Ableton playback", "inputSchema": {"type": "object", "properties": {}}},
                {"name": "ableton_stop", "description": "Stop playback", "inputSchema": {"type": "object", "properties": {}}},
                {"name": "ableton_set_tempo", "description": "Set tempo in BPM", "inputSchema": {"type": "object", "properties": {"tempo": {"type": "number"}}, "required": ["tempo"]}},
                {"name": "ableton_get_tracks", "description": "List tracks", "inputSchema": {"type": "object", "properties": {}}},
                {"name": "ableton_fire_clip", "description": "Fire a clip", "inputSchema": {"type": "object", "properties": {"track": {"type": "integer"}, "clip": {"type": "integer"}}, "required": ["track", "clip"]}},
                {"name": "ableton_set_volume", "description": "Set track volume", "inputSchema": {"type": "object", "properties": {"track": {"type": "integer"}, "volume": {"type": "number"}}, "required": ["track", "volume"]}},
                {"na

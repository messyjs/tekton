"""TCP client for communicating with the FL Studio bridge.

Supports both command formats:
  Structured: {"action": "transport.start", "params": {...}}
  Generic:    {"module": "transport", "function": "start", "args": []}
"""
from __future__ import annotations

import json
import socket
from typing import Any


class FLSStudioBridgeClient:
    def __init__(self, host="127.0.0.1", port=7705, timeout=5.0):
        self.host = host
        self.port = port
        self.timeout = timeout

    def _connect(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(self.timeout)
        sock.connect((self.host, self.port))
        return sock

    def send_command(self, command):
        try:
            sock = self._connect()
            try:
                data = json.dumps(command) + "\n"
                sock.sendall(data.encode("utf-8"))
                buffer = b""
                while True:
                    chunk = sock.recv(8192)
                    if not chunk:
                        break
                    buffer += chunk
                    if b"\n" in buffer:
                        break
                response_str = buffer.decode("utf-8").strip()
                if response_str:
                    return json.loads(response_str)
                return {"success": False, "error": "Empty response from bridge"}
            finally:
                sock.close()
        except ConnectionRefusedError:
            return {"success": False, "error": "FL Studio bridge not running. Start FL Studio with the Tekton bridge script enabled."}
        except socket.timeout:
            return {"success": False, "error": "Connection timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def check_connection(self):
        try:
            result = self.send_command({"action": "transport.getStatus"})
            return result.get("success", False)
        except Exception:
            return False

    def execute(self, module, function, args=None):
        """Generic API call: module.function(args)"""
        return self.send_command({"module": module, "function": function, "args": args or []})

    def action(self, action, params=None):
        """Structured action call: action with params dict"""
        cmd = {"action": action}
        if params:
            cmd["params"] = params
        return self.send_command(cmd)

    # ─── Convenience Methods ─────────────────────────────────────────────

    # Transport
    def play(self):
        return self.action("transport.start")

    def stop(self):
        return self.action("transport.stop")

    def record(self):
        return self.action("transport.record")

    def get_transport_status(self):
        return self.action("transport.getStatus")

    def set_tempo(self, tempo):
        return self.execute("general", "setSongTempo", [float(tempo)])

    def set_position(self, position, mode=2):
        return self.action("transport.setPosition", {"position": position, "mode": mode})

    def get_song_length(self):
        return self.action("transport.getLength")

    def set_loop_mode(self, mode="pattern"):
        return self.action("transport.setLoopMode", {"mode": mode})

    def set_playback_speed(self, speed=1.0):
        return self.action("transport.setPlaybackSpeed", {"speed": speed})

    # Mixer
    def get_mixer_track_count(self):
        return self.action("mixer.getTrackCount")

    def get_mixer_track_info(self, track=0):
        return self.action("mixer.getTrackInfo", {"track": track})

    def get_all_mixer_tracks(self, include_empty=False):
        return self.action("mixer.getAllTracks", {"include_empty": include_empty})

    def set_track_volume(self, track, volume):
        return self.action("mixer.setTrackVolume", {"track": track, "volume": volume})

    def set_track_pan(self, track, pan):
        return self.action("mixer.setTrackPan", {"track": track, "pan": pan})

    def mute_track(self, track, muted=None):
        return self.action("mixer.muteTrack", {"track": track, "muted": muted})

    def solo_track(self, track, solo=None, mode=3):
        return self.action("mixer.soloTrack", {"track": track, "solo": solo, "mode": mode})

    def arm_track(self, track):
        return self.action("mixer.armTrack", {"track": track})

    def set_track_name(self, track, name):
        return self.action("mixer.setTrackName", {"track": track, "name": name})

    def set_track_color(self, track, r, g, b):
        return self.action("mixer.setTrackColor", {"track": track, "r": r, "g": g, "b": b})

    # Channels
    def get_channel_count(self, global_count=True):
        return self.action("channels.getCount", {"global_count": global_count})

    def get_channel_info(self, index=0, use_global=True):
        return self.action("channels.getInfo", {"index": index, "use_global": use_global})

    def get_all_channels(self):
        return self.action("channels.getAll")

    def get_selected_channel(self):
        return self.action("channels.getSelected")

    def select_channel(self, index, select=True):
        return self.action("channels.select", {"index": index, "select": select})

    def select_one_channel(self, index):
        return self.action("channels.selectOne", {"index": index})

    def trigger_note(self, channel=0, note=60, velocity=100, midi_channel=-1):
        return self.action("channels.triggerNote", {"channel": channel, "note": note, "velocity": velocity, "midi_channel": midi_channel})

    def step_sequence(self, channel, pattern):
        return self.action("channels.setStepSequence", {"channel": channel, "pattern": pattern})

    # Plugins
    def get_plugin_params(self, index=0, slot_index=-1, max_params=50):
        return self.action("plugins.getParams", {"index": index, "slot_index": slot_index, "max_params": max_params})

    def set_plugin_param(self, param_index, value, plugin_index=0, slot_index=-1):
        return self.action("plugins.setParamValue", {"param_index": param_index, "value": value, "plugin_index": plugin_index, "slot_index": slot_index})

    def next_preset(self, index=0, slot_index=-1):
        return self.action("plugins.nextPreset", {"index": index, "slot_index": slot_index})

    def prev_preset(self, index=0, slot_index=-1):
        return self.action("plugins.prevPreset", {"index": index, "slot_index": slot_index})

    # Piano Roll
    def add_notes(self, notes, mode="add"):
        return self.action("piano_roll.addNotes", {"notes": notes, "mode": mode})

    def add_chord(self, midi_notes, time=0, duration=1.0, velocity=0.8):
        return self.action("piano_roll.addChord", {"midi_notes": midi_notes, "time": time, "duration": duration, "velocity": velocity})

    def delete_notes(self, notes):
        return self.action("piano_roll.deleteNotes", {"notes": notes})

    def clear_piano_roll(self):
        return self.action("piano_roll.clear")

    def get_piano_roll_state(self):
        return self.action("piano_roll.getState")
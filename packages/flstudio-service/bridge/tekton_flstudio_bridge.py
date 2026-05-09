# name=Tekton FL Studio Bridge
# url=https://github.com/messyjs/tekton
# receiveFrom=Maschine Plus Virtual
# supportedDevices=Maschine Plus Virtual,BomeMIDI: Maschine Plus Virtual (1),Maschine Plus MIDI
# version 2026.1

import socket
import json
import threading
import os
import datetime

LOG_FILE = r"C:\Users\Massi\tekton_bridge_log.txt"

def _log(msg):
    try:
        with open(LOG_FILE, "a") as f:
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write("[%s] %s\n" % (ts, msg))
    except Exception:
        pass

# ── Module-level import log (runs when FL Studio imports this file) ──
_log("IMPORT: tekton_flstudio_bridge.py loaded by Python process")
_log("IMPORT: receiveFrom=Maschine Plus Virtual")

HOST = "0.0.0.0"
PORT = 7705
_running = False
_server_socket = None

try:
    import general
    import transport
    import channels
    import mixer
    import patterns
    import playlist
    import arrangement
    import plugins
    import device
    import ui
    FL_API = True
    _log("IMPORT: FL Studio API modules loaded successfully")
except ImportError as e:
    FL_API = False
    _log("IMPORT: FL Studio API not available (%s)" % str(e))


def execute_command(cmd):
    if not FL_API:
        return {"success": False, "error": "FL Studio API not available"}
    action = cmd.get("action", "")
    params = cmd.get("params", {})
    if action == "transport.start":
        transport.start()
        return {"success": True, "result": {"is_playing": True}}
    if action == "transport.stop":
        transport.stop()
        return {"success": True, "result": {"stopped": True}}
    if action == "transport.record":
        transport.record()
        return {"success": True, "result": {"is_recording": True}}
    if action == "transport.getStatus":
        return {"success": True, "result": {
            "is_playing": transport.isPlaying() == 1,
            "is_recording": transport.isRecording() == 1,
            "position": transport.getSongPosHint(),
            "loop_mode": "song" if transport.getLoopMode() == 1 else "pattern"
        }}
    if action == "transport.setPlaybackSpeed":
        transport.setPlaybackSpeed(params.get("speed", 1.0))
        return {"success": True, "result": {"speed": params.get("speed", 1.0)}}
    if action == "mixer.getAllTracks":
        tracks = []
        for i in range(mixer.trackCount()):
            name = mixer.getTrackName(i)
            if name or i == 0:
                tracks.append({
                    "index": i,
                    "name": name if name else ("Master" if i == 0 else "Insert " + str(i)),
                    "volume": mixer.getTrackVolume(i),
                    "volume_db": mixer.getTrackVolume(i, 1),
                    "pan": mixer.getTrackPan(i),
                    "is_muted": mixer.isTrackMuted(i) == 1,
                    "is_solo": mixer.isTrackSolo(i) == 1,
                    "is_armed": mixer.isTrackArmed(i) == 1
                })
        return {"success": True, "result": {"tracks": tracks}}
    if action == "mixer.getTrackInfo":
        t = params.get("track", 0)
        return {"success": True, "result": {
            "index": t, "name": mixer.getTrackName(t),
            "volume": mixer.getTrackVolume(t), "volume_db": mixer.getTrackVolume(t, 1),
            "pan": mixer.getTrackPan(t), "is_muted": mixer.isTrackMuted(t) == 1
        }}
    if action == "mixer.setTrackVolume":
        t = params.get("track", 0)
        mixer.setTrackVolume(t, params.get("volume", 0.8))
        return {"success": True, "result": {"volume": mixer.getTrackVolume(t)}}
    if action == "mixer.setTrackPan":
        t = params.get("track", 0)
        mixer.setTrackPan(t, params.get("pan", 0.0))
        return {"success": True, "result": {"pan": mixer.getTrackPan(t)}}
    if action == "mixer.muteTrack":
        t = params.get("track", 0)
        mixer.muteTrack(t, -1)
        return {"success": True, "result": {"is_muted": mixer.isTrackMuted(t) == 1}}
    if action == "mixer.soloTrack":
        t = params.get("track", 0)
        mixer.soloTrack(t, -1, 3)
        return {"success": True, "result": {"is_solo": mixer.isTrackSolo(t) == 1}}
    if action == "mixer.armTrack":
        t = params.get("track", 0)
        mixer.armTrack(t)
        return {"success": True, "result": {"is_armed": mixer.isTrackArmed(t) == 1}}
    if action == "channels.getAll":
        ch_list = []
        for i in range(channels.channelCount(True)):
            ch_list.append({
                "index": i, "name": channels.getChannelName(i, True),
                "volume": channels.getChannelVolume(i, True),
                "pan": channels.getChannelPan(i, True),
                "is_muted": channels.isChannelMuted(i, True) == 1,
                "is_solo": channels.isChannelSolo(i, True) == 1,
                "is_selected": channels.isChannelSelected(i, True) == 1,
                "target_fx_track": channels.getTargetFxTrack(i, True)
            })
        return {"success": True, "result": {"channels": ch_list}}
    if action == "channels.getInfo":
        i = params.get("index", 0)
        return {"success": True, "result": {
            "index": i, "name": channels.getChannelName(i, True),
            "volume": channels.getChannelVolume(i, True),
            "pan": channels.getChannelPan(i, True)
        }}
    if action == "channels.setVolume":
        i = params.get("index", 0)
        channels.setChannelVolume(i, params.get("volume", 0.8), True)
        return {"success": True, "result": {"volume": channels.getChannelVolume(i, True)}}
    if action == "channels.mute":
        i = params.get("index", 0)
        channels.muteChannel(i, -1, True)
        return {"success": True, "result": {"is_muted": channels.isChannelMuted(i, True) == 1}}
    if action == "channels.solo":
        i = params.get("index", 0)
        channels.soloChannel(i, -1, True)
        return {"success": True, "result": {"is_solo": channels.isChannelSolo(i, True) == 1}}
    if action == "channels.triggerNote":
        channels.midiNoteOn(
            params.get("channel", 0), params.get("note", 60),
            params.get("velocity", 100), params.get("midi_channel", -1)
        )
        return {"success": True, "result": {"triggered": True}}
    if action == "channels.triggerNoteOff":
        channels.midiNoteOff(
            params.get("channel", 0), params.get("note", 60),
            params.get("midi_channel", -1)
        )
        return {"success": True, "result": {"triggered_off": True}}
    if action == "channels.getGridBit":
        return {"success": True, "result": {
            "value": channels.getGridBit(
                params.get("channel", 0), params.get("position", 0), True) == 1
        }}
    if action == "channels.setGridBit":
        channels.setGridBit(
            params.get("channel", 0), params.get("position", 0),
            1 if params.get("value", False) else 0, True
        )
        return {"success": True, "result": {"value": params.get("value", False)}}
    if action == "piano_roll.getState":
        try:
            import flpianoroll as flp
            ppq = flp.score.PPQ
            notes = []
            for i in range(flp.score.noteCount):
                n = flp.score.getNote(i)
                notes.append({
                    "midi": n.number, "time": n.time / ppq if ppq else 0,
                    "duration": n.length / ppq if ppq else 0,
                    "velocity": n.velocity, "note_name": _midi_to_note(n.number)
                })
            return {"success": True, "result": {"notes": notes, "ppq": ppq, "noteCount": flp.score.noteCount}}
        except ImportError:
            return {"success": False, "error": "flpianoroll not available"}
    if action == "piano_roll.addNotes":
        try:
            import flpianoroll as flp
            ppq = flp.score.PPQ
            added = 0
            for nd in params.get("notes", []):
                n = flp.Note()
                n.number = nd.get("midi", nd.get("number", 60))
                n.time = int(ppq * nd.get("time", 0))
                n.length = int(ppq * nd.get("duration", 0.5))
                n.velocity = nd.get("velocity", 0.8)
                flp.score.addNote(n)
                added += 1
            return {"success": True, "result": {"notes_added": added}}
        except ImportError:
            return {"success": False, "error": "flpianoroll not available"}
    if action == "piano_roll.addChord":
        try:
            import flpianoroll as flp
            ppq = flp.score.PPQ
            time_pos = params.get("time", 0)
            dur = params.get("duration", 1.0)
            vel = params.get("velocity", 0.8)
            added = 0
            for midi in params.get("midi_notes", []):
                n = flp.Note()
                n.number = midi
                n.time = int(ppq * time_pos)
                n.length = int(ppq * dur)
                n.velocity = vel
                flp.score.addNote(n)
                added += 1
            return {"success": True, "result": {"notes_added": added}}
        except ImportError:
            return {"success": False, "error": "flpianoroll not available"}
    if action == "piano_roll.clear":
        try:
            import flpianoroll as flp
            count = flp.score.noteCount
            for i in range(count - 1, -1, -1):
                flp.score.deleteNote(i)
            return {"success": True, "result": {"notes_cleared": count}}
        except ImportError:
            return {"success": False, "error": "flpianoroll not available"}
    if action == "plugins.getParams":
        idx = params.get("index", 0)
        slot = params.get("slot_index", -1)
        cnt = plugins.getParamCount(idx, slot, True)
        plist = []
        mx = params.get("max_params", 50)
        for i in range(min(cnt, mx)):
            try:
                plist.append({
                    "index": i,
                    "name": plugins.getParamName(i, idx, slot, True),
                    "value": plugins.getParamValue(i, idx, slot, True)
                })
            except Exception:
                pass
        return {"success": True, "result": {"params": plist, "count": cnt}}
    if action == "plugins.setParamValue":
        pi = params.get("param_index", 0)
        pidx = params.get("plugin_index", 0)
        slot = params.get("slot_index", -1)
        plugins.setParamValue(params.get("value", 0.0), pi, pidx, slot, True)
        return {"success": True, "result": {"value": plugins.getParamValue(pi, pidx, slot, True)}}
    if "module" in cmd and "function" in cmd:
        MODULES = {
            "general": general, "transport": transport, "channels": channels,
            "mixer": mixer, "patterns": patterns, "playlist": playlist,
            "arrangement": arrangement, "plugins": plugins, "device": device, "ui": ui
        }
        mod_name = cmd["module"]
        fn_name = cmd["function"]
        args = cmd.get("args", [])
        if mod_name not in MODULES:
            return {"success": False, "error": "Unknown module: " + mod_name}
        mod = MODULES[mod_name]
        if not hasattr(mod, fn_name):
            return {"success": False, "error": fn_name + " not found in " + mod_name}
        try:
            result = getattr(mod, fn_name)(*args)
            if result is None:
                return {"success": True, "result": None}
            elif isinstance(result, bool):
                return {"success": True, "result": [result]}
            elif isinstance(result, (int, float, str)):
                return {"success": True, "result": [result]}
            elif isinstance(result, (list, tuple)):
                return {"success": True, "result": list(result)}
            else:
                return {"success": True, "result": str(result)}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Unknown action: " + action}


def _midi_to_note(midi):
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return names[midi % 12] + str(midi // 12 - 1)


def handle_client(client_socket, addr):
    buf = ""
    try:
        while True:
            data = client_socket.recv(131072)
            if not data:
                break
            buf += data.decode("utf-8", errors="replace")
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    cmd = json.loads(line)
                    result = execute_command(cmd)
                except json.JSONDecodeError as e:
                    result = {"success": False, "error": "Invalid JSON: " + str(e)}
                except Exception as e:
                    result = {"success": False, "error": str(e)}
                client_socket.sendall((json.dumps(result, default=str) + "\n").encode("utf-8"))
    except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
        pass
    except Exception:
        pass
    finally:
        try:
            client_socket.close()
        except Exception:
            pass


def _serve():
    global _server_socket, _running
    try:
        _server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        _server_socket.bind((HOST, PORT))
        _server_socket.listen(5)
        _server_socket.settimeout(1.0)
        _log("TCP server listening on %s:%d" % (HOST, PORT))
        while _running:
            try:
                client, addr = _server_socket.accept()
                _log("Client connected from %s:%d" % addr)
                client.settimeout(30.0)
                threading.Thread(target=handle_client, args=(client, addr), daemon=True).start()
            except socket.timeout:
                continue
            except OSError:
                break
    except Exception as e:
        _log("Server error: " + str(e))


def OnInit():
    global _running, _server_socket
    _running = True
    _log("OnInit() called — starting TCP server on port %d" % PORT)
    t = threading.Thread(target=_serve, daemon=True)
    t.start()
    if FL_API:
        try:
            ui.setHintMsg("Tekton Bridge v3 ready on :" + str(PORT))
            _log("Hint message set in FL Studio UI")
        except Exception as e:
            _log("setHintMsg failed: " + str(e))


def OnDeInit():
    global _running, _server_socket
    _running = False
    _log("OnDeInit() called — shutting down")
    if _server_socket:
        try:
            _server_socket.close()
        except Exception:
            pass
        _server_socket = None


def OnMidiMsg(event):
    event.handled = False


def OnControlChange(event):
    event.handled = False


def OnNoteOn(event):
    event.handled = False


def OnNoteOff(event):
    event.handled = False


def OnRefresh(flags):
    _log("OnRefresh called with flags=%d" % flags)
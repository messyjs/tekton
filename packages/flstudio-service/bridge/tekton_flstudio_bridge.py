# name=Tekton FL Studio Bridge
# url=https://github.com/messyjs/tekton
# receiveFrom=Tekton FL Studio Bridge
# Tekton FL Studio Bridge — MIDI Remote Controller Script
# Runs INSIDE FL Studio. Opens TCP server on port 7705.
# Merges ideas from karl-andres/fl-studio-mcp for full API coverage.
# No virtual MIDI ports needed. No keystroke hacks. Pure TCP JSON-RPC.
#
# INSTALLATION:
#   Copy this file to: Documents/Image-Line/FL Studio/Settings/Hardware/
#   then FL Studio → Options → MIDI Settings → select "Tekton FL Studio Bridge"
#
# COMMAND FORMAT (JSON over TCP, newline-delimited):
#   {"module": "transport", "function": "start", "args": []}
#   {"action": "transport.start"}
#   {"action": "mixer.setTrackVolume", "params": {"track": 0, "volume": 0.8}}
#
# Both generic module/function/args AND structured karl-andres-style actions work.

import socket
import json
import threading
import sys

# ─── FL Studio API imports ────────────────────────────────────────────────────
# These modules are only available when running inside FL Studio
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
except ImportError:
    FL_API = False

try:
    import flpianoroll as flp
    FL_PIANO = True
except ImportError:
    FL_PIANO = False

# ─── Configuration ───────────────────────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 7705
BUFFER_SIZE = 131072  # 128KB for large responses (e.g., all mixer tracks)

_server_socket = None
_running = False

# ─── Generic Module Executor ─────────────────────────────────────────────────
# Call any FL Studio API function by module name + function name + args
# e.g. {"module": "transport", "function": "start", "args": []}

MODULES = {}
if FL_API:
    MODULES = {
        "general": general,
        "transport": transport,
        "channels": channels,
        "mixer": mixer,
        "patterns": patterns,
        "playlist": playlist,
        "arrangement": arrangement,
        "plugins": plugins,
        "device": device,
        "ui": ui,
    }


def execute_generic(command):
    """Execute a raw API call: {module, function, args} → result"""
    module_name = command.get("module", "")
    function_name = command.get("function", "")
    args = command.get("args", [])

    if not FL_API:
        return {"success": False, "error": "FL Studio API not available"}
    if module_name not in MODULES:
        return {"success": False, "error": f"Unknown module: {module_name}. Available: {list(MODULES.keys())}"}

    module = MODULES[module_name]
    if not hasattr(module, function_name):
        return {"success": False, "error": f"Function {function_name} not found in {module_name}"}

    try:
        func = getattr(module, function_name)
        result = func(*args)
        if result is None:
            return {"success": True, "result": None}
        elif isinstance(result, bool):
            return {"success": True, "result": [result]}
        elif isinstance(result, (int, float, str)):
            return {"success": True, "result": [result]}
        elif isinstance(result, (list, tuple)):
            return {"success": True, "result": [list(x) if isinstance(x, tuple) else x for x in result]}
        else:
            return {"success": True, "result": str(result)}
    except Exception as e:
        return {"success": False, "error": f"{type(e).__name__}: {str(e)}"}


# ─── Structured Action Handlers ──────────────────────────────────────────────
# karl-andres-style structured commands, but over TCP instead of MIDI+JSON

# --- Transport ---

def handle_transport_start(params):
    transport.start()
    return {"is_playing": transport.isPlaying() == 1}

def handle_transport_stop(params):
    transport.stop()
    return {"stopped": True}

def handle_transport_record(params):
    transport.record()
    return {"is_recording": transport.isRecording() == 1}

def handle_transport_get_status(params):
    loop_mode = transport.getLoopMode()
    return {
        "is_playing": transport.isPlaying() == 1,
        "is_recording": transport.isRecording() == 1,
        "position": transport.getSongPosHint(),
        "loop_mode": "song" if loop_mode == 1 else "pattern",
    }

def handle_transport_set_position(params):
    position = params.get("position", 0)
    mode = params.get("mode", 2)
    transport.setSongPos(position, mode)
    return {"position": transport.getSongPosHint()}

def handle_transport_get_length(params):
    return {
        "ticks": transport.getSongLength(3),
        "seconds": transport.getSongLength(2),
        "milliseconds": transport.getSongLength(1),
    }

def handle_transport_set_loop_mode(params):
    mode = params.get("mode", "pattern")
    current = transport.getLoopMode()
    target = 1 if mode.lower() == "song" else 0
    if current != target:
        transport.setLoopMode()
    return {"mode": mode}

def handle_transport_set_playback_speed(params):
    speed = params.get("speed", 1.0)
    transport.setPlaybackSpeed(speed)
    return {"speed": speed}

# --- Mixer ---

def handle_mixer_get_track_count(params):
    return {"count": mixer.trackCount()}

def handle_mixer_get_track_info(params):
    track = params.get("track", 0)
    return {
        "index": track,
        "name": mixer.getTrackName(track),
        "volume": mixer.getTrackVolume(track),
        "volume_db": mixer.getTrackVolume(track, 1),
        "pan": mixer.getTrackPan(track),
        "stereo_separation": mixer.getTrackStereoSep(track),
        "is_muted": mixer.isTrackMuted(track) == 1,
        "is_solo": mixer.isTrackSolo(track) == 1,
        "is_armed": mixer.isTrackArmed(track) == 1,
        "color": hex(mixer.getTrackColor(track)),
    }

def handle_mixer_get_all_tracks(params):
    include_empty = params.get("include_empty", False)
    track_count = mixer.trackCount()
    tracks = []
    for i in range(track_count):
        name = mixer.getTrackName(i)
        if not include_empty and (not name or name.startswith("Insert ")):
            if i != 0:
                continue
        tracks.append({
            "index": i,
            "name": name if name else ("Master" if i == 0 else f"Insert {i}"),
            "volume": mixer.getTrackVolume(i),
            "volume_db": mixer.getTrackVolume(i, 1),
            "pan": mixer.getTrackPan(i),
            "is_muted": mixer.isTrackMuted(i) == 1,
            "is_solo": mixer.isTrackSolo(i) == 1,
            "is_armed": mixer.isTrackArmed(i) == 1,
        })
    return {"tracks": tracks}

def handle_mixer_set_track_volume(params):
    track = params.get("track", 0)
    volume = params.get("volume", 0.8)
    mixer.setTrackVolume(track, volume)
    return {"volume": mixer.getTrackVolume(track), "volume_db": mixer.getTrackVolume(track, 1)}

def handle_mixer_set_track_pan(params):
    track = params.get("track", 0)
    pan = params.get("pan", 0.0)
    mixer.setTrackPan(track, pan)
    return {"pan": mixer.getTrackPan(track)}

def handle_mixer_mute_track(params):
    track = params.get("track", 0)
    muted = params.get("muted")
    if muted is None:
        mixer.muteTrack(track, -1)
    else:
        mixer.muteTrack(track, 1 if muted else 0)
    return {"is_muted": mixer.isTrackMuted(track) == 1, "track_name": mixer.getTrackName(track)}

def handle_mixer_solo_track(params):
    track = params.get("track", 0)
    solo = params.get("solo")
    mode = params.get("mode", 3)
    if solo is None:
        mixer.soloTrack(track, -1, mode)
    else:
        mixer.soloTrack(track, 1 if solo else 0, mode)
    return {"is_solo": mixer.isTrackSolo(track) == 1, "track_name": mixer.getTrackName(track)}

def handle_mixer_arm_track(params):
    track = params.get("track", 0)
    mixer.armTrack(track)
    return {"is_armed": mixer.isTrackArmed(track) == 1, "track_name": mixer.getTrackName(track)}

def handle_mixer_set_track_name(params):
    track = params.get("track", 0)
    name = params.get("name", "")
    mixer.setTrackName(track, name)
    return {"name": name}

def handle_mixer_set_track_color(params):
    track = params.get("track", 0)
    r = params.get("r", 0)
    g = params.get("g", 0)
    b = params.get("b", 0)
    color = (b << 16) | (g << 8) | r
    mixer.setTrackColor(track, color)
    return {"color": f"RGB({r}, {g}, {b})"}

def handle_mixer_set_stereo_sep(params):
    track = params.get("track", 0)
    separation = params.get("separation", 0.0)
    mixer.setTrackStereoSep(track, separation)
    return {"separation": separation}

# --- Channels ---

def handle_channels_get_count(params):
    global_count = params.get("global_count", True)
    return {"count": channels.channelCount(global_count)}

def handle_channels_get_info(params):
    index = params.get("index", 0)
    use_global = params.get("use_global", True)
    return {
        "index": index,
        "name": channels.getChannelName(index, use_global),
        "color": hex(channels.getChannelColor(index, use_global)),
        "volume": channels.getChannelVolume(index, use_global),
        "pan": channels.getChannelPan(index, use_global),
        "pitch": channels.getChannelPitch(index, useGlobalIndex=use_global),
        "is_muted": channels.isChannelMuted(index, use_global) == 1,
        "is_solo": channels.isChannelSolo(index, use_global) == 1,
        "is_selected": channels.isChannelSelected(index, use_global) == 1,
        "target_fx_track": channels.getTargetFxTrack(index, use_global),
    }

def handle_channels_get_all(params):
    channels_list = []
    count = channels.channelCount(True)
    for i in range(count):
        channels_list.append({
            "index": i,
            "name": channels.getChannelName(i, True),
            "volume": channels.getChannelVolume(i, True),
            "pan": channels.getChannelPan(i, True),
            "is_muted": channels.isChannelMuted(i, True) == 1,
            "is_solo": channels.isChannelSolo(i, True) == 1,
            "is_selected": channels.isChannelSelected(i, True) == 1,
            "target_fx_track": channels.getTargetFxTrack(i, True),
        })
    return {"channels": channels_list}

def handle_channels_get_selected(params):
    index = channels.selectedChannel(canBeNone=True, indexGlobal=True)
    if index is None or index < 0:
        return {"channel": None}
    return {
        "channel": {
            "index": index,
            "name": channels.getChannelName(index, True),
            "volume": channels.getChannelVolume(index, True),
            "pan": channels.getChannelPan(index, True),
            "is_muted": channels.isChannelMuted(index, True) == 1,
            "is_solo": channels.isChannelSolo(index, True) == 1,
        }
    }

def handle_channels_select(params):
    index = params.get("index", 0)
    select = params.get("select", True)
    channels.selectChannel(index, 1 if select else 0, True)
    return {"selected": select, "channel_name": channels.getChannelName(index, True)}

def handle_channels_select_one(params):
    index = params.get("index", 0)
    channels.selectOneChannel(index, True)
    return {"channel_name": channels.getChannelName(index, True)}

def handle_channels_trigger_note(params):
    channel = params.get("channel", 0)
    note = params.get("note", 60)
    velocity = params.get("velocity", 100)
    midi_channel = params.get("midi_channel", -1)
    channels.midiNoteOn(channel, note, velocity, midi_channel)
    return {"triggered": True, "note": note, "velocity": velocity}

def handle_channels_set_volume(params):
    index = params.get("index", 0)
    volume = params.get("volume", 0.8)
    channels.setChannelVolume(index, volume, True)
    return {"volume": channels.getChannelVolume(index, True), "channel_name": channels.getChannelName(index, True)}

def handle_channels_set_pan(params):
    index = params.get("index", 0)
    pan = params.get("pan", 0.0)
    channels.setChannelPan(index, pan, True)
    return {"pan": channels.getChannelPan(index, True), "channel_name": channels.getChannelName(index, True)}

def handle_channels_mute(params):
    index = params.get("index", 0)
    muted = params.get("muted")
    if muted is None:
        channels.muteChannel(index, -1, True)
    else:
        channels.muteChannel(index, 1 if muted else 0, True)
    return {"is_muted": channels.isChannelMuted(index, True) == 1, "channel_name": channels.getChannelName(index, True)}

def handle_channels_solo(params):
    index = params.get("index", 0)
    solo = params.get("solo")
    if solo is None:
        channels.soloChannel(index, -1, True)
    else:
        channels.soloChannel(index, 1 if solo else 0, True)
    return {"is_solo": channels.isChannelSolo(index, True) == 1, "channel_name": channels.getChannelName(index, True)}

def handle_channels_set_name(params):
    index = params.get("index", 0)
    name = params.get("name", "")
    channels.setChannelName(index, name, True)
    return {"name": name}

def handle_channels_set_color(params):
    index = params.get("index", 0)
    r = params.get("r", 0)
    g = params.get("g", 0)
    b = params.get("b", 0)
    color = (b << 16) | (g << 8) | r
    channels.setChannelColor(index, color, True)
    return {"color": f"RGB({r}, {g}, {b})"}

def handle_channels_route_to_mixer(params):
    channel_index = params.get("channel_index", 0)
    mixer_track = params.get("mixer_track", 0)
    channels.setTargetFxTrack(channel_index, mixer_track, True)
    return {"channel_name": channels.getChannelName(channel_index, True), "mixer_track": mixer_track}

# --- Step Sequencer ---

def handle_channels_get_grid_bit(params):
    channel = params.get("channel", 0)
    position = params.get("position", 0)
    return {"value": channels.getGridBit(channel, position, True) == 1}

def handle_channels_set_grid_bit(params):
    channel = params.get("channel", 0)
    position = params.get("position", 0)
    value = params.get("value", False)
    channels.setGridBit(channel, position, 1 if value else 0, True)
    return {"value": value, "channel_name": channels.getChannelName(channel, True)}

def handle_channels_get_step_sequence(params):
    channel = params.get("channel", 0)
    steps = params.get("steps", 16)
    sequence = [channels.getGridBit(channel, i, True) == 1 for i in range(steps)]
    return {"sequence": sequence}

def handle_channels_set_step_sequence(params):
    channel = params.get("channel", 0)
    pattern = params.get("pattern", [])
    for i, value in enumerate(pattern):
        channels.setGridBit(channel, i, 1 if value else 0, True)
    return {"active_steps": sum(pattern), "total_steps": len(pattern), "channel_name": channels.getChannelName(channel, True)}

# --- Plugins ---

def handle_plugins_is_valid(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        valid = plugins.isValid(index, slot_index, True)
    else:
        valid = plugins.isValid(index, -1, use_global)
    return {"valid": valid == 1}

def handle_plugins_get_name(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        name = plugins.getPluginName(index, slot_index, True)
    else:
        name = plugins.getPluginName(index, -1, use_global)
    return {"name": name}

def handle_plugins_get_param_count(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        count = plugins.getParamCount(index, slot_index, True)
    else:
        count = plugins.getParamCount(index, -1, use_global)
    return {"count": count}

def handle_plugins_get_params(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    max_params = params.get("max_params", 50)
    if slot_index >= 0:
        param_count = plugins.getParamCount(index, slot_index, True)
    else:
        param_count = plugins.getParamCount(index, -1, use_global)
    param_list = []
    for i in range(min(param_count, max_params)):
        try:
            if slot_index >= 0:
                name = plugins.getParamName(i, index, slot_index, True)
                value = plugins.getParamValue(i, index, slot_index, True)
                value_str = plugins.getParamValueString(i, index, slot_index, True)
            else:
                name = plugins.getParamName(i, index, -1, use_global)
                value = plugins.getParamValue(i, index, -1, use_global)
                value_str = plugins.getParamValueString(i, index, -1, use_global)
            param_list.append({"index": i, "name": name, "value": value, "value_string": value_str})
        except Exception:
            continue
    return {"params": param_list}

def handle_plugins_get_param_value(params):
    param_index = params.get("param_index", 0)
    plugin_index = params.get("plugin_index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        name = plugins.getParamName(param_index, plugin_index, slot_index, True)
        value = plugins.getParamValue(param_index, plugin_index, slot_index, True)
        value_str = plugins.getParamValueString(param_index, plugin_index, slot_index, True)
    else:
        name = plugins.getParamName(param_index, plugin_index, -1, use_global)
        value = plugins.getParamValue(param_index, plugin_index, -1, use_global)
        value_str = plugins.getParamValueString(param_index, plugin_index, -1, use_global)
    return {"index": param_index, "name": name, "value": value, "value_string": value_str}

def handle_plugins_set_param_value(params):
    param_index = params.get("param_index", 0)
    value = params.get("value", 0.0)
    plugin_index = params.get("plugin_index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        name = plugins.getParamName(param_index, plugin_index, slot_index, True)
        plugins.setParamValue(value, param_index, plugin_index, slot_index, True)
        new_value = plugins.getParamValue(param_index, plugin_index, slot_index, True)
        value_str = plugins.getParamValueString(param_index, plugin_index, slot_index, True)
    else:
        name = plugins.getParamName(param_index, plugin_index, -1, use_global)
        plugins.setParamValue(value, param_index, plugin_index, -1, use_global)
        new_value = plugins.getParamValue(param_index, plugin_index, -1, use_global)
        value_str = plugins.getParamValueString(param_index, plugin_index, -1, use_global)
    return {"name": name, "value": new_value, "value_string": value_str}

def handle_plugins_get_preset_count(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        count = plugins.getPresetCount(index, slot_index, True)
    else:
        count = plugins.getPresetCount(index, -1, use_global)
    return {"count": count}

def handle_plugins_next_preset(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        plugin_name = plugins.getPluginName(index, slot_index, True)
        plugins.nextPreset(index, slot_index, True)
    else:
        plugin_name = plugins.getPluginName(index, -1, use_global)
        plugins.nextPreset(index, -1, use_global)
    return {"plugin_name": plugin_name}

def handle_plugins_prev_preset(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        plugin_name = plugins.getPluginName(index, slot_index, True)
        plugins.prevPreset(index, slot_index, True)
    else:
        plugin_name = plugins.getPluginName(index, -1, use_global)
        plugins.prevPreset(index, -1, use_global)
    return {"plugin_name": plugin_name}

def handle_plugins_get_color(params):
    index = params.get("index", 0)
    slot_index = params.get("slot_index", -1)
    use_global = params.get("use_global", True)
    if slot_index >= 0:
        color = plugins.getColor(index, slot_index, True)
    else:
        color = plugins.getColor(index, -1, use_global)
    return {"color": hex(color)}

# --- Piano Roll (direct API, no keystroke hack needed) ---

def handle_piano_roll_add_notes(params):
    """Add notes to the piano roll. Uses flpianoroll directly — no keystroke trigger."""
    if not FL_PIANO:
        return {"success": False, "error": "flpianoroll module not available"}
    notes = params.get("notes", [])
    mode = params.get("mode", "add")
    ppq = flp.score.PPQ

    if mode == "replace" or mode == "clear":
        # Clear existing notes
        count = flp.score.noteCount
        for i in range(count - 1, -1, -1):
            flp.score.deleteNote(i)

    added = 0
    for note_data in notes:
        midi_note = flp.Note()
        midi_note.number = note_data.get("midi", note_data.get("number", 60))
        note_time = note_data.get("time", 0)
        midi_note.time = int(ppq * note_time)
        duration = note_data.get("duration", 1.0)
        midi_note.length = int(ppq * duration)
        midi_note.velocity = note_data.get("velocity", 0.8)
        if "pan" in note_data:
            midi_note.pan = note_data["pan"]
        if "color" in note_data:
            midi_note.color = note_data["color"]
        flp.score.addNote(midi_note)
        added += 1

    return {"success": True, "notes_added": added, "mode": mode}

def handle_piano_roll_add_chord(params):
    """Add a chord (multiple notes at same time)."""
    if not FL_PIANO:
        return {"success": False, "error": "flpianoroll module not available"}
    midi_notes = params.get("midi_notes", [])
    time_pos = params.get("time", 0)
    duration = params.get("duration", 1.0)
    velocity = params.get("velocity", 0.8)
    ppq = flp.score.PPQ

    for midi in midi_notes:
        note = flp.Note()
        note.number = midi
        note.time = int(ppq * time_pos)
        note.length = int(ppq * duration)
        note.velocity = velocity
        flp.score.addNote(note)

    note_names = [_midi_to_note_name(n) for n in midi_notes]
    return {"success": True, "notes_added": len(midi_notes), "chord": note_names}

def handle_piano_roll_delete_notes(params):
    """Delete specific notes from the piano roll by MIDI number and time."""
    if not FL_PIANO:
        return {"success": False, "error": "flpianoroll module not available"}
    notes_to_delete = params.get("notes", [])
    ppq = flp.score.PPQ

    # Convert criteria to ticks
    criteria = []
    for nd in notes_to_delete:
        criteria.append({"midi": nd["midi"], "time": int(ppq * nd.get("time", 0))})

    deleted = 0
    for i in range(flp.score.noteCount - 1, -1, -1):
        note = flp.score.getNote(i)
        for c in criteria:
            if note.number == c["midi"] and note.time == c["time"]:
                flp.score.deleteNote(i)
                deleted += 1
                break

    return {"success": True, "notes_deleted": deleted}

def handle_piano_roll_clear(params):
    """Clear all notes from the piano roll."""
    if not FL_PIANO:
        return {"success": False, "error": "flpianoroll module not available"}
    count = flp.score.noteCount
    for i in range(count - 1, -1, -1):
        flp.score.deleteNote(i)
    return {"success": True, "notes_cleared": count}

def handle_piano_roll_get_state(params):
    """Get current piano roll state — all notes with positions."""
    if not FL_PIANO:
        return {"success": False, "error": "flpianoroll module not available"}
    notes_data = []
    ppq = flp.score.PPQ
    for i in range(flp.score.noteCount):
        note = flp.score.getNote(i)
        notes_data.append({
            "number": note.number,
            "midi": note.number,
            "note_name": _midi_to_note_name(note.number),
            "time": note.time / ppq if ppq > 0 else 0,
            "time_ticks": note.time,
            "duration": note.length / ppq if ppq > 0 else 0,
            "length_ticks": note.length,
            "velocity": note.velocity,
            "pan": note.pan,
            "color": note.color,
            "fcut": note.fcut,
            "fres": note.fres,
            "slide": note.slide,
            "porta": note.porta,
            "pitchofs": note.pitchofs,
            "selected": note.selected,
            "muted": note.muted,
        })
    return {"success": True, "ppq": ppq, "noteCount": flp.score.noteCount, "notes": notes_data}

def _midi_to_note_name(midi):
    """Convert MIDI note number to note name (e.g., 60 → 'C4')."""
    note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    return f"{note_names[midi % 12]}{(midi // 12) - 1}"


# ─── Action Dispatch Table ──────────────────────────────────────────────────

ACTION_HANDLERS = {
    # Transport
    "transport.start": handle_transport_start,
    "transport.stop": handle_transport_stop,
    "transport.record": handle_transport_record,
    "transport.getStatus": handle_transport_get_status,
    "transport.setPosition": handle_transport_set_position,
    "transport.getLength": handle_transport_get_length,
    "transport.setLoopMode": handle_transport_set_loop_mode,
    "transport.setPlaybackSpeed": handle_transport_set_playback_speed,
    # Mixer
    "mixer.getTrackCount": handle_mixer_get_track_count,
    "mixer.getTrackInfo": handle_mixer_get_track_info,
    "mixer.getAllTracks": handle_mixer_get_all_tracks,
    "mixer.setTrackVolume": handle_mixer_set_track_volume,
    "mixer.setTrackPan": handle_mixer_set_track_pan,
    "mixer.muteTrack": handle_mixer_mute_track,
    "mixer.soloTrack": handle_mixer_solo_track,
    "mixer.armTrack": handle_mixer_arm_track,
    "mixer.setTrackName": handle_mixer_set_track_name,
    "mixer.setTrackColor": handle_mixer_set_track_color,
    "mixer.setStereoSep": handle_mixer_set_stereo_sep,
    # Channels
    "channels.getCount": handle_channels_get_count,
    "channels.getInfo": handle_channels_get_info,
    "channels.getAll": handle_channels_get_all,
    "channels.getSelected": handle_channels_get_selected,
    "channels.select": handle_channels_select,
    "channels.selectOne": handle_channels_select_one,
    "channels.triggerNote": handle_channels_trigger_note,
    "channels.setVolume": handle_channels_set_volume,
    "channels.setPan": handle_channels_set_pan,
    "channels.mute": handle_channels_mute,
    "channels.solo": handle_channels_solo,
    "channels.setName": handle_channels_set_name,
    "channels.setColor": handle_channels_set_color,
    "channels.routeToMixer": handle_channels_route_to_mixer,
    # Step Sequencer
    "channels.getGridBit": handle_channels_get_grid_bit,
    "channels.setGridBit": handle_channels_set_grid_bit,
    "channels.getStepSequence": handle_channels_get_step_sequence,
    "channels.setStepSequence": handle_channels_set_step_sequence,
    # Plugins
    "plugins.isValid": handle_plugins_is_valid,
    "plugins.getName": handle_plugins_get_name,
    "plugins.getParamCount": handle_plugins_get_param_count,
    "plugins.getParams": handle_plugins_get_params,
    "plugins.getParamValue": handle_plugins_get_param_value,
    "plugins.setParamValue": handle_plugins_set_param_value,
    "plugins.getPresetCount": handle_plugins_get_preset_count,
    "plugins.nextPreset": handle_plugins_next_preset,
    "plugins.prevPreset": handle_plugins_prev_preset,
    "plugins.getColor": handle_plugins_get_color,
    # Piano Roll
    "piano_roll.addNotes": handle_piano_roll_add_notes,
    "piano_roll.addChord": handle_piano_roll_add_chord,
    "piano_roll.deleteNotes": handle_piano_roll_delete_notes,
    "piano_roll.clear": handle_piano_roll_clear,
    "piano_roll.getState": handle_piano_roll_get_state,
}


# ─── Command Router ──────────────────────────────────────────────────────────

def execute_command(command):
    """Route a command to the appropriate handler.

    Supports two formats:
    1. Structured action: {"action": "transport.start", "params": {...}}
    2. Generic API call: {"module": "transport", "function": "start", "args": []}
    """
    if not FL_API:
        return {"success": False, "error": "FL Studio API not available"}

    # Structured action format (karl-andres style)
    action = command.get("action")
    if action and action in ACTION_HANDLERS:
        try:
            params = command.get("params", {})
            result = ACTION_HANDLERS[action](params)
            return {"success": True, "result": result}
        except Exception as e:
            return {"success": False, "error": f"{type(e).__name__}: {str(e)}"}

    # Generic module.function(args) format
    if "module" in command and "function" in command:
        return execute_generic(command)

    return {"success": False, "error": f"Unknown command format. Use 'action' or 'module'+'function'. Available actions: {list(ACTION_HANDLERS.keys())}"}


# ─── TCP Server ──────────────────────────────────────────────────────────────

def handle_client(client_socket, address):
    """Handle a single TCP client connection."""
    buffer = ""
    try:
        while True:
            data = client_socket.recv(BUFFER_SIZE)
            if not data:
                break
            buffer += data.decode("utf-8", errors="replace")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    command = json.loads(line)
                    result = execute_command(command)
                except json.JSONDecodeError as e:
                    result = {"success": False, "error": f"Invalid JSON: {str(e)}"}
                except Exception as e:
                    result = {"success": False, "error": f"{type(e).__name__}: {str(e)}"}
                response = json.dumps(result, default=str) + "\n"
                client_socket.sendall(response.encode("utf-8"))
    except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
        pass
    except Exception:
        pass
    finally:
        try:
            client_socket.close()
        except Exception:
            pass


def start_server():
    """Start the TCP server."""
    global _server_socket, _running
    if _running:
        return
    _running = True

    def _serve():
        global _server_socket
        try:
            _server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            _server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            _server_socket.bind((HOST, PORT))
            _server_socket.listen(5)
            _server_socket.settimeout(1.0)
            while _running:
                try:
                    client, addr = _server_socket.accept()
                    client.settimeout(30.0)
                    thread = threading.Thread(target=handle_client, args=(client, addr), daemon=True)
                    thread.start()
                except socket.timeout:
                    continue
                except OSError:
                    break
        except Exception as e:
            print(f"[Tekton FL Bridge] Server error: {e}")

    thread = threading.Thread(target=_serve, daemon=True)
    thread.start()


def stop_server():
    """Stop the TCP server."""
    global _server_socket, _running
    _running = False
    if _server_socket:
        try:
            _server_socket.close()
        except Exception:
            pass
        _server_socket = None


# ─── FL Studio Script Hooks ─────────────────────────────────────────────────

def OnInit():
    """Called when the script is loaded in FL Studio."""
    start_server()
    msg = f"Tekton FL Studio Bridge v2.0 — {len(ACTION_HANDLERS)} commands — TCP {HOST}:{PORT}"
    if FL_API:
        try:
            ui.setHintMsg(msg)
        except Exception:
            pass
    print(f"[Tekton] {msg}")


def OnDeInit():
    """Called when the script is unloaded."""
    stop_server()
    print("[Tekton] Bridge stopped")


def OnMidiMsg(event):
    event.handled = False


def OnControlChange(event):
    event.handled = False


def OnNoteOn(event):
    event.handled = False


def OnRefresh(flags):
    pass
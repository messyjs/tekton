# Tekton FL Studio Sidecar

Full DAW control for FL Studio — Transport, Mixer, Channels, Step Sequencer, Plugins, Piano Roll.

Communicates via a **TCP bridge** running inside FL Studio as a MIDI controller script. No virtual MIDI ports, no keystroke hacks, no IAC Driver needed.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────┐     ┌───────────────────────┐
│   Tekton        │     │   FL Studio Sidecar          │     │   FL Studio Bridge    │
│   CLI / LLM     │────▶│   (FastAPI :7704 / MCP)      │────▶│   (TCP :7705)          │
│                 │     │                              │     │   Runs INSIDE FL      │
└─────────────────┘     └──────────────────────────────┘     └───────────────────────┘
                                                               Direct FL Studio API:
                                                               channels, mixer, transport,
                                                               plugins, flpianoroll
```

**Why TCP, not MIDI+JSON like other FL MCP servers?**

| Feature | Our TCP Bridge | karl-andres (MIDI+JSON) | calvinw (JSON+Keystroke) |
|---------|---------------|------------------------|--------------------------|
| Virtual MIDI port | ❌ Not needed | ✅ Required (IAC/loopMIDI) | ❌ Not needed |
| Keystroke hack | ❌ Not needed | ❌ Not needed* | ✅ Required (Cmd+Opt+Y) |
| Accessibility perms | ❌ Not needed | ❌ Not needed | ✅ Required (macOS) |
| Piano Roll | ✅ Direct API | ✅ Keystroke trigger | ✅ Keystroke trigger |
| Step Sequencer | ✅ Direct API | ✅ Direct API | ❌ Not supported |
| Plugin Presets | ✅ Navigate/preset | ✅ Navigate/preset | ❌ Not supported |
| Response latency | ~10ms TCP | ~50ms MIDI+poll | ~2s keystroke delay |
| Bidirectional | ✅ TCP response | ✅ JSON file poll | ✅ JSON file poll |

*\*Piano roll still uses keystroke trigger in karl-andres; transport/mixer/channels use MIDI*

## Installation

### 1. Install the Python package

```bash
cd packages/flstudio-service
pip install -e .
```

### 2. Install the bridge script in FL Studio

Copy the bridge script to FL Studio's Hardware scripts folder:

**Windows:**
```
copy bridge\tekton_flstudio_bridge.py "%USERPROFILE%\Documents\Image-Line\FL Studio\Settings\Hardware\"
```

**macOS:**
```bash
cp bridge/tekton_flstudio_bridge.py ~/Documents/Image-Line/FL\ Studio/Settings/Hardware/
```

### 3. Enable in FL Studio

1. Open FL Studio
2. Go to **Options → MIDI Settings**
3. Under **Input**, find and select the **Tekton FL Studio Bridge** controller
4. The bridge starts a TCP server on port 7705 automatically

### 4. Start the sidecar

```bash
# HTTP API mode
tekton-flstudio --mode http --port 7704

# MCP stdio mode (for AI assistants)
tekton-flstudio --mode mcp
```

## Usage

### CLI Commands (from Tekton Agent)

```
/tekton:flstudio status              — Check connection
/tekton:flstudio play                — Start playback
/tekton:flstudio stop                — Stop playback
/tekton:flstudio tempo 140           — Set tempo to 140 BPM
/tekton:flstudio channels            — List all channels
/tekton:flstudio tracks              — List mixer tracks
```

### HTTP API Examples

```bash
# Transport
curl http://localhost:7704/transport                          # Get status
curl -X POST http://localhost:7704/transport -d '{"action":"play"}'
curl -X POST http://localhost:7704/transport -d '{"action":"set_tempo","tempo":140}'

# Mixer
curl http://localhost:7704/mixer                               # All tracks
curl http://localhost:7704/mixer/3                              # Track 3 info
curl -X PATCH http://localhost:7704/mixer/3 -d '{"volume":0.8}'

# Channels
curl http://localhost:7704/channels                             # All channels
curl -X PATCH http://localhost:7704/channels/0 -d '{"name":"Kick","volume":0.9}'

# Step Sequencer
curl http://localhost:7704/channels/0/steps                     # Get pattern
curl -X PUT http://localhost:7704/channels/0/steps -d '{"pattern":[true,false,false,false,true,false,false,false]}'

# Plugins
curl http://localhost:7704/plugins/0/params                     # List params
curl -X PATCH http://localhost:7704/plugins/0/params/5 -d '{"value":0.73}'

# Piano Roll
curl http://localhost:7704/piano_roll                           # Get all notes
curl -X POST http://localhost:7704/piano_roll -d '{
  "action": "add_notes",
  "notes": [
    {"midi": 60, "time": 0, "duration": 1.0, "velocity": 0.8},
    {"midi": 64, "time": 0, "duration": 1.0, "velocity": 0.8},
    {"midi": 67, "time": 0, "duration": 1.0, "velocity": 0.8}
  ]
}'

# Chords
curl -X POST http://localhost:7704/piano_roll/add_chord -d '{
  "midi_notes": [60, 64, 67],
  "time": 0,
  "duration": 2.0
}'

# Raw API calls
curl -X POST http://localhost:7704/execute -d '{"module":"general","function":"getVersion","args":[]}'
curl -X POST http://localhost:7704/action -d '{"action":"channels.getAll"}'
```

### MCP Tools (40+ tools)

When running in MCP mode, the following tools are available:

**Transport:** `flstudio_play`, `flstudio_stop`, `flstudio_record`, `flstudio_get_status`, `flstudio_set_tempo`, `flstudio_set_position`, `flstudio_set_loop_mode`, `flstudio_set_playback_speed`, `flstudio_get_song_length`

**Mixer:** `flstudio_get_mixer_tracks`, `flstudio_set_track_volume`, `flstudio_set_track_pan`, `flstudio_mute_track`, `flstudio_solo_track`

**Channels:** `flstudio_get_channels`, `flstudio_get_channel_info`, `flstudio_trigger_note`, `flstudio_set_channel_volume`, `flstudio_set_channel_pan`, `flstudio_mute_channel`, `flstudio_set_channel_name`, `flstudio_route_channel`

**Step Sequencer:** `flstudio_set_step_sequence`, `flstudio_get_step_sequence`

**Plugins:** `flstudio_get_plugin_params`, `flstudio_set_plugin_param`, `flstudio_next_preset`, `flstudio_prev_preset`

**Piano Roll:** `flstudio_add_notes`, `flstudio_add_chord`, `flstudio_delete_notes`, `flstudio_clear_piano_roll`, `flstudio_get_piano_roll`

**Raw API:** `flstudio_execute` (call any FL Studio API function)

## Command Formats

The bridge supports two command formats over TCP:

**Structured action (karl-andres style):**
```json
{"action": "mixer.setTrackVolume", "params": {"track": 0, "volume": 0.8}}
```

**Generic API call:**
```json
{"module": "mixer", "function": "setTrackVolume", "args": [0, 0.8]}
```

Both return: `{"success": true, "result": {...}}` or `{"success": false, "error": "..."}`

## Credits

- TCP bridge approach inspired by our own architecture
- Structured action handlers ported from [karl-andres/fl-studio-mcp](https://github.com/karl-andres/fl-studio-mcp) (MIT License)
- Piano roll integration approach from [calvinw/fl-studio-mcp](https://github.com/calvinw/fl-studio-mcp) (MIT License)
- Key improvement: we use direct `flpianoroll` API calls over TCP instead of keystroke triggers

## License

MIT
# Tekton FL Studio Sidecar

Control [FL Studio](https://www.image-line.com/fl-studio/) from Tekton Agent via a TCP bridge. Write melodies, shape synth patches, automate parameters — all from a single HTTP API.

## How It Works

Two-part system:

1. **Bridge script** runs inside FL Studio as a MIDI Controller Script (TCP server on port 7705)
2. **Sidecar** is a FastAPI server (port 7704) that Tekton talks to

## Installation

1. Install sidecar: `pip install -e .`
2. Copy `bridge/tekton_flstudio_bridge.py` to FL Studio's `Settings/Hardware/` folder
3. Enable in FL Studio: `Options → MIDI Settings → Controller type → "Tekton FL Studio Bridge"`

## Running

```bash
tekton-flstudio --mode http --port 7704   # HTTP API server
tekton-flstudio --mode mcp                # stdio MCP server
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | FL Studio bridge connection status |
| `/transport` | GET/POST | Play/stop/record/tempo/position |
| `/channels` | GET | Channel Rack channels |
| `/channels/{id}` | PATCH | Volume/pan/mute/solo/name |
| `/mixer` | GET | Mixer tracks |
| `/plugins/{id}/params` | GET | Plugin parameters (knobs!) |
| `/plugins/{id}/params/{pid}` | PATCH | Set a plugin parameter |
| `/piano_roll` | POST | Write notes (melodies!) |
| `/execute` | POST | Raw FL Studio API command |

## Writing Melodies

```json
POST /piano_roll
{
  "action": "add_notes",
  "notes": [
    {"number": 60, "time": 0, "length": 480, "velocity": 0.8},
    {"number": 64, "time": 480, "length": 480, "velocity": 0.7},
    {"number": 67, "time": 960, "length": 480, "velocity": 0.6}
  ]
}
```

## Credits

- [FL-Studio-API-Stubs](https://github.com/IL-Group/FL-Studio-API-Stubs) — Official FL Studio Python API (63 ⭐)
- [PyFLP](https://github.com/demberto/PyFLP) — FL Studio project file parser (188 ⭐)
- [Flapi](https://github.com/MaddyGuthridge/Flapi) — Inspiration for TCP bridge approach (43 ⭐)

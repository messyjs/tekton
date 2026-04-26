# Tekton Ableton Sidecar

Control [Ableton Live](https://www.ableton.com/en/live/) via [AbletonOSC](https://github.com/ideoforms/AbletonOSC) (730 ⭐).

## Prerequisites

1. Install AbletonOSC inside Ableton Live (copy to Remote Scripts, enable in MIDI settings)
2. Install this sidecar: `pip install -e .`

## Running

```bash
tekton-ableton --mode http --port 7703   # HTTP API server
tekton-ableton --mode mcp                # stdio MCP server
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Ableton connection status |
| `/transport` | GET/POST | Play/stop/record/tempo |
| `/tracks` | GET | List all tracks |
| `/tracks/{id}` | GET/PATCH | Track volume/pan/mute/solo |
| `/scenes` | GET | List scenes |
| `/scenes/{id}/fire` | POST | Fire a scene |
| `/live` | POST | Raw OSC passthrough |

## Credits

- [AbletonOSC](https://github.com/ideoforms/AbletonOSC) — OSC interface for Ableton Live (MIT License)

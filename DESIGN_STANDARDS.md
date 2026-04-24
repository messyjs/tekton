# Global Design Standards — All Tekton Projects

## Mandatory for every app / software we build

### 1. No Emojis
- Zero emojis in UI, labels, nav items, titles, icons, buttons
- Use SVG icons, Material Icons, or plain text instead
- Applies to: mobile apps, web SPAs, CLI output, log messages, docs
- Exception: user-generated content (chat messages from the user)

### 2. Dark Mode Default
- Dark mode is the default theme, not light mode
- Theme follows: dark background (#0f172a or similar), light text (#e2e8f0)
- Map tiles must also be dark (CartoDB Dark Matter, not OpenStreetMap default)
- User can switch to light mode if desired
- Applies to: Flutter apps, web SPAs, dashboards, terminals

### 3. Local AI Model Support
- Every app that has chat/AI must support local model inference
- Required features:
  - Built-in model catalog with download capability
  - Custom GGUF URL import (user provides a URL)
  - Custom API endpoint (user points to their own server)
  - Per-model configurable system prompt ("jailbreak" / personality)
  - Inference params: temperature, top_p, top_k, context length, threads
  - On/off toggle for the local API server
  - Server binds to localhost (127.0.0.1) by default, 0.0.0.0 opt-in
  - OpenAI-compatible API on configurable port
  - Live tokens/sec + download progress display

### Projects This Applies To
| Project | Location | Status |
|---------|----------|--------|
| Tekton Mobile (Flutter) | `mobile/` | Dark mode exists (system), no emoji audit needed, local AI partial |
| Tekton TypeScript Monorepo | `packages/` | CLI/dashboard — needs emoji audit |
| AgentPilot | `packages/agentpilot/` | SPA has emojis, light map tiles, no local AI |

### Files
- `mobile/TASKS.md` — Tekton mobile feature gap
- `packages/agentpilot/TASKS.md` — AgentPilot feature gap
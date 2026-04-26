# Tekton Browser Use Sidecar

AI-powered web browsing agent for Tekton, built on [browser-use](https://github.com/browser-use/browser-use) (90k+ ⭐).

Submit complex web tasks and the agent handles the entire workflow autonomously — navigating, clicking, typing, extracting data — with self-healing when sites change.

## Installation

```bash
pip install -e .
browser-use install
```

## Running

```bash
tekton-browser-use --mode http --port 7702   # HTTP API server
tekton-browser-use --mode mcp                # stdio MCP server
```

## API Endpoints (HTTP mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service status and browser availability |
| `/task` | POST | Submit a web browsing task |
| `/task/{task_id}` | GET | Check task status and get result |
| `/cancel` | POST | Cancel a running task |
| `/screenshot` | GET | Capture current browser state |

## Credits

- [browser-use](https://github.com/browser-use/browser-use) — The core browser automation agent (MIT License, 90k+ ⭐)

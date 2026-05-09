# Tekton Agent Context

This file describes the Tekton Agent codebase for AI coding agents.

## Three Pillars + Swarm

Tekton Agent is built on three pillars plus a multi-agent control plane:

1. **PI Agent** (`@tekton/core/src/pi/`) — Trading intelligence (Gann, Fib, GLM). Built-in, not sidecar.
2. **Hermes** (`@tekton/hermes-bridge/`) — Learning loop (SkillManager, Evaluator, ContextHygiene).
3. **OpenMythos** (`@tekton/core/src/models/`) — Model routing (ModelRouter, RulesEngine).
4. **Swarm** (`@tekton/core/src/swarm/`) — Multi-agent orchestration (Roster, Dispatcher, Checkpoints, Greenlight Gate).

## Project Structure
- Monorepo with npm workspaces
- Build: `npm run build` | Test: `npm test` (or `npx vitest run`)
- TypeScript ESM modules with strict mode
- `@sinclair/typebox` for schema validation
- `better-sqlite3` for persistence
- `vitest` for testing

## Packages
| Package | Exports | Purpose |
|---------|---------|---------|
| `@tekton/core` | SCP, compress, ModelRouter, MemoryManager, SoulManager, AgentPool, **PiAgent**, **SwarmRoster**, **SwarmDispatcher**, **AppDriver** | Foundation + PI Agent + Swarm + App Driver |
| `@tekton/hermes-bridge` | HermesBridge, SkillManager, Learner, ContextHygiene | Learning (ON by default) |
| `@tekton/tools` | ToolRegistry, filesystem/shell/browser/git/code/fetch/messaging/tts/**pi** | Execution + PI Tools |
| `@tekton/cli` | CommandRegistry, 23+ commands | Terminal interface |
| `@tekton/gateway` | GatewayRunner, SessionStore, 10 adapters | Messaging |
| `@tekton/voice` | VoiceManager, STTManager, TTSManager, AudioRecorder | Voice I/O |
| `@tekton/dashboard` | DashboardServer, DashboardAPI, generateDashboardHTML | Web UI |
| `@tekton/ml-ops` | Orchestrator, GPUMonitor, CheckpointManager, MetricsTracker | Training |
| `@tekton/docling-service` | DoclingService, document parsing sidecar | Document Intelligence |
| `@tekton/pi-agent-service` | PiAgentService, HTTP sidecar (optional) | Trading Intelligence HTTP API (for external consumers) |
| `@tekton/forge` | ForgeRuntime, Director, Scribe | [Optional] Product Engineering |

## Key Patterns
- All packages use `index.ts` barrel exports
- Tests in `tests/` directory (root or per-package)
- `vitest.config.ts` has aliases for all packages
- CLI commands register via `CommandRegistry`
- Learning is ON by default (`--no-learning` to pause)
- No external SDK deps for adapters — raw HTTP/WebSocket APIs

## Testing
- 624 tests across 36 test files
- Integration tests in `tests/integration/`
- Per-package unit tests in `packages/*/tests/`

## Configuration
- `~/.tekton/config.yaml` — Main config
- `configs/gateway.json` — Gateway config
- `configs/mcp-servers.json` — MCP server configs (PI Agent, Docling, Ableton, FL Studio)
- `~/.tekton/skills/` — Extracted skills directory
- `~/.tekton/memory/` — Persistent memory
- Test config via `loadConfig()` from `@tekton/core`

## Service Sidecars
| Port | Service | Transport | Description |
|------|---------|------------|-------------|
| 7701 | tekton-docling | HTTP + MCP | Document parsing, OCR, chunking |
| 7702 | browser-use | HTTP | AI web browsing agent |
| 7703 | tekton-ableton | HTTP + MCP | Ableton Live DAW control via OSC |
| 7704 | tekton-flstudio | HTTP + MCP | FL Studio DAW control via TCP bridge |
| 7706 | tekton-pi-agent | HTTP + MCP | Gann, Fibonacci, GLM, TradingView |
| 7700 | tekton-dashboard | HTTP | Web dashboard (REST API) |
| 7701 | dashboard-ws | WebSocket | Dashboard real-time events |

## App Driver Toolset
Unified control interface for external apps. Supports:
- TradingView (via CDP + PI Agent service)
- Ableton Live (via AbletonOSC sidecar)
- FL Studio (via TCP bridge sidecar)
- PI Agent (Gann, Fib, GLM trading intelligence)
- Docling (document parsing)

Tools: app_discover, app_status, app_control, app_watch, app_learn

## Swarm Orchestration

Swarm is built into `@tekton/core/src/swarm/` — the multi-agent control plane:

- **SwarmRosterManager** — loads workers from config (swarm.yaml), manages lifecycle (spawn/idle/busy/blocked/killed), finds best worker for role/task type
- **SwarmDispatcher** — decomposes user intent into SwarmBriefs, routes to workers by role, receives checkpoints, handles escalation
- **SwarmCheckpointValidator** — validates proof-bearing checkpoints (RequireProof, RequireBlockerDetail, NotAdjectives rules)
- **Greenlight Gate** — actions like `git_push_force`, `npm_publish`, `pr_merge` require human approval

API Endpoints: GET/POST /api/swarm/* (roster, runtime, health, missions, briefs, checkpoints, dispatch)
Dashboard: Conductor page shows live worker grid, dispatch bar, mission list, state colors

Pattern: Workers return checkpoints with evidence. Bad checkpoints contain adjectives. Good checkpoints contain commands, file paths, test results.
PI Agent is one of the **three pillars** of Tekton Agent (PI + Hermes + OpenMythos).
PI Agent runs **in-process** — no separate sidecar needed:
- `@tekton/core` → `PiAgent` class + `defaultPiAgent` singleton (always available)
- `@tekton/tools` → 13 PI tools registered directly: pi_gann_analyze, pi_fib_analyze, pi_trade_signal, etc.
- CLI: `/tekton:pi signal|gann|fib|quote|positions|glm|trade|close` — works without starting anything
- Optional HTTP sidecar: `/tekton:pi http-start` → http://localhost:7706 (for external bots/consumers)

Pattern: PI Agent ≠ Ableton sidecar. Ableton/FL Studio are **external apps** that need sidecars. PI Agent's engines are **pure JS math** that runs in-process, just like ModelRouter and SkillManager.
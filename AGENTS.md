# Tekton Agent Context

This file describes the Tekton Agent codebase for AI coding agents.

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
| `@tekton/core` | SCP, compress, ModelRouter, MemoryManager, SoulManager, AgentPool | Foundation |
| `@tekton/hermes-bridge` | HermesBridge, SkillManager, Learner, ContextHygiene | Learning (ON by default) |
| `@tekton/tools` | ToolRegistry, filesystem/shell/browser/git/code/fetch/messaging/tts | Execution |
| `@tekton/cli` | CommandRegistry, 23+ commands | Terminal interface |
| `@tekton/gateway` | GatewayRunner, SessionStore, 10 adapters | Messaging |
| `@tekton/voice` | VoiceManager, STTManager, TTSManager, AudioRecorder | Voice I/O |
| `@tekton/dashboard` | DashboardServer, DashboardAPI, generateDashboardHTML | Web UI |
| `@tekton/ml-ops` | Orchestrator, GPUMonitor, CheckpointManager, MetricsTracker | Training |
| `@tekton/docling-service` | DoclingService, document parsing sidecar | Document Intelligence |
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
- `~/.tekton/skills/` — Extracted skills directory
- `~/.tekton/memory/` — Persistent memory
- Test config via `loadConfig()` from `@tekton/core`
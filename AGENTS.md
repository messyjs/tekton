# Tekton Agent Context

This file describes the Tekton codebase for AI coding agents.

## Project Structure
- Monorepo at `C:/Users/Massi/pi-agent/tekton/` with 8 workspace packages
- Build: `npm run build` | Test: `npm test` (or `npx vitest run`)
- TypeScript ESM modules with strict mode
- `@sinclair/typebox` for schema validation
- `better-sqlite3` for persistence
- `vitest` for testing

## Packages
| Package | Exports | Purpose |
|---------|---------|---------|
| `@tekton/core` | SCP, compress, ModelRouter, MemoryManager, SoulManager, AgentPool | Foundation |
| `@tekton/hermes-bridge` | HermesBridge, SkillManager, Learner, ContextHygiene | Learning |
| `@tekton/tools` | ToolRegistry, filesystem/shell/browser/git/code/fetch/messaging/tts | Execution |
| `@tekton/cli` | CommandRegistry, 22+ commands | Terminal |
| `@tekton/gateway` | GatewayRunner, SessionStore, 10 adapters | Messaging |
| `@tekton/voice` | VoiceManager, STTManager, TTSManager, AudioRecorder | Voice |
| `@tekton/dashboard` | DashboardServer, DashboardAPI, generateDashboardHTML | Web UI |
| `@tekton/ml-ops` | Orchestrator, GPUMonitor, CheckpointManager, MetricsTracker | Training |

## Key Patterns
- All packages use `index.ts` barrel exports
- Tests in `tests/` directory (root or per-package)
- `vitest.config.ts` has aliases for all packages
- CLI commands register via `CommandRegistry`
- No external SDK deps for adapters — raw HTTP/WebSocket APIs

## Testing
- 624 tests across 36 test files
- Integration tests in `tests/integration/`
- Per-package unit tests in `packages/*/tests/`

## Configuration
- `~/.tekton/config.yaml` — Main config
- `configs/gateway.json` — Gateway config
- Test config via `loadConfig()` from `@tekton/core`
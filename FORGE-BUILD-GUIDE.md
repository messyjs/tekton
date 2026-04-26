# FORGE-BUILD-GUIDE — Forge Product Engineering

**Forge is an optional package.** Build with `npm run build:forge` or enable during `npm run setup`.

## What Changed

### Step 1: Agent LLM Bridge (`packages/core/src/agents/agent-llm-bridge.ts`)
- New `AgentLLMBridge` class that connects `AgentSession` to real LLM API calls
- Multi-turn execution loop: LLM call → tool execution → LLM call → ... until final text response
- `ToolExecutor` interface (decouples core from tools package)
- Tool filtering by toolset names
- `onMessage` callback for session observation (Scribe)
- `_callLLMOverride` test hook for mocking LLM responses
- Fallback chain support for LLM API failures

### Step 2: Wire AgentSession (`packages/core/src/agents/session.ts`)
- Constructor now accepts optional `AgentLLMBridge` — real execution when provided
- `runDelegatedTask()` uses bridge for multi-turn LLM+tool loops
- `runSimulatedTask()` preserved as fallback (backward compat)
- New `messageCount` property — tracks LLM turns per session
- New `onMessage(callback)` method — session observation, returns unsubscribe fn
- SCP `result` message emitted on success, `error` message on failure

### Step 3: Wire AgentPool (`packages/core/src/agents/pool.ts`)
- Constructor now accepts optional `ModelRouter` and `ToolExecutor`
- `spawn()` creates `AgentLLMBridge` and injects into `AgentSession`
- Tasks execute through real LLM when model router is configured
- Falls back to simulation mode when no router provided

### Step 4: Wire delegate_task Tool (`packages/tools/src/toolsets/delegation/delegation.ts`)
- Replaced stub with real `AgentPool` integration
- `delegateTaskTool.execute()` submits tasks to pool, polls for results
- Supports parallel and sequential modes (sequential adds dependencies)
- `setGlobalPool()` / `getGlobalPool()` for runtime initialization
- `ToolContext.agentPool` for passing pool through context
- Error message when no pool available (minimal mode)

### Step 5: Integration Test (`tests/integration/agent-execution.test.ts`)
- End-to-end: AgentPool → AgentSession → AgentLLMBridge → ToolExecutor → filesystem
- Verifies file creation through full agent chain
- Verifies delegate_task tool integration
- Verifies messageCount tracking

### Step 6: Updated Exports and Factory
- `AgentLLMBridge` + types exported from `@tekton/core`
- `ToolExecutor` interface exported from `@tekton/core`
- `setGlobalPool` / `getGlobalPool` exported from `@tekton/tools`
- `ToolContext` updated with optional `agentPool` field
- `TaskDefinition` now has optional `metadata` field
- `TektonRuntime` factory injects `ModelRouter` into `AgentPool`
- Global pool set via `setGlobalPool(agentPool)` at startup

## New Test Files
| File | Tests | Purpose |
|------|-------|---------|
| `tests/core/agents/agent-llm-bridge.test.ts` | 10 | Bridge execution loop |
| `tests/core/agents/agent-session-wired.test.ts` | 9 | Session with real bridge |
| `tests/core/agents/agent-pool-wired.test.ts` | 6 | Pool with real execution |
| `packages/tools/tests/delegation/delegation.test.ts` | 7 | delegate_task tool |
| `tests/integration/agent-execution.test.ts` | 3 | End-to-end chain |

## Verification Checklist
- [x] AgentLLMBridge executes multi-turn LLM+tool loops
- [x] AgentSession.runDelegatedTask() makes real LLM calls
- [x] AgentPool spawns agents with real execution capability
- [x] delegate_task tool works end-to-end
- [x] messageCount tracked per session
- [x] onMessage callback works for session observation
- [x] All existing 652 tests still pass
- [x] New tests pass (total: 687)
- [x] `@tekton/core` and `@tekton/tools` compile clean
# PI Agent — Tekton Integration Build Plan

## Architecture: Three Pillars of Tekton Agent

```
Tekton Agent = PI + Hermes + OpenMythos
                ↑       ↑        ↑
           Trading   Learning   Model
           Intel     Loop      Routing
```

- **OpenMythos** → `@tekton/core/src/models/` (ModelRouter, RulesEngine) ✅
- **Hermes** → `@tekton/hermes-bridge` (SkillManager, Evaluator, Learner) ✅
- **PI Agent** → `@tekton/core/src/pi/` (PiAgent class, defaultPiAgent singleton) ✅

**Key principle**: PI Agent runs **in-process** like ModelRouter and SkillManager.
It is NOT a sidecar like Ableton/FL Studio — those control external apps.
PI Agent's engines are pure JS math that run inside Tekton's Node.js process.

## ✅ COMPLETED

### Core Pillars
- [x] PI Agent built-in module (@tekton/core/src/pi/)
- [x] Swarm system (@tekton/core/src/swarm/)
- [x] App Driver Protocol (@tekton/core/src/app-driver/)
- [x] Real MCP Client (@tekton/tools/src/toolsets/mcp/)
- [x] Dashboard WebSocket & API

### App Driver Protocol Layers (Priority Order)
- [x] **MIDI** — Synth/plugin control (CC, NRPN, Note, Patch)
  - Full CC/NRPN/NoteOn/Off/ProgramChange/PitchBend API
  - MASSIVE_CC_MAP, SERUM_CC_MAP, FM8_CC_MAP, SYLENTH1_CC_MAP
  - Rhodes patch programmed: 12/12 CC values sent successfully
  - 4 hardware MIDI ports detected: Maschine Plus, nanoKEY2, C1-xMP1, Maschine Plus MIDI
- [x] **OSC (Real UDP)** — DAW control (Ableton, FL Studio, Reaper)
  - Proper OSC encoding (address pattern + type tags + arguments)
  - Ableton Live address map (/live/play, /live/tempo, etc.)
  - FL Studio and Reaper address maps
- [x] **CDP** — Chromium/Electron apps (TradingView, Chrome)
- [x] **UIAutomation** — Native Win32 apps (OBS, Windows dialogs)
- [x] **Hotkeys** — Universal keyboard shortcut fallback
- [x] **Screenshot** — Visual fallback

### App Driver Tools (12 tools)
- [x] app_discover, app_connect, app_control, app_surface, app_screenshot, app_learn, app_shortcut, app_type
- [x] app_send_note (MIDI Note On/Off with duration)
- [x] app_send_cc (MIDI CC by name or number, percentage support)
- [x] app_send_patch (Multiple CC values at once for synth patches)
- [x] app_send_osc (Real OSC messages to DAWs)

### Known App Patterns
- [x] TradingView → CDP (:9222)
- [x] Massive / Massive X → MIDI (CC map)
- [x] Serum → MIDI (CC map)
- [x] FM8 → MIDI (CC map)
- [x] Sylenth1 → MIDI (CC map)
- [x] Ableton Live → OSC (:7703)
- [x] FL Studio → OSC (:7704)
- [x] Reaper → OSC (:7001)
- [x] VS Code → CDP
- [x] Chrome → CDP
- [x] Discord → CDP
- [x] OBS → UIA
- [x] Figma → CDP
- [x] Spotify → CDP

### Phase 1: PI Agent as Core Module ⚡ DONE
- [x] `@tekton/core/src/pi/pi-agent.ts` — PiAgent class with 20+ methods
- [x] `@tekton/core/src/pi/index.ts` — Barrel exports
- [x] Exported from `@tekton/core/src/index.ts` as `PiAgent`, `defaultPiAgent`
- [x] Available immediately when Tekton starts — no sidecar, no start command
- [x] Fixed engine script paths: `run_gann_v2.js` (not `gann_engine_v2.js`)
- [x] Fixed fibAnalyze to use `master_bridge.js` (fibonacci_engine.js is ES module only)
- [x] tradeSignal passes `--swings` arg for proper Gann+Fib integration

### Phase 2: PI Agent Tools (in-process) ⚡ DONE
- [x] `@tekton/tools/src/toolsets/pi/index.ts` — 13 tools
- [x] Tools call defaultPiAgent directly — no HTTP, no fetch, no sidecar
- [x] Tools: pi_gann_analyze, pi_gann_levels, pi_gann_planetary, pi_gann_range,
       pi_fib_analyze, pi_trade_signal, pi_glm_ask, pi_quote, pi_data,
       pi_execute_trade, pi_positions, pi_trade_history, pi_status
- [x] Registered in @tekton/tools index.ts with `registerAllTools()`

### Phase 3: CLI Command (in-process) ⚡ DONE
- [x] `/tekton:pi` command calls defaultPiAgent directly
- [x] Subcommands: status, signal, gann, fib, quote, positions, history, glm, trade, close
- [x] `http-start` / `http-stop` — optional sidecar for external consumers only

### Phase 4: Supporting Systems ⚡ DONE
- [x] Real MCP Client (`@tekton/tools/src/toolsets/mcp/mcp-real.ts`) — stdio transport
- [x] Dashboard WebSocket (`@tekton/dashboard/src/server/ws.ts`) — live events
- [x] Conductor UI (`@tekton/dashboard/src/server/conductor.ts`) — agent grid
- [x] App Driver (`@tekton/tools/src/toolsets/app-driver/index.ts`) — unified app control
- [x] Agent pool API endpoints in dashboard

### Phase 5: HTTP Sidecar (optional) ⚡ DONE
- [x] `@tekton/pi-agent-service` — HTTP :7706 + MCP stdio (for external consumers)
- [x] Optional — NOT the primary interface
- [x] Started via `/tekton:pi http-start` only when external bots need it
- [x] Convenience script: `npm run pi-agent`

### Phase 6: Cleanup & Testing ⚡ DONE
- [x] Removed old `mcp.ts` stubs (replaced by `mcp-real.ts`)
- [x] Cleaned stale compiled `.js` files in tools/src
- [x] Added "pi" toolset to TOOLSET_PRESETS (cli, telegram, discord, trading presets)
- [x] Added "tekton-trading" preset: pi + mcp + web + file + terminal + memory
- [x] 20 unit tests for PiAgent (MockPiAgent subclass pattern)
- [x] All 86 test files pass, 1031 tests total
- [x] Verified real engine calls: gannPlanetary(), gannS9(), tradeSignal() — all return real data
- [x] `npm run pi-agent` convenience script in root package.json

## Full Verification

```
Build:  npm run build       → 10 packages, 0 errors
Tests:  npx vitest run      → 86 files, 1031 tests, 0 failures
E2E:    defaultPiAgent.status() → { enginesAvailable: true, glmAvailable: true }
E2E:    defaultPiAgent.tradeSignal({ BTCUSD }) → BUY, score 98, RR 2.15
```

## The Correct Pattern

```
Sidecar pattern (Ableton, FL Studio, TradingView bot):
  External App → needs its own process → sidecar on port X
  You MUST start it before use → /tekton:ableton start

Built-in pattern (PI Agent, ModelRouter, SkillManager):
  Pure JS math → runs in Tekton's process → always available
  You NEVER need to start it → just call defaultPiAgent.method()
```

### Phase 7: Swarm Orchestration ⚡ DONE
- [x] `@tekton/core/src/swarm/types.ts` — WorkerConfig, SwarmBrief, SwarmCheckpoint, SwarmMission, Dispatch types, Greenlight Gate
- [x] `@tekton/core/src/swarm/roster.ts` — SwarmRosterManager with lifecycle, briefs, events, health
- [x] `@tekton/core/src/swarm/dispatcher.ts` — SwarmDispatcher with decomposition, role routing, checkpoint handling
- [x] `@tekton/core/src/swarm/checkpoints.ts` — CheckpointValidator, built-in rules, approval gate
- [x] Exports in `@tekton/core/src/index.ts`
- [x] 10 swarm API endpoints in dashboard
- [x] Real Conductor UI (worker grid, dispatch bar, mission list)
- [x] 25 unit tests

### Phase 8: Universal App Driver ⚡ DONE
- [x] `@tekton/core/src/app-driver/types.ts` — ProtocolLayer cascade, AppProcess, DiscoveredApp, ControlAction, SurfaceControl, 10 known app patterns
- [x] `@tekton/core/src/app-driver/process-scanner.ts` — scanProcesses(), scanCDPPorts(), scanOSCPorts(), identifyApp(), discoverApps()
- [x] `@tekton/core/src/app-driver/protocol-cdp.ts` — CDPDriver: navigate, click, type, select, screenshot, evaluate, discoverSurface
- [x] `@tekton/core/src/app-driver/protocol-uia.ts` — UIADriver: listWindows, findWindow, focusWindow, getControls, sendShortcut, typeText, clickAt, takeScreenshot
- [x] `@tekton/core/src/app-driver/protocol-hotkey.ts` — toSendKeys(), sendHotkey(), typeTextSlow(), pasteText(), pressKey(), 20+ common shortcuts
- [x] `@tekton/core/src/app-driver/driver.ts` — AppDriver singleton, ConnectedApp, protocol cascade, safety checks, surface learning
- [x] 8 app driver tools (discover, connect, control, surface, screenshot, learn, shortcut, type)
- [x] 32 unit tests

## Remaining Build Phases (Hermes Workspace Port)
- [x] Chat -- SSE streaming, multi-session, slash commands, file attachments (ChatManager with SSE streaming, Ollama/OpenAI streaming, multi-conversation, model switching)
- [x] Terminal -- Full PTY via xterm.js (TerminalManager, node-pty backend, WS + REST API, xterm.js frontend, session management)
- [x] Terminal -- Full PTY via xterm.js (TerminalManager, REST API + WebSocket I/O, xterm.js frontend, session management)
- [x] Files -- Browser + editor (FileManager backend done, SPA file browser + inline editor done; Monaco upgrade future)
- [x] Dashboard SPA -- All 21 pages implemented (Chat, Terminal, Files, Kanban, Swarm, Documents, Models + all existing pages upgraded)
- [x] Kanban Board -- Backlog/Ready/Running/Review/Done lanes (KanbanManager + KanbanPage done)
- [x] Swarm Lifecycle -- Worker process management UI (SwarmPage with workers/missions/briefs views + dispatch)
- [x] Swarm Memory -- Worker profile memory, context carry-over (SwarmMemoryManager with persistence done)
- [x] Swarm Skills -- Worker-specific skill assignments (SwarmSkillManager with recommendations done)
- [x] Auth -- Password, session tokens, CSRF (AuthManager with login/logout/CSRF/middleware done)
- [x] PWA -- Service worker, manifest, install prompts done
- [x] Themes -- Light/dark variants (CSS variables + toggle done)

## Future Enhancements (not urgent)
- [ ] Safety layer — position limits, approval gates for live trades
- [ ] Dashboard PI Agent panel — live engine status + recent signals on status page
- [ ] WebSocket broadcast for PI events (trade signals → dashboard)
- [ ] Better engine error messages — when TV MCP is down, suggest starting it
- [ ] SQLite persistence for positions/trade history instead of in-memory
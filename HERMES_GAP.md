# Hermes Workspace → Tekton Agent Feature Gap Analysis

## What Hermes Workspace Has (560 source files, React+TanStack)

### Frontend Screens (all polished React)
| Screen | Hermes Workspace | Tekton Agent Dashboard | Gap |
|--------|-----------------|----------------------|-----|
| **Chat** | Full SSE streaming, multi-session, slash commands, file attachments, voice input, context meter | Basic ChatPage (stub) | **HUGE** |
| **Conductor** | 2347-line React component: agent grid, quick actions, mission lifecycle, cost tracking, live wires | iframe stub → /conductor endpoint (342 lines server-side) | **HUGE** |
| **Swarm2** | 1713-line screen with kanban, live chat, task queue, reports, artifacts, memory panel, wires visualization | **MISSING** — no UI at all | **MISSING** |
| **Dashboard** | System metrics, model usage, chart visualizations | StatusPage with basic system info | **Medium** |
| **Files** | Full file browser with Monaco Editor, create/read/write/rename/delete | **MISSING** | **MISSING** |
| **Terminal** | Full PTY via xterm.js + Python helper | **MISSING** | **MISSING** |
| **Memory** | Browse/search/edit agent memory files (MEMORY.md, memory/) | MemoryPage (basic) | **Medium** |
| **Skills** | Browse 2000+ skills, marketplace, categories, search | SkillsPage (basic list) | **Medium** |
| **Jobs** | Cron job management, create/edit/delete/pause/resume/trigger | **MISSING** | **MISSING** |
| **Settings** | Provider config, API keys, mode management | ConfigPage (basic) | **Medium** |
| **Profiles/Agents** | Agent hub with cards, status, capabilities | agents API endpoints only | **Medium** |

### Backend Services (Node.js + Python)
| Service | Hermes Workspace | Tekton Agent | Gap |
|---------|-----------------|-------------|-----|
| **Chat SSE** | Full streaming with tool call rendering | ChatPage stub | **HUGE** |
| **Session Store** | Persistent sessions, active run tracking | Basic session tracking | **Medium** |
| **Swarm Orchestrator** | swarm-foundation, swarm-missions, swarm-lifecycle, swarm-checkpoints, swarm-memory, swarm-notifications, swarm-kanban | conductor.ts (342 lines, basic agent pool) | **HUGE** |
| **Swarm Roster** | YAML-based worker config, roles, missions, capabilities | AgentPool with spawn/kill | **Large** |
| **Swarm Dispatch** | Role-based task routing, decompose, persistent tmux workers | delegateTasks (basic) | **HUGE** |
| **Checkpoint System** | STATE/DONE/BLOCKED/NEEDS_INPUT proof-bearing checkpoints | **MISSING** | **MISSING** |
| **Run Store** | Persistent run state, lifecycle events, timeout | **MISSING** | **MISSING** |
| **Terminal** | Python PTY helper, session management, resize, close | **MISSING** | **MISSING** |
| **File Operations** | Full CRUD with path traversal prevention | **MISSING** | **MISSING** |
| **Auth** | Password auth, session tokens, rate limiting, CSRF | **MISSING** | **MISSING** |
| **PWA** | Service worker, install prompts, mobile | **MISSING** | **MISSING** |
| **Sound** | Web Audio API notifications for events | **MISSING** | **MISSING** |
| **OAuth** | Device code flow for provider auth | **MISSING** | **MISSING** |
| **8-Theme** | Official, Classic, Slate, Mono (light+dark each) | Dark theme only | **Medium** |

### What Tekton Agent Already Has That Hermes Doesn't
| Feature | Tekton Agent | Hermes Workspace |
|---------|-------------|-----------------|
| **PI Agent Trading** | Built-in Gann/Fib/GLM engines, 13 tools | None |
| **App Driver Protocol** | Unified control: TradingView, Ableton, FL Studio | None |
| **MCP Client** | Real stdio transport, connection pooling | None |
| **Forge** | Full ideation→review→ship pipeline | Basic job scheduling |
| **ML-Ops** | RL environment training | None |
| **Voice** | TTS/Piper integration | None |
| **Knowledge** | Docling ingestion, vector search | Basic memory browsing |
| **Context Engine** | Automatic context compression | None |

## What We Actually Built (from previous sessions)
- conductor.ts (342 lines) — basic agent pool API, not the full Hermes conductor
- ws.ts (341 lines) — WebSocket server for live updates (Hermes uses SSE)
- Conductor SPA page — just an iframe to /conductor, no React UI
- Agent pool API: GET/POST/DELETE /api/agents — basic CRUD, no roles/missions/checkpoints

## Priority Build Order

### Phase A: Swarm Core (what makes Tekton Agent a multi-agent platform)
1. **Swarm Roster** — YAML-based worker config (roles, capabilities, missions)
2. **Swarm Dispatch** — Role-based task routing with decomposition
3. **Swarm Checkpoints** — Proof-bearing worker output (STATE/FILES_CHANGED/PROOF)
4. **Swarm Lifecycle** — Worker start/stop/health monitoring via tmux/child_process
5. **Conductor UI** — Native React component (not iframe) with agent grid, task queue, live wires

### Phase B: Workspace UX (what makes it usable day-to-day)
6. **Chat** — SSE streaming, multi-session, slash commands, file attachments
7. **Terminal** — Full PTY via xterm.js
8. **Files** — Browser + Monaco Editor
9. **Kanban Board** — Backlog → Ready → Running → Review → Done lanes

### Phase C: Polish & Safety
10. **Auth** — Password, session tokens, CSRF
11. **Checkpoints/Reports** — Inspector panel for swarm output
12. **Sound** — Web Audio API notifications
13. **Themes** — Light/dark variants
14. **PWA** — Service worker, install prompts

## Architecture Decision: Port vs Build From Scratch?

Hermes Workspace uses:
- React 19 + TanStack Start/Router
- Zustand 5 (state)
- Tailwind CSS 4
- Vite 7
- Monaco Editor
- xterm.js
- Shiki for syntax highlighting

Tekton Dashboard uses:
- Server-rendered HTML (h() function, no React)
- Hono (HTTP framework)
- No client-side framework
- Light CSS with inline styles

**Decision**: We should PORT the Hermes Workspace React SPA into Tekton's dashboard, keeping the backend services (Hono API routes) we've already built. The dashboard should serve both the current server-rendered pages AND the new React SPA for conductor/swarm/chat.

This means:
1. Add React + Vite as a build step for the dashboard SPA
2. Port the Conductor, Swarm2, and Chat screens from Hermes
3. Wire them to Tekton's existing API endpoints + new swarm endpoints
4. Keep our existing pages (status, config, etc.) working alongside
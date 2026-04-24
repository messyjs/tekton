# Tekton — Full Project Prompt (Phase 18 Complete)

You are working on **Tekton**, a standalone terminal coding agent. This document is the definitive state-of-everything reference for your next build task.

---

## 1. Project Overview

Tekton is a monorepo at `C:/Users/Massi/pi-agent/tekton/` with **8 npm workspace packages + 1 Python package**. It combines 5 open-source projects (Pi, Hermes, OpenMythos, Caveman, ULR) into a unified agent platform.

**1011 tests passing across 85 test files. TypeScript strict mode throughout.**

---

## 2. Package Map

```
tekton/
├── packages/core/               # Foundation (32+ TS files)
│   └── SCP, Compression, Model Routing, Memory, Identity, Agents, Telemetry, Config, Context Engineer, Knowledge Librarian
├── packages/hermes-bridge/      # Learning loop (7 TS files)
│   └── HermesBridge, SkillManager, Learner, ContextHygiene, UserModel
├── packages/tools/              # Tool execution (39 TS files, 17 toolsets)
│   └── file, terminal, browser, web, vision, image_gen, tts, memory, skills,
│     delegation, orchestration, messaging, cron, homeassistant, mcp, rl,
│     docling-client
├── packages/cli/               # Terminal interface (46 TS files)
│   └── 24 slash commands (incl. forge), modes (interactive, print, rpc, gateway)
├── packages/gateway/           # Multi-platform messaging (21 TS files)
│   └── 10 adapters: telegram, discord, slack, whatsapp, signal, matrix, email, sms, webhook, api-server
├── packages/voice/             # Voice I/O (12 TS files)
│   └── VoiceManager, STT (3 providers), TTS (4 providers), AudioRecorder
├── packages/dashboard/          # Web UI (6 TS files)
│   └── Hono server, REST API (28 endpoints), SPA generator, 12 pages (incl. Forge)
├── packages/ml-ops/            # Training orchestration (10 TS files)
│   └── Orchestrator, GPU Monitor, Config Builder, Checkpoint Manager, Metrics
├── packages/forge/             # Autonomous product engineering (60+ TS files)
│   └── Ideation, Director, Production, Continuity, QA, Preflight, Runtime
└── packages/docling-service/    # Python sidecar (6 Python files)
    └── FastAPI + MCP server, TektonDocConverter, OCR, Chunker, Export, Config
```

---

## 3. Tool Registry (55 tools across 17 toolsets)

| Toolset | Tools |
|---------|-------|
| **file** | read_file, write_file, patch, search_files, list_dir, docling_parse, docling_batch |
| **terminal** | terminal, process |
| **browser** | browser_navigate, browser_snapshot, browser_click, browser_type, browser_press, browser_scroll, browser_back, browser_console, browser_get_images, browser_vision, browser_cdp |
| **web** | web_search, web_extract |
| **vision** | vision_analyze |
| **image_gen** | image_generate |
| **tts** | text_to_speech |
| **memory** | memory, session_search |
| **skills** | skills_list, skill_view, skill_manage |
| **delegation** | delegate_task |
| **orchestration** | todo, clarify, execute_code, mixture_of_agents |
| **messaging** | send_message |
| **cron** | cronjob |
| **homeassistant** | ha_list_entities, ha_get_state, ha_call_service, ha_list_services |
| **mcp** | mcp_discover, mcp_call, mcp_list_servers |
| **rl** | rl_list_environments, rl_select_environment, rl_get_current_config, rl_edit_config, rl_start_training, rl_stop_training, rl_check_status, rl_list_runs, rl_get_results, rl_test_inference |
| **docling-client** | docling_parse, docling_batch, docling_chunk, docling_ocr |

---

## 4. CLI Commands (23)

```
/tekton            /tekton:status     /tekton:on       /tekton:off
/tekton:dashboard  /tekton:route      /tekton:models   /tekton:skills
/tekton:compress   /tekton:tokens     /tekton:memory   /tekton:agents
/tekton:config     /tekton:learn      /tekton:train    /tekton:gpu
/tekton:cron       /tekton:voice      /tekton:personality  /tekton:soul
/tekton:help       /tekton:gateway    /tekton:docling
/tekton:context   /tekton:knowledge  /tekton:forge
```

---

## 5. Dashboard REST API (22 endpoints)

```
GET  /api/status              GET  /api/sessions            DELETE /api/sessions/:id
GET  /api/skills              GET  /api/routing/log         GET  /api/routing/rules
GET  /api/analytics/tokens   GET  /api/analytics/compression  GET  /api/analytics/cost
GET  /api/scp/traffic         GET  /api/config              PUT  /api/config
GET  /api/training/status    GET  /api/memory              POST /api/memory/search
GET  /api/gateway/status     GET  /api/voice/status
GET  /api/docling/health     GET  /api/docling/recent      GET  /api/docling/stats
POST /api/docling/upload
GET  /api/context/status    GET  /api/context/log          POST /api/context/pin
GET  /api/knowledge/status   GET  /api/knowledge/documents  POST /api/knowledge/search
POST /api/knowledge/ingest   DELETE /api/knowledge/documents/:id
```

---

## 6. Key Architectural Decisions

### 6a. Communication: SCP (Structured Caveman Protocol)
Inter-agent communication via TypeBox-validated messages: `delegate`, `result`, `skill-query`, `skill-response`, `status`, `error`.

### 6b. Agent System (core/agents/)
- **AgentPool**: Manages concurrent sub-agents (spawn, kill, task dispatch, idle monitoring)
- **AgentSession**: Lightweight sub-agent runtime with isolated context, tool subsets, skill injection
- **AgentRouter**: Decides inline vs delegate based on complexity scoring
- **TaskQueue**: Priority queue with concurrency limits and dependency tracking
- Max 4 agents by default, idle timeout 60s, task timeout 120s

### 6c. Model Router
Routes prompts to fast/deep models based on complexity (0–1 score). Fallback chains. Cost tracking per model/provider.

### 6d. Compression Tiers
- Lite (~10-20% reduction): whitespace normalization
- Compact (~40-60%): summarization with key points
- Full (~70-90%): caveman-style compression

### 6e. Docling Integration (Phase 13)
- **Python sidecar** (`tekton-docling`) runs as HTTP server on port 7701 or MCP stdio
- **Node.js client** (`docling-client.ts`) checks health, delegates parsing, caches availability
- **Automatic routing**: `read_file` detects `.pdf/.docx/.pptx/.xlsx/.html/.latex` etc. → delegates to sidecar
- **web_extract** detects binary Content-Type → saves temp file → delegates to sidecar
- **Graceful fallback**: when sidecar absent, returns raw text with warning + install instructions
- **Dashboard**: Documents page with upload, recent parsed docs, format stats
- **Config**: `configs/docling.json` + `~/.tekton/docling.json`
- **Startup**: Tekton auto-starts sidecar if `docling.enabled: true`, stops on shutdown

### 6f. Config System
- `~/.tekton/config.yaml` → merged with `configs/defaults.ts` → validated by `configs/schema.ts`
- `configs/docling.json`, `configs/gateway.json`, `configs/models.json`, `configs/routing-rules.json`

---

## 7. Subsystems Detail

### Core (`@tekton/core`)
- **SCP**: TypeBox codec, validate, types for delegate/result/skill-query/status/error
- **Compression**: 3 tiers (caveman-lite, caveman-compact, caveman-full), metrics tracking
- **Model Router**: Complexity scoring → fast/deep routing, rule-based overrides, fallback chains, cost estimation
- **Memory**: MemoryManager (MEMORY.md), UserModel (USER.md), SessionSearch (SQLite), CavememBridge
- **Identity**: SoulManager (SOUL.md), PersonalityManager (presets + overlays)
- **Agents**: AgentPool, AgentSession, AgentRouter, TaskQueue, ContextEngineer, types
- **Telemetry**: TelemetryTracker (SQLite), TokenBudget (daily/session limits, warnings)
- **Config**: Loader (YAML+JSON), schema, defaults
- **Context Engineer**: Precision extraction, rolling context rewrite, optimized context assembly, compression mode selection
- **Knowledge**: KnowledgeIngestor, KnowledgeIndexStore (SQLite+FTS5), KnowledgeLibrarian, topic detection, auto-injection

### Hermes Bridge (`@tekton/hermes-bridge`)
- **HermesBridge**: Bidirectional connector, evaluation cycle, skill extraction
- **SkillManager**: SKILL.md format, registry, extraction from conversations
- **Learner**: Confidence scoring, pattern generalization
- **ContextHygiene**: Turn trimming, compression triggers
- **UserModel**: Preference tracking, style adaptation

### Tools (`@tekton/tools`)
- All 55 tools registered in ToolRegistry with TypeBox schemas
- ToolContext provides cwd, taskId, tektonHome, env, approvalCallback
- Approval system: dangerous tools require user confirmation
- Docling client: HTTP sidecar communication with health caching

### Gateway (`@tekton/gateway`)
- BaseAdapter interface + 10 platform adapters
- SessionStore (SQLite) with per-user/per-platform isolation
- Rate limiter: sliding window per-user
- Slash command routing and parsing

### Voice (`@tekton/voice`)
- STT: local (ffmpeg/sox/arecord) → Groq → OpenAI Whisper
- TTS: Edge TTS → ElevenLabs → OpenAI → NeoTTS
- AudioRecorder: silence detection, ffmpeg fallback
- GatewayVoiceHandler: bridges voice to messaging platforms

### Dashboard (`@tekton/dashboard`)
- Hono HTTP server (port 7890 by default)
- DashboardAPI class with injectable subsystem references
- generateDashboardHTML() for SPA rendering
- 11 pages: status, sessions, skills, routing, analytics, scp-traffic, config, training, memory, gateway, documents

### CLI (`@tekton/cli`)
- Uses Pi SDK (`@mariozechner/pi-coding-agent`) for core session management
- CommandRegistry with 23 commands
- Modes: interactive, print, rpc, gateway
- Hooks: on-prompt, on-response, on-tool-call, on-session
- Custom resource loader, tools, and system prompt injection

### ML-Ops (`@tekton/ml-ops`)
- Orchestrator: end-to-end training workflow
- GPU Monitor: nvidia-smi VRAM tracking
- Config Builder: natural language → TrainingConfig
- Checkpoint Manager: save/load/export
- Metrics Tracker: parse logs, track loss/eval
- Dataset Pipeline: HuggingFace, tokenize, shard
- Eval Runner: lm-evaluation-harness
- Python templates: QLoRA, ternary BitNet, GRPO

### Docling Service (`tekton-docling` Python package)
- FastAPI + MCP dual-mode server
- Endpoints: GET /health, GET /formats, POST /parse, POST /chunk, POST /ocr
- MCP tools: docling_parse, docling_chunk, docling_ocr, docling_export
- Config: ~/.tekton/docling.json
- Wrapper: TektonDocConverter (OCR, tables, VLM, batch, cache)

---

## 8. Skills (64 regular + 54 optional)

**Regular skills** in `skills/`: creative (7), data-science (1), devops (1), email (1), gaming (2), github (5), mcp (1), media (3), mlops (6), note-taking (1), productivity (6 incl. docling, nano-pdf, notion, etc.), research (5), security (3), smart-home (1), social-media (1), software-development (5), tekton-internal (5)

**Optional skills** in `optional-skills/`: AI (6), audio (2), blockchain (2), cloud (3), data-engineering (3), desktop (2), devops (6), docs (3), gamedev (3), image (3), mobile (4), security (3), testing (4), web (7)

---

## 9. Config Files

```
configs/
├── docling.json          # Docling sidecar: port, OCR, tables, VLM, cache, batch
├── gateway.json          # Gateway: platform configs
├── mcp-servers.json      # MCP servers: tekton-docling entry
├── models.json           # Model providers and configs
└── routing-rules.json    # Routing rules for model selection
```

Runtime config: `~/.tekton/config.yaml` (YAML with dot-notation support)

---

## 10. Test Structure

```
tests/
├── core/                          # Agent orchestration, compression, config, hermes, identity, memory, models, routing, SCP, telemetry
├── integration/                   # Compression, full session, SCP delegation, skill lifecycle
packages/
├── cli/tests/                     # Commands, hooks, run, system-prompt
├── dashboard/tests/               # Dashboard types, API, pages
├── gateway/tests/                 # Gateway, session store, rate limiter, slash commands
├── tools/tests/docling/           # read_file rich/fallback, web_extract binary, docling_parse/batch tools, MCP registration
├── voice/tests/                   # Voice manager, STT/TTS
├── docling-service/tests/         # converter, OCR, chunker, HTTP server, MCP server
```

---

## 11. Key Code Patterns

### Tool Definition Pattern
```typescript
export const myTool: ToolDefinition = {
  name: "my_tool",
  toolset: "my_set",
  description: "Does X",
  parameters: Type.Object({ /* TypeBox schema */ }),
  requiresEnv: ["MY_API_KEY"],        // optional
  dangerous: false,                    // optional
  async execute(params, context): Promise<ToolResult> {
    return { content: "result" };
  },
};
```

### Command Registration Pattern
```typescript
export function createMyCommand(): CommandRegistration {
  return {
    name: "tekton:mycmd",
    description: "...",
    subcommands: { status: "Show status", start: "Start" },
    handler: async (args, ctx, pi, piCtx) => { /* ... */ },
  };
}
// Registered in commands/index.ts → createFullCommandRegistry()
```

### Dashboard API Route Pattern
```typescript
// In api.ts:
getMyEndpoint = (c: Context): Response => { return c.json({...}); };
// In server.ts:
this.app.get("/api/my-endpoint", this.api.getMyEndpoint);
```

### Agent Pool Usage
```typescript
const pool = new AgentPool({ maxAgents: 4 });
const agentId = await pool.spawn({ name: "worker-1", skillHints: ["code-review"] });
pool.submitTask({ id: "task-1", description: "Review PR #42", priority: "high" });
const result = pool.getTaskResult("task-1");
await pool.shutdown();
```

---

## 12. Runtime Flow

```
User Input
    ↓
CLI (interactive/print/rpc/gateway mode)
    ↓
TektonRuntime → createTektonRuntimeFactory()
    ↓
Resource Loader → system prompt, tools, hooks
    ↓
Pi SDK → Agent Session → LLM API call
    ↓
Tool Execution → ToolRegistry.execute()
    ↓
Response → Hooks (on-response, learning, compression)
    ↓
Output → Terminal / Gateway / Dashboard
```

---

## 13. Docling Architecture (Phase 13)

```
Node.js (Tekton Tools)          Python Sidecar
┌──────────────────────┐        ┌─────────────────────┐
│ read_file("doc.pdf") │──HTTP──▶│ FastAPI :7701       │
│ web_extract(url)     │──HTTP──▶│ │                   │
│ docling_parse()      │──HTTP──▶│ ├── TektonDocConverter│
│ docling_batch()      │──HTTP──▶│ ├── HierarchicalChunker│
│                       │        │ ├── OcrConfig         │
│ docling-client.ts     │        │ └── Export helpers    │
│ ├── isDoclingAvailable│        │                       │
│ ├── doclingParse()    │        │ /health  /formats     │
│ ├── doclingChunk()   │        │ /parse   /chunk       │
│ ├── doclingOcr()     │        │ /ocr                  │
│ └── RICH_FORMATS     │        │                       │
└──────────────────────┘        └─────────────────────┘
                                         │
                                 ┌───────┴───────┐
                                 │ Docling (pip)  │
                                 │ PDF/DOCX/PPTX  │
                                 │ XLSX/HTML/LaTeX│
                                 │ Images + OCR   │
                                 └───────────────┘
```

- Health check cached 30s, 3s timeout
- Rich format auto-detection in read_file
- Binary Content-Type detection in web_extract
- File-hash-based caching on Python side
- Graceful fallback when sidecar is down

---

## 14. What Exists But Is Stub/Skeleton

These systems have structure but need real implementations:
- **Gateway adapters**: Only Telegram has real API code; Discord, Slack, WhatsApp, Signal, Matrix, Email, SMS, Webhook, API-Server are structural stubs
- **Agent sessions**: `runDelegatedTask()` simulates execution; needs real LLM API calls
- **Mixture of Agents**: Returns a plan but doesn't execute (needs OpenRouter transport)
- **MCP tools**: `mcp_discover` and `mcp_call` return placeholder messages; need real MCP client
- **RL tools**: Structural stubs for reinforcement learning environment management
- **Home Assistant tools**: Placeholder implementations
- **Dashboard SPA**: Forge page added; other pages are inline React components (no build step)

---

## 15. Forge — Autonomous Product Engineering (Phase 17)

### Architecture

```
User Idea
    ↓
ForgeRuntime.newProject()
    ↓
┌─ Ideation (CreativeTeam) → Product Brief
│   ↓
├─ Director (EvaluateBrief → classifyDomains → preflight → generatePlan)
│   ↻ revise (max 3 times)
│   ✗ rejected → return with explanation
│   ✓ approved → continue
│   ↓
├─ Production (ProductionManager → SessionRunner → AgentSpawner)
│   ├── Task Cards with dependency resolution
│   ├── Parallel execution (max 2 concurrent)
│   └── Continuity: Scribe observes → HandoffPackage on session end
│   ↓
├─ QA Pipeline (QAManager)
│   ├── Domain validators (pluginval, Lighthouse, Gradle, Xcode, UE, OpenSCAD)
│   ├── Unit Tester agent
│   ├── Integration Tester agent
│   ├── Code Reviewer agent
│   ↻ failure → FailureRouter creates retry cards → back to Production
│   ✓ pass/conditional-pass → continue
│   ↓
├─ Promotion (beta → release with QA signoffs)
│   ↓
└─ Final Signoff → released!
```

### Key Modules

**Continuity Layer** (`packages/forge/src/continuity/`)
- `scribe.ts` — Observes sessions, compresses observations into caveman grammar
- `scribe-pool.ts` — Assigns scribes per layer (ideation, production, QA)
- `session-manager.ts` — Enforces message budgets, injects warnings, triggers handoff
- `cavemem-bridge.ts` — Stores/retrieves observations for cross-session memory
- `file-tracker.ts` — SHA-256 based file change detection, role attribution
- `handoff-builder.ts` — Constructs HandoffPackages from session data
- `handoff-loader.ts` — Loads and formats handoffs for fresh session context
- `reset-orchestrator.ts` — Spawns new sessions with handoff context
- `warning-system.ts` — Warning messages at 3 and 1 messages remaining

**QA Layer** (`packages/forge/src/qa/`)
- `qa-manager.ts` — Orchestrates full QA pipeline with sub-agents
- `verdict.ts` — Aggregates results: pass, conditional-pass, or fail
- `failure-router.ts` — Creates retry TaskCards from QA failures
- `promotion.ts` — Beta → release with QA signoff enforcement
- `domain-validators/` — pluginval, Lighthouse, Gradle, Xcode, UE, OpenSCAD, generic
- Testers: unit-tester, integration-tester, review-agent (RoleDefinitions)

**Preflight** (`packages/forge/src/preflight.ts`)
- `checkDomain()` — Validates tool availability per domain
- `checkMultipleDomains()` — Merges results across domains
- Integrated into approval gate: missing tools → verdict "revise"

**ForgeRuntime** (`packages/forge/src/forge-runtime.ts`)
- Full pipeline: ideation → director → preflight → production → QA → promotion
- `newProject(idea)` — Complete pipeline
- `resumeProject(id)` — Continue from saved state
- `getProjectStatus(id)` — Check status
- `listProjects()` — List all projects
- State persistence: `forge-state.json` at each phase transition

### CLI Commands
- `/tekton:forge` — Show status
- `/tekton:forge enable/disable` — Toggle Forge
- `/tekton:forge new <brief>` — Start project
- `/tekton:forge status [id]` — Check progress
- `/tekton:forge resume <id>` — Resume project
- `/tekton:forge list` — List projects
- `/tekton:forge check <domain>` — Preflight tool check

### Dashboard API
- `GET /api/forge/status` — Forge status + projects
- `GET /api/forge/projects` — List projects
- `GET /api/forge/projects/:id` — Project details
- `POST /api/forge/projects` — Create project (body: `{brief: "..."}`)
- `POST /api/forge/projects/:id/approve` — Manual director override
- `POST /api/forge/projects/:id/reject` — Manual rejection
- Forge page in SPA sidebar with project listing

### Config Files
- `configs/scribe.json` — Scribe assignments per layer
- `configs/domains/*.json` — Domain templates (9 domains)
- `configs/session-limits.json` — Per-role message budgets
- `configs/director-criteria.json` — Director evaluation criteria

### Project Directory Structure
```
~/.tekton/forge-projects/<project-id>/
  forge-state.json       # Phase, brief, plan, QA results
  forge-manifest.json    # Artifacts, QA signoffs
  production/            # Source files
  handoffs/              # Session handoff packages
  release/               # Promoted final artifacts
```

---

## 16. Context Engineer (Phase 18)

### Architecture

The Context Engineer is the DEFAULT context management system for active sessions,
replacing mechanical compression for live conversations. It maintains three layers:

1. **Rolling Context** — Rewritten summary of older messages (clean prose, no bullets)
2. **Precision Log** — All exact values/specs/decisions (never summarized)
3. **Raw Window** — Last N messages at full fidelity

```
User message
    ↓
ContextEngineer.processMessage()
    → extractPrecisionItems() [cheap LLM or heuristic]
    → append to precision log (supersession-aware)
    → every rewriteInterval: rewriteRollingContext() [LLM]
    ↓
getOptimizedContext() for LLM call
    → [system prompt]
    → [rolling context as system message]
    → [precision log as system message]
    → [knowledge injection — if Librarian has relevant material]
    → [raw recent messages]
```

### Key Types
- `ContextEngineerConfig` — model, window sizes, intervals, token limits
- `PrecisionItem` — id, category, value, context, supersedes, pinned
- `OptimizedContext` — rollingContext, precisionLog, rawMessages, tokenEstimate
- `ContextMode` — "context-engineer" | "caveman" | "raw"

### Config
```yaml
contextEngineer:
  enabled: true
  model: gemini-flash
  rawWindowSize: 12
  rewriteInterval: 10
  maxPrecisionLogTokens: 2000
  maxRollingContextTokens: 3000
  fallbackToCompression: caveman-compact

session:
  contextMode: context-engineer  # context-engineer | caveman | raw
```

### Compression Modes
- **context-engineer** (default): Precision log + rolling rewrite. Caveman used only for Scribe archival.
- **caveman**: Sliding window with compression tiers. Cheaper but less precise.
- **raw**: No compression. Full history every time. Most expensive, zero information loss.

### CLI Commands
- `/tekton:context` — Show status
- `/tekton:context on/off` — Enable/disable
- `/tekton:context stats` — Show compression ratio, items
- `/tekton:context pin "text"` — Manually pin a precision item
- `/tekton:context log` — Show precision log
- `/tekton:context mode <mode>` — Switch mode

### API Endpoints
- `GET /api/context/status` — enabled, stats
- `GET /api/context/log` — current precision log
- `POST /api/context/pin` — pin an item

---

## 17. Knowledge Librarian (Phase 18)

### Architecture

The Knowledge Librarian auto-injects relevant reference material from a local
document library into LLM conversations when topic keywords are detected.

```
Document drop → KnowledgeIngestor → KnowledgeIndexStore (SQLite + FTS5)
                                         ↓
User message → KnowledgeLibrarian.detectTopics() → keyword scan + LLM
                                         ↓
                              searchByTopics() + searchByText()
                                         ↓
                            formatted injection → prepended to LLM context
```

### Key Components
- **KnowledgeIngestor** — Parses files (DOC, PDF via Docling; MD/TXT directly),
  chunks with section awareness, auto-tags topics
- **KnowledgeIndexStore** — SQLite + FTS5 for full-text search, topic-based search
- **KnowledgeLibrarian** — Two-phase topic detection (keyword → LLM fallback),
  formatted injection within token budget, NOT stored in history

### Config
```yaml
knowledge:
  enabled: false              # Off by default until user adds documents
  storePath: ~/.tekton/knowledge/
  indexPath: ~/.tekton/knowledge/index/
  autoInject: true
  maxInjectTokens: 1500
  maxInjectChunks: 3
  embeddingModel: text-embedding-3-small
  topics: {}                  # Populated by ingestor auto-tagging
```

### CLI Commands
- `/tekton:knowledge` — Show status
- `/tekton:knowledge add <path>` — Ingest file/directory
- `/tekton:knowledge list` — List documents
- `/tekton:knowledge search "query"` — Search library
- `/tekton:knowledge topics` — List detected topics
- `/tekton:knowledge remove <id>` — Remove document
- `/tekton:knowledge on/off` — Enable/disable auto-injection

### API Endpoints
- `GET /api/knowledge/status` — enabled, document count, topics
- `GET /api/knowledge/documents` — list all documents
- `GET /api/knowledge/documents/:id` — document detail
- `POST /api/knowledge/search` — search with query body
- `POST /api/knowledge/ingest` — ingest uploaded file
- `DELETE /api/knowledge/documents/:id` — remove document

### Forge Integration
- Production agents automatically get Context Engineer + Knowledge Librarian via AgentSession
- Domain-specific topic seeding: DSP Engineer pre-seeded with ["juce", "dsp", "audio", "vst"]
- `buildSystemPrompt()` includes patch tool preference and reference material guidance
- Failure router retry cards specify patch tool usage
- Scribe includes precision items in handoff packages
- Handoff loader injects precision items into fresh Context Engineer

### Clean Separation of Concerns
- **Context Engineer**: Within-session context quality (precision + brevity)
- **Scribe**: Between-session continuity (handoffs + memory)
- **Caveman**: Long-term archival compression (cavemem storage)
- **Knowledge Librarian**: External reference injection (auto-retrieved, not stored)

---

## 18. Test Summary (Phase 18)

**1011 tests passing across 85 test files.**

New Phase 18 tests:
- `tests/core/context-engineer.test.ts` — 26 tests (precision extraction, supersession, rolling context, optimized output, stats, persistence)
- `tests/core/compression-modes.test.ts` — 5 tests (mode selection, mode switching)
- `tests/core/knowledge/ingestor.test.ts` — 10 tests (markdown, text, PDF, chunking, topics, dedup, removal)
- `tests/core/knowledge/index-store.test.ts` — 8 tests (save, retrieve, text search, topic search, persistence, removal)
- `tests/core/knowledge/librarian.test.ts` — 10 tests (topic detection, knowledge retrieval, injection, token limits)
- `tests/integration/ce-forge-integration.test.ts` — 5 tests (production session CE, Scribe handoff, cross-session precision)
- `tests/integration/forge-knowledge-integration.test.ts` — 6 tests (domain topics, reference material, patch tool)
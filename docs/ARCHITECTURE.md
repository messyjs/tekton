# Tekton Agent Architecture

## Overview

Tekton Agent is a standalone terminal coding agent that combines five major systems into a unified platform:

```
┌─────────────────────────────────────────────────────┐
│                    CLI / TUI                         │
│          (22+ commands, interactive REPL)            │
├─────────────┬──────────────┬────────────────────────┤
│   Hermes    │   Gateway    │     Dashboard          │
│   Bridge    │  (10 adapters)│    (10 pages, REST)    │
├─────────────┴──────────────┴────────────────────────┤
│                      Core                            │
│  SCP │ Compression │ Router │ Memory │ Learning     │
│  Agents │ Cost │ Telemetry │ Identity │ Config      │
├───────────┬──────────┬──────────┬───────────────────┤
│   Tools   │  Voice   │ ML-Ops   │  Hermes Bridge    │
│  (8 sets) │(STT/TTS) │(Training)│  (Evaluation)     │
└───────────┴──────────┴──────────┴───────────────────┘
```

## Packages

| Package | Purpose | Exports |
|---------|---------|---------|
| `@tekton/core` | Foundation: SCP, compression, routing, memory, learning | SCPDelegate, compress, ModelRouter, MemoryManager, SoulManager |
| `@tekton/hermes-bridge` | Learning loop: evaluation, skill extraction, context hygiene | HermesBridge, SkillManager, Learner, ContextHygiene |
| `@tekton/tools` | Tool execution: filesystem, shell, browser, git, code, fetch, messaging, TTS, Docling | ToolRegistry, all toolsets, DoclingClient |
| `@tekton/cli` | Terminal interface: 23+ slash commands including /tekton:docling | CommandRegistry, all commands |
| `@tekton/gateway` | Multi-platform messaging: 10 adapters (Telegram, Discord, Slack, etc.) | GatewayRunner, SessionStore, BaseAdapter |
| `@tekton/voice` | Voice I/O: STT/TTS managers, audio recorder, gateway handler | VoiceManager, STTManager, TTSManager |
| `@tekton/dashboard` | Web UI: 11 pages (incl. Documents), 15+ REST endpoints, dark theme | DashboardServer, DashboardAPI, generateDashboardHTML |
| `@tekton/ml-ops` | Training orchestration: QLoRA, ternary, GRPO, eval | Orchestrator, GPUMonitor, CheckpointManager, MetricsTracker |

## Communication Protocols

### SCP (Structured Caveman Protocol)
Inter-agent communication using TypeBox-validated messages:
- `delegate` — Task delegation to sub-agents
- `result` — Task completion response
- `skill-query` / `skill-response` — Skill discovery
- `status` — Agent status updates
- `error` — Error reporting

### Compression Tiers
Three-tier context compression:
- **Lite** — Remove whitespace, normalize formatting (~10-20% reduction)
- **Compact** — Aggressive summarization with key points (~40-60% reduction)
- **Full** — Caveman-style compression, maximum reduction (~70-90% reduction)

## Data Flow

```
User Input → Model Router → [fast|deep] LLM → Response
     ↓            ↓                    ↓
  SCP Delegate  Complexity Score    Telemetry Tracker
     ↓            ↓                    ↓
  Sub-Agent    Learning Loop       Cost Tracker
     ↓            ↓                    ↓
  Skill Query  Context Hygiene    Memory Manager
```

## Subsystem Details

### Model Router
- Complexity-based routing (simple → fast model, complex → deep model)
- Rule-based overrides (specific patterns → specific models)
- Fallback chains with automatic retry
- Cost tracking per model/provider

### Memory System
- `MEMORY.md` — Persistent project knowledge
- `USER.md` — User model and preferences
- Session search with SQLite-backed store
- Cavemem bridge for observation accumulation

### Learning Loop (Hermes Bridge)
1. User submits prompt
2. Evaluator assesses response quality
3. Skill extraction identifies reusable patterns
4. Context hygiene trims conversation history
5. User model updates with preferences

### Gateway
- Platform adapters connect to Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Email, SMS, Webhook, API Server
- Session store: per-user/per-platform isolation with SQLite
- Rate limiter: per-user sliding window
- Slash command routing: `/tekton:status`, `/model`, `/personality`, etc.

### Voice
- STT: 3-provider fallback (local → Groq → OpenAI Whisper)
- TTS: 4-provider fallback (Edge → ElevenLabs → OpenAI → NeoTTS)
- Recording: silence detection, ffmpeg/sox/arecord fallback
- Gateway integration for voice message delivery

### ML-Ops
- Orchestrator: end-to-end training workflow
- GPU Monitor: nvidia-smi parsing, VRAM tracking
- Config Builder: natural language → TrainingConfig
- Checkpoint Manager: save/load/export checkpoints
- Metrics Tracker: parse logs, track loss/eval metrics
- Dataset Pipeline: HuggingFace download, tokenize, shard
- Eval Runner: lm-evaluation-harness wrapper
- Python templates: QLoRA, ternary BitNet, GRPO reasoning

### Docling Document Intelligence
- Python sidecar service (FastAPI + MCP dual-mode)
- Parses PDF, DOCX, PPTX, XLSX, HTML, images, LaTeX, and more
- OCR support via EasyOCR (default) or Tesseract (fallback)
- Hierarchical chunking for RAG-ready segments
- Exports: Markdown, HTML, JSON, DocTags
- HTTP API on port 7701 with /health, /formats, /parse, /chunk, /ocr endpoints
- MCP stdio server for tool registry integration
- Graceful fallback in Node.js when sidecar is not installed
- Dashboard Documents page for upload, preview, and parsing history
- CLI command: `/tekton:docling status|parse|start|stop|formats|config`
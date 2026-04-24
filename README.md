# ⚡ Tekton

Standalone terminal coding agent combining Pi SDK, Hermes learning loop, OpenMythos adaptive computation, Caveman compression, and context hygiene.

```
┌──────────────────────────────────────────────────┐
│  ⚡ Tekton — Adaptive Coding Agent              │
├──────────┬──────────┬──────────┬────────────────┤
│  Core    │ Gateway  │  Voice   │  Dashboard     │
│  SCP     │ 10 adapt │ STT/TTS  │  10 pages      │
│  Route   │ Sessions │ Recorder │  REST API      │
│  Compress│ Rate lim │ Handler │  Dark theme     │
├──────────┼──────────┼──────────┼────────────────┤
│  Hermes  │  Tools   │ ML-Ops   │  CLI           │
│  Learn   │ 8 sets  │ QLoRA    │  22+ commands   │
│  Evaluate│ Approval │ Ternary  │  Interactive    │
│  Extract │ Sandbox  │ GRPO     │  Autocomplete   │
└──────────┴──────────┴──────────┴────────────────┘
```

## Quick Start

```bash
npm install
npm run build
npm test           # 624 tests
npx tekton          # Start interactive session
```

## Features

| Feature | Source | Description |
|---------|--------|-------------|
| SCP Protocol | OpenMythos | Structured Caveman Protocol for inter-agent communication |
| 3-Tier Compression | Caveman | Lite/Compact/Full compression to stay in context |
| Adaptive Routing | OpenMythos | Complexity-based model selection (fast ↔ deep) |
| Learning Loop | Hermes | Evaluation → skill extraction → context hygiene |
| Multi-Platform | Gate | Telegram, Discord, Slack, WhatsApp, +6 more adapters |
| Voice I/O | Voice | STT local→Groq→OpenAI, TTS edge→ElevenLabs→OpenAI |
| Document Intelligence | Docling | PDF, DOCX, PPTX, XLSX, images → Markdown with OCR and tables |
| Web Dashboard | Dashboard | 11-page React SPA with dark theme |
| Training Orchestration | ML-Ops | QLoRA, ternary BitNet, GRPO reasoning |
| Fallback Chains | OpenMythos | Automatic model failover on errors |

## Command Reference

| Command | Description |
|---------|-------------|
| `/tekton` | Show system status |
| `/tekton:status` | Detailed subsystem status |
| `/tekton:on` / `:off` | Enable/disable subsystems |
| `/tekton:models` | Show configured models |
| `/tekton:route` | Show routing decisions |
| `/tekton:compress` | Compress text across tiers |
| `/tekton:tokens` | Show token usage and budget |
| `/tekton:skills list` | List extracted skills |
| `/tekton:learn` | Trigger learning cycle |
| `/tekton:memory` | Show/update memory |
| `/tekton:agents` | Manage sub-agents |
| `/tekton:config` | View/update configuration |
| `/tekton:dashboard` | Start web UI (port 7700) |
| `/tekton:train` | ML training (config/start/status/eval/export/gpu) |
| `/tekton:voice` | Voice I/O control |
| `/tekton:docling` | Document intelligence (status, parse, start, stop, formats, config) |
| `/tekton:gateway` | Messaging gateway control |
| `/tekton:personality` | Personality presets |
| `/tekton:soul` | Manage soul/identity |
| `/tekton:help` | Full command reference |
| `/model` | Switch model (Pi native) |
| `/tree` / `/compact` / `/new` | Pi native commands |

## Providers

| Provider | Models | Type |
|----------|--------|------|
| Ollama | gemma3, llama3, mistral, phi3, qwen2, deepseek | Local |
| OpenAI | gpt-4o, gpt-4o-mini, o1 | API |
| Anthropic | claude-3.5-sonnet | API |
| Groq | llama3, mixtral, gemma | API |
| Together | 100+ open source models | API |

## Architecture

8 packages in a monorepo:

```
tekton/
├── packages/core/          # Foundation: SCP, routing, compression, memory
├── packages/hermes-bridge/ # Learning loop: evaluation, skill extraction
├── packages/tools/          # Tool execution: 10 toolsets (incl. Docling)
├── packages/cli/            # Terminal interface: 23+ commands
├── packages/gateway/        # Messaging: 10 platform adapters
├── packages/voice/          # Voice I/O: STT/TTS/recording
├── packages/dashboard/       # Web UI: 11 pages (incl. Documents), REST API
├── packages/ml-ops/          # Training: QLoRA, ternary, GRPO
└── packages/docling-service/ # Document parsing sidecar (Python)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture details.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Full system architecture
- [Docling](docs/DOCLING.md) — Document intelligence integration
- [SCP Specification](docs/SCP-SPEC.md) — Inter-agent protocol
- [Routing](docs/ROUTING.md) — Adaptive model routing
- [Compression Tiers](docs/COMPRESSION-TIERS.md) — Three-tier compression
- [Learning Loop](docs/LEARNING-LOOP.md) — Hermes self-improvement cycle
- [ML-Ops](docs/ML-OPS.md) — Training orchestration
- [Setup Guide](docs/SETUP.md) — Installation and configuration
- [Roadmap](docs/ROADMAP.md) — Development timeline

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Credits

Tekton combines ideas and code from five open-source projects:

- **[Pi](https://github.com/mariozechner/pi-coding-agent)** — Terminal coding agent framework, CLI, tools
- **[Hermes](https://github.com/mariozechner/hermes)** — Learning loop, skill extraction, context hygiene
- **[OpenMythos](https://github.com/nicholas-carmona/openmythos)** — Adaptive computation, model routing
- **[Caveman](https://github.com/nicholas-carmona/caveman)** — Compression tiers, token optimization
- **[ULR](https://github.com/nicholas-carmona/ulr)** — Universal learning rate, reasoning training

## License

MIT
# ⚡ Tekton Agent

Standalone terminal AI coding agent with adaptive routing, learning loop, multi-tier compression, and document intelligence.

```
┌──────────────────────────────────────────────────────┐
│  ⚡ Tekton Agent — Adaptive Terminal Coding Agent    │
├──────────┬──────────┬───────────┬───────────────────┤
│  Core    │ Gateway  │  Voice    │  Dashboard        │
│  SCP     │ 10 adapt │ STT/TTS   │  REST API + UI    │
│  Route   │ Sessions │ Recorder  │  Dark theme        │
│  Compress│ Rate lim │ Handler  │  Forge (optional)  │
├──────────┼──────────┼───────────┼───────────────────┤
│  Hermes  │  Tools   │  ML-Ops   │  CLI              │
│  Learn   │ 10 sets │ QLoRA     │  23+ commands      │
│  Evaluate│ Approval │ Ternary   │  Interactive       │
│  Extract │ Sandbox  │ GRPO      │  Autocomplete      │
└──────────┴──────────┴───────────┴───────────────────┘
```

## Quick Start

```bash
npm install
npm run build
npm test           # 624 tests
npx tekton          # Start interactive session (learning ON by default)
npx tekton --no-learning   # Start without learning for this session
```

## Features

| Feature | Source | Description |
|---------|--------|-------------|
| SCP Protocol | OpenMythos | Structured Caveman Protocol for inter-agent communication |
| 3-Tier Compression | Caveman | Lite/Compact/Full compression to stay in context |
| Adaptive Routing | OpenMythos | Complexity-based model selection (fast ↔ deep) |
| Learning Loop | Hermes | Evaluation → skill extraction → context hygiene (ON by default) |
| Multi-Platform | Gate | Telegram, Discord, Slack, WhatsApp, +6 more adapters |
| Voice I/O | Voice | STT local→Groq→OpenAI, TTS edge→ElevenLabs→OpenAI |
| Document Intelligence | Docling | PDF, DOCX, PPTX, XLSX, images → Markdown with OCR and tables |
| Web Dashboard | Dashboard | 11-page SPA with dark theme |
| Training Orchestration | ML-Ops | QLoRA, ternary BitNet, GRPO reasoning |
| Fallback Chains | OpenMythos | Automatic model failover on errors |
| Forge (optional) | Product Eng | Multi-agent product engineering pipeline |

## Learning Mode

Tekton Agent **learns from every session** by default. The Hermes learning loop:

- **Extracts skills** — Successful tasks become reusable skills stored locally
- **Refines existing skills** — Better approaches update skill confidence
- **Tracks your preferences** — User model learns coding style, tool preferences
- **Manages context** — Recommends compaction when context gets heavy
- **Zero extra token cost** — All learning is local, no API calls

Use `--no-learning` to pause learning for a session (e.g., CI/CD, debugging, one-off scripts).

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
| `/tekton:forge` | Forge product engineering (optional) |
| `/tekton:personality` | Personality presets |
| `/tekton:soul` | Manage soul/identity |
| `/tekton:help` | Full command reference |
| `/model` | Switch model (Pi native) |
| `/tree` / `/compact` / `/new` | Pi native commands |

## CLI Flags

| Flag | Description |
|------|-------------|
| `--no-learning` | Disable skill extraction & learning for this session |
| `--provider <p>` | LLM provider (ollama, openai, anthropic, groq, together) |
| `--model <m>` | Model to use |
| `--route <mode>` | Routing mode: auto, fast, deep, rules |
| `--compress <tier>` | Compression: off, lite, full, ultra |
| `--dashboard` | Enable dashboard |
| `--dashboard-port <n>` | Dashboard port (default: 7890) |
| `--no-dashboard` | Disable dashboard |
| `--soul <path>` | Override SOUL.md path |
| `--personality <p>` | Personality preset: teacher, reviewer, researcher, pragmatic, creative |

## Providers

| Provider | Models | Type |
|----------|--------|------|
| Ollama | gemma3, llama3, mistral, phi3, qwen2, deepseek | Local |
| OpenAI | gpt-4o, gpt-4o-mini, o1 | API |
| Anthropic | claude-3.5-sonnet | API |
| Groq | llama3, mixtral, gemma | API |
| Together | 100+ open source models | API |

## Forge (Optional)

Forge is Tekton Agent's optional product engineering system. Enable it during setup or anytime:

```bash
# During setup
npm run setup        # Will ask: "Enable Forge? [y/N]"

# Or in-session
/tekton:forge enable
/tekton:forge new "Build a portfolio site with contact form"
/tekton:forge status
```

See [FORGE-BUILD-GUIDE.md](FORGE-BUILD-GUIDE.md) for details.

## Architecture

9 core packages + 1 optional in a monorepo:

```
tekton-agent/
├── packages/core/            # Foundation: SCP, routing, compression, memory
├── packages/hermes-bridge/   # Learning loop: evaluation, skill extraction
├── packages/tools/           # Tool execution: 10 toolsets (incl. Docling)
├── packages/cli/             # Terminal interface: 23+ commands
├── packages/gateway/         # Messaging: 10 platform adapters
├── packages/voice/            # Voice I/O: STT/TTS/recording
├── packages/dashboard/        # Web UI: 11 pages, REST API
├── packages/ml-ops/           # Training: QLoRA, ternary, GRPO
├── packages/docling-service/  # Document parsing sidecar (Python)
└── packages/forge/            # [Optional] Product engineering pipeline
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full architecture details.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Full system architecture
- [Docling](docs/DOCLING.md) — Document intelligence integration
- [Forge Guide](FORGE-BUILD-GUIDE.md) — Product engineering pipeline
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

Tekton Agent combines ideas and code from open-source projects:

- **[Pi](https://github.com/badlogic/pi-mono)** — Terminal coding agent framework, CLI, tools
- **[Hermes](https://github.com/nousresearch/hermes-agent)** — Learning loop, skill extraction, context hygiene
- **[OpenMythos](https://github.com/kyegomez/OpenMythos)** — Adaptive computation, model routing
- **[Caveman](https://github.com/juliusbrussee/caveman)** — Compression tiers, token optimization
- **[Docling](https://github.com/docling-project/docling)** — Document parsing and intelligence

## License

MIT
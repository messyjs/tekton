# Tekton Agent Setup Guide

## Prerequisites

- **Node.js** 20+ (recommended: 22+)
- **Python** 3.10+ (for Docling document intelligence & ML-Ops training)
- **Git** 2.30+
- **NVIDIA GPU** + CUDA (optional, for local training)
- **Ollama** or other model provider API keys

## Installation

```bash
# Clone the repository
git clone https://github.com/messyjs/tekton-agent.git
cd tekton-agent

# Run setup (installs deps, builds, runs tests)
npm run setup
# Or manual install:
npm install
npm run build:core
npm run build:cli
npm test
```

### Optional: Forge

Forge is Tekton Agent's autonomous product engineering system. It's **not built by default**:

```bash
# Build Forge (optional)
npm run build:forge
```

Or enable during setup when prompted.

## Configuration

Tekton Agent uses `~/.tekton/config.yaml` for persistent settings:

```yaml
identity:
  name: tekton-agent
  soul: "Tekton Agent — adaptive coding agent that learns"

models:
  fast:
    model: gemma3:4b
    provider: ollama
  deep:
    model: gemma3:27b
    provider: ollama

routing:
  mode: auto
  complexityThreshold: 0.6

compression:
  enabled: true
  defaultTier: full

learning:
  enabled: true    # Learning ON by default (use --no-learning to pause)

voice:
  stt: local
  tts: edge

dashboard:
  port: 7700
  autoStart: false

gateway:
  platforms: []
```

## Learning Mode

By default, Tekton Agent **learns from every session**:
- Extracts skills from successful tasks
- Refines existing skills over time
- Tracks user preferences and coding style
- Recommends context compaction when needed
- **Zero extra token cost** — all learning is local

To disable learning for a specific session (e.g., scripts, CI/CD):

```bash
npx tekton --no-learning
```

## Model Providers

Configure in `~/.tekton/config.yaml`:

```yaml
models:
  fast:
    model: gemma3:12b
    provider: ollama
  deep:
    model: gpt-4o
    provider: openai
```

Set API keys via environment variables:
```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GROQ_API_KEY=gsk_...
```

## First Run

```bash
# Start interactive session (learning ON by default)
npx tekton

# Or without learning
npx tekton --no-learning

# Or use specific commands
npx tekton --help
/tekton:status
/tekton:models
/tekton:skills list
/tekton:learn          # Trigger learning cycle manually
```

## Dashboard

```bash
# Start web dashboard
/tekton:dashboard start

# Open in browser
/tekton:dashboard open
```

Available at http://127.0.0.1:7700

## Gateway

```bash
# Configure platforms in config.yaml
gateway:
  platforms:
    - telegram
    - discord
  tokens:
    telegram: "BOT_TOKEN"
    discord: "BOT_TOKEN"

# Start gateway
/tekton:gateway start
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Ollama not found" | Install Ollama and start it: `ollama serve` |
| "Model not found" | Pull the model: `ollama pull gemma3:12b` |
| "Port 7700 in use" | Change port in config: `dashboard.port: 8080` |
| "No GPU detected" | Install nvidia-smi or use CPU-only models |
| Learning seems slow | Learning is local — no API cost. Check `~/.tekton/skills/` for extracted skills |
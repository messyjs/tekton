# Tekton Setup Guide

## Prerequisites

- **Node.js** 20+ (recommended: 22+)
- **Python** 3.10+ (for ML-Ops training scripts)
- **Git** 2.30+
- **NVIDIA GPU** + CUDA (optional, for local training)
- **Ollama** or other model provider API keys

## Installation

```bash
# Clone the repository
git clone <tekton-repo-url>
cd tekton

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Configuration

Tekton uses `~/.tekton/config.yaml` for persistent settings:

```yaml
identity:
  name: tekton
  soul: "Tekton — adaptive coding agent"

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
  enabled: true

voice:
  stt: local
  tts: edge

dashboard:
  port: 7700
  autoStart: false

gateway:
  platforms: []
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
# Start interactive session
npx tekton

# Or use specific commands
npx tekton --help
/tekton:status
/tekton:models
/tekton:skills list
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
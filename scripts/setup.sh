#!/bin/bash
# Tekton Setup Script
set -e

echo "⚡ Tekton Setup"
echo "================"
echo ""

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo "✓ Node.js $NODE_VERSION"
else
  echo "✗ Node.js not found. Install Node.js 20+ from https://nodejs.org"
  exit 1
fi

# Check Node version
NODE_MAJOR=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "✗ Node.js 20+ required. Current: $(node --version)"
  exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
  echo "✓ npm $(npm --version)"
else
  echo "✗ npm not found"
  exit 1
fi

# Check Python (optional)
if command -v python3 &> /dev/null; then
  echo "✓ Python3 $(python3 --version)"
else
  echo "⚠ Python3 not found (needed for ML-Ops training scripts)"
fi

# Check Git
if command -v git &> /dev/null; then
  echo "✓ Git $(git --version)"
else
  echo "⚠ Git not found"
fi

# Check Ollama (optional)
if command -v ollama &> /dev/null; then
  echo "✓ Ollama $(ollama --version 2>/dev/null || echo 'installed')"
else
  echo "⚠ Ollama not found (needed for local models)"
fi

# Check nvidia-smi (optional)
if command -v nvidia-smi &> /dev/null; then
  GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo "GPU detected")
  echo "✓ NVIDIA GPU: $GPU_INFO"
else
  echo "⚠ No NVIDIA GPU detected (needed for local training)"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building packages..."
npm run build

echo ""
echo "Running tests..."
npx vitest run

echo ""
echo "Creating config directory..."
mkdir -p ~/.tekton/skills
mkdir -p ~/.tekton/memory

if [ ! -f ~/.tekton/config.yaml ]; then
  echo "Creating default config..."
  cp configs/default.yaml ~/.tekton/config.yaml 2>/dev/null || echo "Config file already exists"
fi

echo ""
echo "✓ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit ~/.tekton/config.yaml to configure your models"
echo "  2. Set API keys: export OPENAI_API_KEY=sk-..."
echo "  3. Pull a model: ollama pull gemma3:12b"
echo "  4. Start Tekton: npx tekton"
echo ""
echo "Documentation: docs/SETUP.md"
echo "Commands: /tekton:help"
# ML-Ops Guide

## Overview

The `@tekton/ml-ops` package provides training orchestration for QLoRA, ternary BitNet, and GRPO reasoning models. It generates Python scripts that can be run with local or cloud GPU resources.

## Quick Start

### 1. Check GPU
```
/tekton:train gpu
```
Detects available GPUs, VRAM, and CUDA version.

### 2. Build Config from Natural Language
```
/tekton:train config "fine-tune llama-3-8b on alpaca with qlora"
```
Outputs a full `TrainingConfig` with recommended hyperparameters.

### 3. Start Training
```
/tekton:train start "fine-tune llama-3-8b on alpaca"
```
Generates a Python script and creates a training job.

### 4. Monitor Progress
```
/tekton:train status <job-id>
/tekton:train logs <job-id>
```

### 5. Evaluate
```
/tekton:train eval <job-id> mmlu hellaswag
```

### 6. Export Checkpoints
```
/tekton:train export <job-id> gguf
```

## Training Methods

### QLoRA (Recommended)
- 4-bit quantization with Unsloth acceleration
- Best for: General fine-tuning, most use cases
- VRAM: 8-24GB depending on model size
- Script: `generateQLoRAScript()`

### Ternary BitNet (1.58-bit)
- Weights quantized to {-1, 0, +1}
- Best for: Edge deployment, minimal memory
- VRAM: 4-12GB
- Script: `generateTernaryScript()`

### GRPO (Reasoning)
- Group Relative Policy Optimization for reasoning training
- Best for: Improving logical reasoning, math, chain-of-thought
- VRAM: 16-48GB
- Script: `generateGRPOScript()`

## Architecture

```
Orchestrator
├── GPUMonitor          — nvidia-smi parsing, VRAM tracking
├── ConfigBuilder       — Natural language → TrainingConfig
├── CheckpointManager   — Save/load/export checkpoints
├── MetricsTracker      — Parse logs, track loss/eval metrics
├── DatasetPipeline     — Download/tokenize/shard datasets
└── EvalRunner          — lm-evaluation-harness wrapper
```

## Programmatic Usage

```typescript
import { Orchestrator } from "@tekton/ml-ops";

const orch = new Orchestrator("./ml-ops");
const env = await orch.initialize();

// Create job from natural language
const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca with qlora");

// Or from structured config
const job = orch.createJob({
  method: "qlora",
  baseModel: "unsloth/llama-3-8b",
  dataset: "tatsu-lab/alpaca",
  outputName: "my-finetune",
  options: { epochs: 5, batchSize: 8 },
});

// Start and monitor
await orch.startJob(job.id);
orch.updateJobProgress(job.id, 100, 2.5);
const summary = orch.getMetrics().getTrainingSummary(job.id);
```
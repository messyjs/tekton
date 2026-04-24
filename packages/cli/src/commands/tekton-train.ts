/**
 * Train Command — Full implementation using @tekton/ml-ops orchestrator.
 * Subcommands: config, start, status, stop, eval, export, list, logs, gpu
 */
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";
import type { TrainingMethod, TrainingConfig, TrainingJob } from "@tekton/ml-ops";

let orchestrator: any = null;

async function getOrchestrator() {
  if (!orchestrator) {
    const { Orchestrator } = await import("@tekton/ml-ops");
    orchestrator = new Orchestrator();
    await orchestrator.initialize();
  }
  return orchestrator;
}

export function createTrainCommand(): CommandRegistration {
  return {
    name: "tekton:train",
    description: "Manage ML training runs — QLoRA, ternary BitNet, GRPO",
    subcommands: {
      "config": "Show or build a training config from natural language",
      "start": "Start a training run",
      "status": "Show training status",
      "stop": "Stop the current training run",
      "eval": "Evaluate model performance",
      "export": "Export checkpoints (GGUF, safetensors)",
      "list": "List all training jobs",
      "logs": "Show training logs/metrics",
      "gpu": "Show GPU information for training",
    },
    handler: async (args, _ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "config": return handleConfig(args, piCtx);
        case "start": return handleStart(args, piCtx);
        case "status": return handleStatus(args, piCtx);
        case "stop": return handleStop(args, piCtx);
        case "eval": return handleEval(args, piCtx);
        case "export": return handleExport(args, piCtx);
        case "list": return handleList(args, piCtx);
        case "logs": return handleLogs(args, piCtx);
        case "gpu": return handleGPU(args, piCtx);
        default:
          piCtx.ui.notify(
            "🧠 Training Management\n\n" +
            "Subcommands:\n" +
            "  config    — Build config from natural language\n" +
            "  start     — Start a training run\n" +
            "  status    — Show training status\n" +
            "  stop      — Stop current training run\n" +
            "  eval      — Evaluate model\n" +
            "  export    — Export checkpoints\n" +
            "  list      — List training jobs\n" +
            "  logs      — View training metrics\n" +
            "  gpu       — GPU information\n\n" +
            "Example: /tekton:train config \"fine-tune llama-3-8b on alpaca\""
          );
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["config", "start", "status", "stop", "eval", "export", "list", "logs", "gpu"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Train ${s}` }));
    },
  };
}

async function handleConfig(args: ParsedArgs, piCtx: any): Promise<void> {
  const prompt = args.positional.join(" ");
  if (!prompt) {
    piCtx.ui.notify("Usage: /tekton:train config \"fine-tune llama-3-8b on alpaca\"");
    return;
  }

  const { parseTrainingPrompt, buildTrainingConfig } = await import("@tekton/ml-ops");
  const spec = parseTrainingPrompt(prompt);
  const config = buildTrainingConfig(spec);

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify(config, null, 2));
  } else {
    piCtx.ui.notify(
      "🧠 Training Configuration\n\n" +
      `  Method:     ${config.method}\n` +
      `  Base Model: ${config.baseModel}\n` +
      `  Dataset:    ${config.dataset}\n` +
      `  Output:     ${config.outputName}\n` +
      `  Epochs:     ${config.epochs}\n` +
      `  Batch Size: ${config.batchSize}\n` +
      `  Precision:  ${config.precision}\n` +
      `  LoRA Rank:  ${config.loraRank}\n` +
      `  Learning Rate: ${config.learningRate}\n` +
      `  Max Seq Len: ${config.maxSeqLength}\n` +
      `  Use Unsloth: ${config.useUnsloth}\n\n` +
      "Use /tekton:train start to begin."
    );
  }
}

async function handleStart(args: ParsedArgs, piCtx: any): Promise<void> {
  const prompt = args.positional.join(" ");
  if (!prompt) {
    piCtx.ui.notify("Usage: /tekton:train start \"fine-tune llama-3-8b on alpaca\"");
    return;
  }

  const orch = await getOrchestrator();
  const job = orch.createJobFromPrompt(prompt);
  await orch.startJob(job.id);

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify(job, null, 2));
  } else {
    piCtx.ui.notify(
      `🚀 Training job started\n\n` +
      `  Job ID:  ${job.id}\n` +
      `  Method:  ${job.method}\n` +
      `  Model:   ${job.config.baseModel}\n` +
      `  Status:  ${job.status}\n\n` +
      `Script generated. Use /tekton:train status ${job.id} to check progress.\n` +
      `Use /tekton:train logs ${job.id} to view metrics.`
    );
  }
}

async function handleStatus(args: ParsedArgs, piCtx: any): Promise<void> {
  const orch = await getOrchestrator();
  const jobId = args.positional[0];

  if (jobId) {
    const job = orch.getJob(jobId);
    if (!job) {
      piCtx.ui.notify(`Job not found: ${jobId}`);
      return;
    }

    if (hasJsonFlag(args)) {
      piCtx.ui.notify(JSON.stringify(job, null, 2));
    } else {
      const progress = (job.progress * 100).toFixed(1);
      const elapsed = job.startTime ? Math.round((Date.now() - job.startTime) / 1000) : 0;
      piCtx.ui.notify(
        `🧠 Training Status: ${job.name}\n\n` +
        `  Job ID:     ${job.id}\n` +
        `  Method:     ${job.method}\n` +
        `  Status:     ${job.status}\n` +
        `  Progress:   ${progress}%\n` +
        `  Step:       ${job.currentStep}/${job.totalSteps}\n` +
        `  Epoch:      ${job.currentEpoch}/${job.totalEpochs}\n` +
        `  Train Loss: ${job.trainLoss.toFixed(4)}\n` +
        `  Eval Loss:  ${job.evalLoss > 0 ? job.evalLoss.toFixed(4) : "N/A"}\n` +
        `  GPU:        ${job.gpuUtil.toFixed(0)}% utilization, ${job.gpuVramUsedMB}MB VRAM\n` +
        `  Elapsed:    ${elapsed}s`
      );
    }
  } else {
    const status = orch.getStatus();

    if (hasJsonFlag(args)) {
      piCtx.ui.notify(JSON.stringify(status, null, 2));
    } else {
      piCtx.ui.notify(
        "🧠 Training Orchestrator\n\n" +
        `  Initialized: ${status.initialized ? "✓" : "✗"}\n` +
        `  Active Jobs:  ${status.activeJobs.length}\n` +
        `  Completed:    ${status.completedJobs.length}\n` +
        (status.env ? `  GPUs: ${status.env.gpus.length} (${status.env.vramTotalMB}MB total)\n` : "  GPUs: None detected\n") +
        `  Python: ${status.env?.pythonAvailable ? status.env.pythonVersion : "not found"}`
      );
    }
  }
}

async function handleStop(args: ParsedArgs, piCtx: any): Promise<void> {
  const jobId = args.positional[0];
  if (!jobId) {
    piCtx.ui.notify("Usage: /tekton:train stop <job-id>");
    return;
  }

  const orch = await getOrchestrator();
  const job = orch.stopJob(jobId);

  piCtx.ui.notify(`⛔ Training job ${jobId} stopped.\n  Status: ${job.status}`);
}

async function handleEval(args: ParsedArgs, piCtx: any): Promise<void> {
  const jobId = args.positional[0];
  if (!jobId) {
    piCtx.ui.notify("Usage: /tekton:train eval <job-id> [tasks...]\nExample: /tekton:train eval job-abc mmlu hellaswag");
    return;
  }

  const tasks = args.positional.slice(1).length > 0 ? args.positional.slice(1) : ["mmlu", "hellaswag"];
  const orch = await getOrchestrator();

  piCtx.ui.notify(`🏃 Running evaluation for ${jobId} on: ${tasks.join(", ")}...`);

  try {
    const result = await orch.evaluateModel(jobId, tasks);
    piCtx.ui.notify(
      `📊 Evaluation Results\n\n` +
      `  Benchmark: ${result.benchmark}\n` +
      Object.entries(result.scores as Record<string, number>).map(([task, score]) => `  ${task}: ${(score * 100).toFixed(1)}%`).join("\n") +
      `\n  Overall: ${(result.overall * 100).toFixed(1)}%`
    );
  } catch (err: any) {
    piCtx.ui.notify(`❌ Evaluation failed: ${err.message}`);
  }
}

async function handleExport(args: ParsedArgs, piCtx: any): Promise<void> {
  const jobId = args.positional[0];
  const format = args.positional[1] || "gguf";

  if (!jobId) {
    piCtx.ui.notify("Usage: /tekton:train export <job-id> [gguf|safetensors|onnx|mlx]");
    return;
  }

  const orch = await getOrchestrator();
  const checkpoints = orch.getCheckpoints();
  const best = checkpoints.getBestCheckpoint(jobId);

  if (!best) {
    piCtx.ui.notify(`No checkpoints found for job ${jobId}`);
    return;
  }

  try {
    const exportDir = await checkpoints.exportCheckpoint(best.id, format as any);
    piCtx.ui.notify(`📦 Checkpoint exported to: ${exportDir}\n  Format: ${format}\n  Checkpoint: ${best.id}`);
  } catch (err: any) {
    piCtx.ui.notify(`❌ Export failed: ${err.message}`);
  }
}

async function handleList(args: ParsedArgs, piCtx: any): Promise<void> {
  const orch = await getOrchestrator();
  const jobs = orch.listJobs();

  if (jobs.length === 0) {
    piCtx.ui.notify("No training jobs. Use /tekton:train start to begin.");
    return;
  }

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify(jobs, null, 2));
  } else {
    const lines = jobs.map((j: TrainingJob) =>
      `  ${j.id.slice(0, 8)}  ${j.method.padEnd(15)} ${j.status.padEnd(12)} ${(j.progress * 100).toFixed(0).padStart(3)}%  ${j.config.baseModel}`
    );
    piCtx.ui.notify(
      "🧠 Training Jobs\n\n" +
      "  ID       Method          Status       Progress  Model\n" +
      "  " + "─".repeat(75) + "\n" +
      lines.join("\n")
    );
  }
}

async function handleLogs(args: ParsedArgs, piCtx: any): Promise<void> {
  const jobId = args.positional[0];
  if (!jobId) {
    piCtx.ui.notify("Usage: /tekton:train logs <job-id>");
    return;
  }

  const orch = await getOrchestrator();
  const metrics = orch.getMetrics();
  const summary = metrics.getTrainingSummary(jobId);

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(metrics.exportMetrics(jobId));
  } else {
    piCtx.ui.notify(
      `📊 Training Metrics: ${jobId}\n\n` +
      `  Total Steps:     ${summary.totalSteps}\n` +
      `  Current Loss:    ${summary.currentLoss.toFixed(4)}\n` +
      `  Best Loss:       ${summary.bestLoss.toFixed(4)}\n` +
      `  Loss Reduction:  ${summary.lossReduction.toFixed(4)}\n` +
      `  Avg GPU Util:    ${summary.averageGpuUtil.toFixed(0)}%\n` +
      `  Avg Speed:       ${summary.averageSpeed.toFixed(1)} samples/s`
    );
  }
}

async function handleGPU(args: ParsedArgs, piCtx: any): Promise<void> {
  const orch = await getOrchestrator();
  const env = orch.getGPUMonitor().detectEnvironment();

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify(env, null, 2));
  } else {
    const lines: string[] = ["🖥️ GPU Information\n"];
    lines.push(`  Platform:  ${env.platform}`);
    lines.push(`  Python:    ${env.pythonAvailable ? env.pythonVersion : "Not found"}`);
    lines.push(`  CUDA:      ${env.cudaVersion ?? "Not found"}`);
    lines.push(`  GPUs:      ${env.gpus.length}`);

    for (const gpu of env.gpus) {
      lines.push(`\n  ${gpu.name}:`);
      lines.push(`    VRAM: ${gpu.vramUsedMB} / ${gpu.vramTotalMB} MB (free: ${gpu.vramFreeMB} MB)`);
      lines.push(`    Utilization: ${gpu.utilization}%`);
    }

    if (env.gpus.length === 0) {
      lines.push("\n  No GPUs detected. Training will use CPU (very slow).");
    }

    piCtx.ui.notify(lines.join("\n"));
  }
}
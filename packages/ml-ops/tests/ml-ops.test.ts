/**
 * ML-Ops Package Tests — Orchestrator, Config Builder, GPU Monitor,
 * Checkpoint Manager, Metrics Tracker, Dataset Pipeline, Eval Runner.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { Orchestrator } from "../src/orchestrator.js";
import { GPUMonitor } from "../src/gpu-monitor.js";
import { ConfigBuilder, parseTrainingPrompt, buildTrainingConfig } from "../src/config-builder.js";
import type { TrainingSpec } from "../src/config-builder.js";
import { CheckpointManager } from "../src/checkpoint-manager.js";
import { MetricsTracker } from "../src/metrics-tracker.js";
import { DatasetPipeline } from "../src/dataset-pipeline.js";
import { EvalRunner, DEFAULT_EVAL_CONFIG } from "../src/eval-runner.js";
import {
  generateQLoRAScript,
  generateTernaryScript,
  generateGRPOScript,
  generateEvalScript,
} from "../src/python-templates.js";
import { DEFAULT_TRAINING_CONFIG } from "../src/types.js";

const TMP = join(tmpdir(), "tekton-ml-ops-test");

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  // Clean up temp directories
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});

// ── Types & Constants ────────────────────────────────────────────────

describe("ML-Ops Types & Constants", () => {
  it("has correct DEFAULT_TRAINING_CONFIG", () => {
    expect(DEFAULT_TRAINING_CONFIG.method).toBe("qlora");
    expect(DEFAULT_TRAINING_CONFIG.baseModel).toBeTruthy();
    expect(DEFAULT_TRAINING_CONFIG.epochs).toBe(3);
    expect(DEFAULT_TRAINING_CONFIG.batchSize).toBe(4);
    expect(DEFAULT_TRAINING_CONFIG.precision).toBe("bf16");
    expect(DEFAULT_TRAINING_CONFIG.loraRank).toBe(64);
    expect(DEFAULT_TRAINING_CONFIG.useUnsloth).toBe(true);
  });
});

// ── Config Builder ───────────────────────────────────────────────────

describe("ConfigBuilder", () => {
  it("parses QLoRA prompt", () => {
    const spec = parseTrainingPrompt("fine-tune llama-3-8b on alpaca with qlora");
    expect(spec.method).toBe("qlora");
    expect(spec.baseModel).toBe("unsloth/llama-3-8b");
    expect(spec.dataset).toBe("tatsu-lab/alpaca");
  });

  it("parses GRPO prompt", () => {
    const spec = parseTrainingPrompt("train with grpo reasoning on openassistant");
    expect(spec.method).toBe("grpo");
    expect(spec.dataset).toBe("OpenAssistant/oasst2");
  });

  it("parses ternary prompt", () => {
    const spec = parseTrainingPrompt("ternary bitnet training for phi-3");
    expect(spec.method).toBe("ternary-bitnet");
    expect(spec.baseModel).toBe("microsoft/Phi-3-mini-4k-instruct");
  });

  it("parses epochs", () => {
    const spec = parseTrainingPrompt("fine-tune for 5 epochs on alpaca");
    expect(spec.epochs).toBe(5);
  });

  it("parses 4bit precision", () => {
    const spec = parseTrainingPrompt("4bit qlora training");
    expect(spec.precision).toBe("4bit");
  });

  it("parses VRAM budget", () => {
    const spec = parseTrainingPrompt("fine-tune with 24GB vram");
    expect(spec.vramBudgetMB).toBe(24576);
  });

  it("builds default config from spec", () => {
    const spec: TrainingSpec = { method: "qlora", baseModel: "test/model" };
    const config = buildTrainingConfig(spec);
    expect(config.method).toBe("qlora");
    expect(config.baseModel).toBe("test/model");
    expect(config.precision).toBe("4bit");
  });

  it("adjusts batch size for low VRAM", () => {
    const spec: TrainingSpec = { method: "qlora", vramBudgetMB: 8000 };
    const config = buildTrainingConfig(spec);
    expect(config.batchSize).toBeLessThanOrEqual(2); // adjusted for low VRAM
    expect(config.precision).toBe("4bit");
  });

  it("keeps larger batch for high VRAM", () => {
    const spec: TrainingSpec = { method: "qlora", vramBudgetMB: 48000 };
    const config = buildTrainingConfig(spec);
    expect(config.batchSize).toBeGreaterThanOrEqual(4); // large VRAM
  });

  it("applies GRPO method defaults", () => {
    const spec: TrainingSpec = { method: "grpo" };
    const config = buildTrainingConfig(spec);
    expect(config.grpoBeta).toBe(0.1);
    expect(config.precision).toBe("bf16");
  });
});

// ── GPU Monitor ──────────────────────────────────────────────────────

describe("GPUMonitor", () => {
  it("detects environment without crashing", () => {
    const monitor = new GPUMonitor();
    const env = monitor.detectEnvironment();
    expect(env).toBeDefined();
    expect(env.platform).toBe(process.platform);
    expect(env.gpus).toBeDefined();
    // On CI/dev machines there may or may not be GPUs
    expect(typeof env.nvidiaSmiAvailable).toBe("boolean");
    expect(typeof env.pythonAvailable).toBe("boolean");
  });

  it("estimates model VRAM", () => {
    const monitor = new GPUMonitor();
    // 7B params in fp16 ≈ 14GB model + overhead
    const vram = monitor.estimateModelVram(7e9, "fp16");
    expect(vram).toBeGreaterThan(0);
    // 4bit should be much less
    const vram4bit = monitor.estimateModelVram(7e9, "4bit");
    expect(vram4bit).toBeLessThan(vram);
  });
});

// ── Checkpoint Manager ───────────────────────────────────────────────

describe("CheckpointManager", () => {
  it("saves and lists checkpoints", () => {
    const cm = new CheckpointManager(join(TMP, "checkpoints"));
    const job = {
      id: "test-job-1",
      name: "test",
      method: "qlora" as const,
      status: "running" as const,
      config: DEFAULT_TRAINING_CONFIG,
      outputName: "test-model",
      outputDir: "./checkpoints",
      progress: 0.5,
      currentStep: 500,
      totalSteps: 1000,
      currentEpoch: 1,
      totalEpochs: 3,
      trainLoss: 1.5,
      evalLoss: 1.8,
      gpuUtil: 80,
      gpuVramUsedMB: 12000,
      samplesPerSecond: 5,
    };

    const cp = cm.saveCheckpoint(job, 500, 1.5, 1.8);
    expect(cp.id).toContain("test-job-1");
    expect(cp.trainLoss).toBe(1.5);
    expect(cp.evalLoss).toBe(1.8);

    const list = cm.listCheckpoints("test-job-1");
    expect(list.length).toBe(1);
    expect(list[0]!.trainLoss).toBe(1.5);
  });

  it("tracks best checkpoint", () => {
    const cm = new CheckpointManager(join(TMP, "checkpoints-best"));
    const job = {
      id: "best-job", name: "test", method: "qlora" as const, status: "running" as const,
      config: DEFAULT_TRAINING_CONFIG, outputName: "best-model", outputDir: "./checkpoints",
      progress: 0, currentStep: 0, totalSteps: 100, currentEpoch: 0, totalEpochs: 1,
      trainLoss: 0, evalLoss: 0, gpuUtil: 0, gpuVramUsedMB: 0, samplesPerSecond: 0,
    };
    cm.saveCheckpoint(job, 100, 2.0);
    cm.saveCheckpoint(job, 200, 1.5);
    const cp3 = cm.saveCheckpoint(job, 300, 1.2);

    const best = cm.getBestCheckpoint("best-job");
    expect(best).toBeDefined();
    expect(best!.trainLoss).toBe(1.2);
    expect(best!.isBest).toBe(true);
  });

  it("deletes checkpoints", () => {
    const cm = new CheckpointManager(join(TMP, "checkpoints-del"));
    const job = {
      id: "del-job", name: "test", method: "qlora" as const, status: "running" as const,
      config: DEFAULT_TRAINING_CONFIG, outputName: "del-model", outputDir: "./checkpoints",
      progress: 0, currentStep: 0, totalSteps: 100, currentEpoch: 0, totalEpochs: 1,
      trainLoss: 0, evalLoss: 0, gpuUtil: 0, gpuVramUsedMB: 0, samplesPerSecond: 0,
    };

    const cp = cm.saveCheckpoint(job, 100, 2.0);
    expect(cm.listCheckpoints("del-job").length).toBe(1);

    const deleted = cm.deleteCheckpoint(cp.id);
    expect(deleted).toBe(true);
    expect(cm.listCheckpoints("del-job").length).toBe(0);
  });

  it("cleans up old checkpoints", () => {
    const cm = new CheckpointManager(join(TMP, "checkpoints-cleanup"));
    const job = {
      id: "cleanup-job", name: "test", method: "qlora" as const, status: "running" as const,
      config: DEFAULT_TRAINING_CONFIG, outputName: "cleanup-model", outputDir: "./checkpoints",
      progress: 0, currentStep: 0, totalSteps: 100, currentEpoch: 0, totalEpochs: 1,
      trainLoss: 0, evalLoss: 0, gpuUtil: 0, gpuVramUsedMB: 0, samplesPerSecond: 0,
    };

    cm.saveCheckpoint(job, 100, 3.0);
    cm.saveCheckpoint(job, 200, 2.5);
    cm.saveCheckpoint(job, 300, 2.0);
    cm.saveCheckpoint(job, 400, 1.5);
    cm.saveCheckpoint(job, 500, 1.0);

    const deleted = cm.cleanup(2);
    expect(deleted).toBeGreaterThanOrEqual(2); // Keep only 2 best
    expect(cm.listCheckpoints("cleanup-job").length).toBeLessThanOrEqual(3); // best + 2 kept
  });
});

// ── Metrics Tracker ──────────────────────────────────────────────────

describe("MetricsTracker", () => {
  it("records and retrieves metrics", () => {
    const tracker = new MetricsTracker(":memory:");
    tracker.recordMetric("job-1", {
      step: 100, epoch: 0.5, trainLoss: 2.5, learningRate: 0.0002,
      gpuUtil: 85, gpuVramMB: 14000, samplesPerSecond: 10,
    });
    tracker.recordMetric("job-1", {
      step: 200, epoch: 1.0, trainLoss: 2.0, learningRate: 0.0001,
      gpuUtil: 90, gpuVramMB: 15000, samplesPerSecond: 12,
    });

    const metrics = tracker.getMetrics("job-1");
    expect(metrics.length).toBe(2);
    expect(metrics[0]!.step).toBe(100);
    expect(metrics[1]!.trainLoss).toBe(2.0);
  });

  it("parses HuggingFace log lines", () => {
    const tracker = new MetricsTracker(":memory:");
    tracker.parseLogLine("job-1", '{"loss": 2.345, "learning_rate": 0.0001, "epoch": 0.5, "step": 100}');
    const metrics = tracker.getMetrics("job-1");
    expect(metrics.length).toBe(1);
    expect(metrics[0]!.trainLoss).toBe(2.345);
    expect(metrics[0]!.step).toBe(100);
  });

  it("parses Unsloth-style log lines", () => {
    const tracker = new MetricsTracker(":memory:");
    tracker.parseLogLine("job-1", "Step 200 | Loss: 1.876 | LR: 1.5e-04 | Epoch: 1.0");
    const metrics = tracker.getMetrics("job-1");
    expect(metrics.length).toBe(1);
    expect(metrics[0]!.trainLoss).toBe(1.876);
    expect(metrics[0]!.step).toBe(200);
  });

  it("computes training summary", () => {
    const tracker = new MetricsTracker(":memory:");
    tracker.recordMetric("job-1", { step: 100, epoch: 0.5, trainLoss: 3.0, learningRate: 0.0002, gpuUtil: 80, gpuVramMB: 14000, samplesPerSecond: 8 });
    tracker.recordMetric("job-1", { step: 200, epoch: 1.0, trainLoss: 2.0, learningRate: 0.0001, gpuUtil: 90, gpuVramMB: 15000, samplesPerSecond: 10 });

    const summary = tracker.getTrainingSummary("job-1");
    expect(summary.totalSteps).toBe(200);
    expect(summary.currentLoss).toBe(2.0);
    expect(summary.bestLoss).toBe(2.0);
    expect(summary.lossReduction).toBe(1.0);
  });

  it("exports metrics as JSON", () => {
    const tracker = new MetricsTracker(":memory:");
    tracker.recordMetric("job-1", { step: 100, epoch: 0.5, trainLoss: 2.5, learningRate: 0.0002, gpuUtil: 85, gpuVramMB: 14000, samplesPerSecond: 10 });

    const json = tracker.exportMetrics("job-1");
    const parsed = JSON.parse(json);
    expect(parsed.jobId).toBe("job-1");
    expect(parsed.metrics.length).toBe(1);
  });

  it("clears metrics", () => {
    const tracker = new MetricsTracker(":memory:");
    tracker.recordMetric("job-1", { step: 100, epoch: 0.5, trainLoss: 2.5, learningRate: 0.0002, gpuUtil: 85, gpuVramMB: 14000, samplesPerSecond: 10 });
    tracker.clearMetrics("job-1");
    expect(tracker.getMetrics("job-1").length).toBe(0);
  });
});

// ── Dataset Pipeline ────────────────────────────────────────────────

describe("DatasetPipeline", () => {
  it("creates pipeline instance", () => {
    const pipeline = new DatasetPipeline(join(TMP, "datasets"));
    expect(pipeline).toBeDefined();
  });

  it("lists empty datasets initially", () => {
    const pipeline = new DatasetPipeline(join(TMP, "datasets"));
    const datasets = pipeline.listDatasets();
    expect(datasets).toEqual([]);
  });
});

// ── Eval Runner ──────────────────────────────────────────────────────

describe("EvalRunner", () => {
  it("has correct default config", () => {
    expect(DEFAULT_EVAL_CONFIG.tasks).toContain("mmlu");
    expect(DEFAULT_EVAL_CONFIG.numShots).toBe(5);
    expect(DEFAULT_EVAL_CONFIG.batchSize).toBe(8);
  });

  it("generates eval command", () => {
    const runner = new EvalRunner(join(TMP, "eval"));
    const cmd = runner.generateCommand({
      model: "test/model",
      tasks: ["mmlu", "hellaswag"],
      numShots: 5,
      batchSize: 8,
      maxSeqLength: 2048,
      device: "auto",
      outputDir: join(TMP, "eval"),
    });
    expect(cmd).toContain("lm_eval");
    expect(cmd).toContain("test/model");
    expect(cmd).toContain("mmlu,hellaswag");
  });
});

// ── Python Templates ─────────────────────────────────────────────────

describe("Python Templates", () => {
  const baseConfig = {
    baseModel: "unsloth/llama-3-8b",
    outputDir: "./checkpoints",
    dataset: "tatsu-lab/alpaca",
    epochs: 3,
    batchSize: 4,
    gradientAccumulationSteps: 8,
    learningRate: 0.0002,
    maxSeqLength: 2048,
    loraRank: 64,
    loraAlpha: 16,
    loraDropout: 0.05,
    saveSteps: 500,
    evalSteps: 500,
    loggingSteps: 10,
    useUnsloth: true,
    useFlashAttention: true,
    precision: "bf16",
    seed: 42,
    outputName: "test-model",
  };

  it("generates QLoRA script", () => {
    const script = generateQLoRAScript(baseConfig);
    expect(script).toContain("#!/usr/bin/env python3");
    expect(script).toContain("unsloth/llama-3-8b");
    expect(script).toContain("tatsu-lab/alpaca");
    expect(script).toContain("FastLanguageModel");
    expect(script).toContain("SFTTrainer");
  });

  it("generates ternary script", () => {
    const script = generateTernaryScript({
      baseModel: "test/model",
      outputDir: "./checkpoints",
      dataset: "alpaca",
      epochs: 3,
      batchSize: 4,
      learningRate: 0.0002,
      maxSeqLength: 2048,
      loraRank: 32,
      seed: 42,
      outputName: "test",
    });
    expect(script).toContain("#!/usr/bin/env python3");
    expect(script).toContain("TernaryWeightQuantizer");
    expect(script).toContain("test/model");
  });

  it("generates GRPO script", () => {
    const script = generateGRPOScript({
      baseModel: "test/model",
      outputDir: "./checkpoints",
      dataset: "alpaca",
      epochs: 3,
      batchSize: 4,
      learningRate: 0.0002,
      maxSeqLength: 2048,
      grpoBeta: 0.1,
      rewardModel: "",
      seed: 42,
      outputName: "test",
    });
    expect(script).toContain("#!/usr/bin/env python3");
    expect(script).toContain("GRPOTrainer");
    expect(script).toContain("reward_fn");
  });

  it("generates GRPO script with reward model", () => {
    const script = generateGRPOScript({
      baseModel: "test/model",
      outputDir: "./checkpoints",
      dataset: "alpaca",
      epochs: 3,
      batchSize: 4,
      learningRate: 0.0002,
      maxSeqLength: 2048,
      grpoBeta: 0.1,
      rewardModel: "reward/model",
      seed: 42,
      outputName: "test",
    });
    expect(script).toContain("reward/model");
    expect(script).toContain("REWARD_MODEL");
  });

  it("generates eval script", () => {
    const script = generateEvalScript({
      model: "test/model",
      tasks: ["mmlu", "hellaswag"],
      numShots: 5,
      batchSize: 8,
      maxSeqLength: 2048,
      outputDir: "./eval-results",
    });
    expect(script).toContain("#!/usr/bin/env python3");
    expect(script).toContain("lm_eval");
    expect(script).toContain("test/model");
  });
});

// ── Orchestrator ─────────────────────────────────────────────────────

describe("Orchestrator", () => {
  it("creates orchestrator instance", () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    expect(orch).toBeDefined();
    orch.close();
  });

  it("detects environment", async () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const env = await orch.initialize();
    expect(env).toBeDefined();
    expect(env.platform).toBe(process.platform);
    orch.close();
  });

  it("gets status", () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const status = orch.getStatus();
    expect(status.activeJobs).toBeDefined();
    expect(status.completedJobs).toBeDefined();
    orch.close();
  });

  it("creates job from prompt", () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca with qlora");
    expect(job.id).toBeTruthy();
    expect(job.method).toBe("qlora");
    expect(job.status).toBe("queued");
    orch.close();
  });

  it("creates job from structured request", () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJob({
      method: "grpo",
      baseModel: "test/model",
      dataset: "alpaca",
      outputName: "test-grpo",
      options: { grpoBeta: 0.2 },
    });
    expect(job.method).toBe("grpo");
    expect(job.config.grpoBeta).toBeDefined();
    expect(job.config.grpoBeta).not.toBe(0);
    orch.close();
  });

  it("creates job from config", () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromConfig({
      ...DEFAULT_TRAINING_CONFIG,
      method: "ternary-bitnet",
      baseModel: "test/model",
    });
    expect(job.method).toBe("ternary-bitnet");
    orch.close();
  });

  it("starts and lists jobs", async () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca");
    const started = await orch.startJob(job.id);
    expect(started.status).toBe("running");
    expect(started.logPath).toBeTruthy();

    const jobs = orch.listJobs();
    expect(jobs.length).toBe(1);
    orch.close();
  });

  it("stops a job", async () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca");
    await orch.startJob(job.id);
    const stopped = orch.stopJob(job.id);
    expect(stopped.status).toBe("cancelled");
    orch.close();
  });

  it("updates job progress", async () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca");
    await orch.startJob(job.id);

    orch.updateJobProgress(job.id, 100, 2.5);
    const updated = orch.getJob(job.id);
    expect(updated!.currentStep).toBe(100);
    expect(updated!.trainLoss).toBe(2.5);
    orch.close();
  });

  it("completes a job", async () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca");
    await orch.startJob(job.id);
    orch.updateJobProgress(job.id, 1000, 1.0);
    const completed = orch.completeJob(job.id, 0.5);
    expect(completed.status).toBe("completed");
    expect(completed.trainLoss).toBe(0.5);
    orch.close();
  });

  it("fails a job", async () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    const job = orch.createJobFromPrompt("fine-tune llama-3-8b on alpaca");
    await orch.startJob(job.id);
    const failed = orch.failJob(job.id, "OOM");
    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("OOM");
    orch.close();
  });

  it("accesses subsystems", () => {
    const orch = new Orchestrator(join(TMP, "ml-ops"));
    expect(orch.getCheckpoints()).toBeDefined();
    expect(orch.getMetrics()).toBeDefined();
    expect(orch.getDatasetPipeline()).toBeDefined();
    expect(orch.getGPUMonitor()).toBeDefined();
    expect(orch.getEvalRunner()).toBeDefined();
    orch.close();
  });
});
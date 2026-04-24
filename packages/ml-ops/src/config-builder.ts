/**
 * Config Builder — Natural language spec → TrainingConfig.
 * Transforms human-readable training descriptions into structured configs.
 */
import { DEFAULT_TRAINING_CONFIG } from "./types.js";
import type { TrainingConfig, TrainingMethod, Precision } from "./types.js";

/** Natural language spec for training */
export interface TrainingSpec {
  /** e.g. "fine-tune llama-3-8b on my data" */
  prompt?: string;
  /** Explicit method override */
  method?: TrainingMethod;
  /** Base model */
  baseModel?: string;
  /** Dataset name or path */
  dataset?: string;
  /** Output name */
  outputName?: string;
  /** Number of epochs */
  epochs?: number;
  /** Target precision */
  precision?: Precision;
  /** VRAM budget in MB (auto-adjusts batch size) */
  vramBudgetMB?: number;
  /** Number of GPUs */
  numGpus?: number;
  /** Any explicit config overrides */
  overrides?: Partial<TrainingConfig>;
}

/** Parse natural language prompt into a TrainingSpec */
export function parseTrainingPrompt(prompt: string): TrainingSpec {
  const spec: TrainingSpec = {};

  const lower = prompt.toLowerCase();

  // Method detection
  if (lower.includes("qlora") || lower.includes("efficient") || lower.includes("lora")) {
    spec.method = "qlora";
  } else if (lower.includes("ternary") || lower.includes("1.58") || lower.includes("bitnet")) {
    spec.method = "ternary-bitnet";
  } else if (lower.includes("grpo") || lower.includes("reasoning") || lower.includes("rl")) {
    spec.method = "grpo";
  } else if (lower.includes("full") && lower.includes("fine")) {
    spec.method = "full-finetune";
  } else if (lower.includes("lora") || lower.includes("adapter")) {
    spec.method = "lora";
  }

  // Model detection
  const modelPatterns: Array<[RegExp, string]> = [
    [/llama[- ]?3[- ]?8b/i, "unsloth/llama-3-8b"],
    [/llama[- ]?3[- ]?70b/i, "unsloth/llama-3-70b"],
    [/mistral[- ]?7b/i, "unsloth/mistral-7b"],
    [/mistral[- ]?nemo/i, "unsloth/Mistral-Nemo-12B"],
    [/gemma[- ]?2[- ]?9b/i, "unsloth/gemma-2-9b"],
    [/gemma[- ]?2[- ]?27b/i, "unsloth/gemma-2-27b"],
    [/phi[- ]?3/i, "microsoft/Phi-3-mini-4k-instruct"],
    [/qwen[- ]?2[- ]?7b/i, "Qwen/Qwen2-7B"],
    [/deepseek[- ]?coder/i, "deepseek-ai/deepseek-coder-6.7B"],
  ];

  for (const [pattern, model] of modelPatterns) {
    if (pattern.test(prompt)) {
      spec.baseModel = model;
      break;
    }
  }

  // Epoch detection
  const epochMatch = prompt.match(/(\d+)\s*epoch/i);
  if (epochMatch) spec.epochs = Number(epochMatch[1]);

  // Precision detection
  if (lower.includes("4bit") || lower.includes("4-bit")) {
    spec.precision = "4bit";
  } else if (lower.includes("8bit") || lower.includes("8-bit")) {
    spec.precision = "8bit";
  } else if (lower.includes("bf16") || lower.includes("bfloat16")) {
    spec.precision = "bf16";
  } else if (lower.includes("fp16") || lower.includes("float16")) {
    spec.precision = "fp16";
  }

  // Dataset detection
  const dataPatterns: Array<[RegExp, string]> = [
    [/alpaca/i, "tatsu-lab/alpaca"],
    [/dolly/i, "databricks/databricks-dolly-15k"],
    [/open[- ]?assistant/i, "OpenAssistant/oasst2"],
    [/code/i, "codeparrot/github-code-clean"],
  ];

  for (const [pattern, dataset] of dataPatterns) {
    if (pattern.test(prompt)) {
      spec.dataset = dataset;
      break;
    }
  }

  // VRAM detection
  const vramMatch = prompt.match(/(\d+)\s*gb?\s*(vram|memory|ram)/i);
  if (vramMatch) spec.vramBudgetMB = Number(vramMatch[1]) * 1024;

  return spec;
}

/** Build a TrainingConfig from a TrainingSpec */
export function buildTrainingConfig(spec: TrainingSpec): TrainingConfig {
  let config: TrainingConfig = { ...DEFAULT_TRAINING_CONFIG };

  // Apply method defaults
  const method = spec.method ?? inferMethod(spec);
  config.method = method;

  // Apply method-specific overrides
  if (method === "qlora") {
    config.precision = "4bit";
    config.useUnsloth = true;
    config.loraRank = 64;
    config.loraAlpha = 16;
  } else if (method === "ternary-bitnet") {
    config.precision = "fp16";
    config.useUnsloth = false;
    config.useFlashAttention = false;
    config.loraRank = 32;
  } else if (method === "grpo") {
    config.precision = "bf16";
    config.useUnsloth = false;
    config.grpoBeta = 0.1;
  } else if (method === "lora") {
    config.precision = "bf16";
    config.loraRank = 16;
  } else if (method === "full-finetune") {
    config.precision = "bf16";
    config.batchSize = 2;
    config.gradientAccumulationSteps = 16;
    config.loraRank = 0; // Not LoRA
  }

  // Apply spec overrides
  if (spec.baseModel) config.baseModel = spec.baseModel;
  if (spec.dataset) config.dataset = spec.dataset;
  if (spec.outputName) config.outputName = spec.outputName;
  if (spec.epochs) config.epochs = spec.epochs;
  if (spec.precision) config.precision = spec.precision;

  // Auto-adjust for VRAM budget
  if (spec.vramBudgetMB) {
    config = adjustForVram(config, spec.vramBudgetMB);
  }

  // Apply explicit overrides last
  if (spec.overrides) {
    config = { ...config, ...spec.overrides };
  }

  return config;
}

/** Infer the best training method from available info */
function inferMethod(spec: TrainingSpec): TrainingMethod {
  if (spec.prompt) {
    const lower = spec.prompt.toLowerCase();
    if (lower.includes("reasoning") || lower.includes("grpo")) return "grpo";
    if (lower.includes("ternary") || lower.includes("bitnet")) return "ternary-bitnet";
    if (lower.includes("full")) return "full-finetune";
    if (lower.includes("lora")) return "lora";
  }
  return "qlora"; // Default to most common method
}

/** Adjust batch size and gradient accumulation for VRAM constraints */
function adjustForVram(config: TrainingConfig, budgetMB: number): TrainingConfig {
  const adjusted = { ...config };

  // Simple heuristic: reduce batch size for low VRAM
  if (budgetMB < 8000) {       // <8GB
    adjusted.batchSize = 1;
    adjusted.gradientAccumulationSteps = 32;
    adjusted.precision = "4bit";
    adjusted.maxSeqLength = 1024;
  } else if (budgetMB < 16000) { // <16GB
    adjusted.batchSize = 2;
    adjusted.gradientAccumulationSteps = 16;
    adjusted.precision = "4bit";
  } else if (budgetMB < 24000) { // <24GB
    adjusted.batchSize = 4;
    adjusted.gradientAccumulationSteps = 8;
  } else if (budgetMB < 48000) { // <48GB
    adjusted.batchSize = 8;
    adjusted.gradientAccumulationSteps = 4;
  }

  return adjusted;
}
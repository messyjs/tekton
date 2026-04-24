/**
 * ML-Ops Types — Training orchestration, GPU monitoring, dataset pipeline, evaluation.
 */
import { Type, Static } from "@sinclair/typebox";

// ── Environment Detection ─────────────────────────────────────────────

export const GPUInfoSchema = Type.Object({
  detected: Type.Boolean(),
  name: Type.String(),
  vramTotalMB: Type.Number(),
  vramUsedMB: Type.Number(),
  vramFreeMB: Type.Number(),
  utilization: Type.Number(),
  driver: Type.Optional(Type.String()),
  cuda: Type.Optional(Type.String()),
});
export type GPUInfo = Static<typeof GPUInfoSchema>;

export const EnvInfoSchema = Type.Object({
  platform: Type.String(),
  pythonAvailable: Type.Boolean(),
  pythonVersion: Type.Optional(Type.String()),
  nvidiaSmiAvailable: Type.Boolean(),
  gpus: Type.Array(GPUInfoSchema),
  cudaVersion: Type.Optional(Type.String()),
  vramTotalMB: Type.Number(),
});
export type EnvInfo = Static<typeof EnvInfoSchema>;

// ── Training Config ──────────────────────────────────────────────────

export const TrainingMethod = Type.Union([
  Type.Literal("qlora"),
  Type.Literal("ternary-bitnet"),
  Type.Literal("grpo"),
  Type.Literal("full-finetune"),
  Type.Literal("lora"),
]);
export type TrainingMethod = Static<typeof TrainingMethod>;

export const PrecisionSchema = Type.Union([
  Type.Literal("fp16"),
  Type.Literal("bf16"),
  Type.Literal("fp32"),
  Type.Literal("8bit"),
  Type.Literal("4bit"),
]);
export type Precision = Static<typeof PrecisionSchema>;

export const TrainingConfigSchema = Type.Object({
  method: TrainingMethod,
  baseModel: Type.String(),
  outputName: Type.String(),
  outputDir: Type.String({ default: "./checkpoints" }),
  dataset: Type.String(),
  datasetSplit: Type.String({ default: "train" }),
  epochs: Type.Number({ default: 3 }),
  batchSize: Type.Number({ default: 4 }),
  gradientAccumulationSteps: Type.Number({ default: 8 }),
  learningRate: Type.Number({ default: 0.0002 }),
  weightDecay: Type.Number({ default: 0.01 }),
  warmupSteps: Type.Number({ default: 100 }),
  maxSeqLength: Type.Number({ default: 2048 }),
  precision: PrecisionSchema,
  loraRank: Type.Number({ default: 64 }),
  loraAlpha: Type.Number({ default: 16 }),
  loraDropout: Type.Number({ default: 0.05 }),
  grpoBeta: Type.Optional(Type.Number()),
  grpoRewardModel: Type.Optional(Type.String()),
  saveSteps: Type.Number({ default: 500 }),
  evalSteps: Type.Number({ default: 500 }),
  loggingSteps: Type.Number({ default: 10 }),
  useUnsloth: Type.Boolean({ default: true }),
  useFlashAttention: Type.Boolean({ default: true }),
  deepspeed: Type.Optional(Type.String()),
  fsdp: Type.Boolean({ default: false }),
  resumeFromCheckpoint: Type.Optional(Type.String()),
  gpuIds: Type.String({ default: "0" }),
  seed: Type.Number({ default: 42 }),
});
export type TrainingConfig = Static<typeof TrainingConfigSchema>;

// ── Training Job Status ──────────────────────────────────────────────

export const JobStatus = Type.Union([
  Type.Literal("queued"),
  Type.Literal("preparing"),
  Type.Literal("running"),
  Type.Literal("evaluating"),
  Type.Literal("completed"),
  Type.Literal("failed"),
  Type.Literal("cancelled"),
]);
export type JobStatus = Static<typeof JobStatus>;

export const TrainingJobSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  method: TrainingMethod,
  status: JobStatus,
  config: TrainingConfigSchema,
  progress: Type.Number({ default: 0 }),
  currentStep: Type.Number({ default: 0 }),
  totalSteps: Type.Number({ default: 0 }),
  currentEpoch: Type.Number({ default: 0 }),
  totalEpochs: Type.Number({ default: 0 }),
  trainLoss: Type.Number({ default: 0 }),
  evalLoss: Type.Number({ default: 0 }),
  gpuUtil: Type.Number({ default: 0 }),
  gpuVramUsedMB: Type.Number({ default: 0 }),
  samplesPerSecond: Type.Number({ default: 0 }),
  startTime: Type.Optional(Type.Number()),
  endTime: Type.Optional(Type.Number()),
  error: Type.Optional(Type.String()),
  checkpointDir: Type.Optional(Type.String()),
  logPath: Type.Optional(Type.String()),
});
export type TrainingJob = Static<typeof TrainingJobSchema>;

// ── Checkpoint ────────────────────────────────────────────────────────

export const CheckpointSchema = Type.Object({
  id: Type.String(),
  jobId: Type.String(),
  step: Type.Number(),
  epoch: Type.Number(),
  trainLoss: Type.Number(),
  evalLoss: Type.Optional(Type.Number()),
  path: Type.String(),
  sizeMB: Type.Number(),
  timestamp: Type.Number(),
  isBest: Type.Boolean({ default: false }),
});
export type Checkpoint = Static<typeof CheckpointSchema>;

export const ExportFormat = Type.Union([
  Type.Literal("gguf"),
  Type.Literal("safetensors"),
  Type.Literal("onnx"),
  Type.Literal("mlx"),
]);
export type ExportFormat = Static<typeof ExportFormat>;

// ── Dataset ───────────────────────────────────────────────────────────

export const DatasetFormatSchema = Type.Union([
  Type.Literal("alpaca"),
  Type.Literal("sharegpt"),
  Type.Literal("jsonl"),
  Type.Literal("parquet"),
  Type.Literal("csv"),
  Type.Literal("huggingface"),
]);
export type DatasetFormat = Static<typeof DatasetFormatSchema>;

export const DatasetConfigSchema = Type.Object({
  name: Type.String(),
  source: Type.String(),
  format: DatasetFormatSchema,
  split: Type.String({ default: "train" }),
  tokenizer: Type.String(),
  maxSeqLength: Type.Number({ default: 2048 }),
  shuffleSeed: Type.Number({ default: 42 }),
  trainSplitRatio: Type.Number({ default: 0.9 }),
});
export type DatasetConfig = Static<typeof DatasetConfigSchema>;

export const DatasetInfoSchema = Type.Object({
  name: Type.String(),
  numSamples: Type.Number(),
  numTokens: Type.Number(),
  avgSeqLength: Type.Number(),
  trainSamples: Type.Number(),
  valSamples: Type.Number(),
  shards: Type.Number(),
  path: Type.String(),
});
export type DatasetInfo = Static<typeof DatasetInfoSchema>;

// ── Metrics ───────────────────────────────────────────────────────────

export const MetricPointSchema = Type.Object({
  step: Type.Number(),
  epoch: Type.Number(),
  trainLoss: Type.Number(),
  evalLoss: Type.Optional(Type.Number()),
  learningRate: Type.Number(),
  gpuUtil: Type.Number(),
  gpuVramMB: Type.Number(),
  samplesPerSecond: Type.Number(),
  timestamp: Type.Number(),
});
export type MetricPoint = Static<typeof MetricPointSchema>;

export const EvalResultSchema = Type.Object({
  benchmark: Type.String(),
  scores: Type.Record(Type.String(), Type.Number()),
  overall: Type.Number(),
  timestamp: Type.Number(),
});
export type EvalResult = Static<typeof EvalResultSchema>;

// ── Orchestrator ──────────────────────────────────────────────────────

export const TrainingRequestSchema = Type.Object({
  method: TrainingMethod,
  baseModel: Type.String(),
  dataset: Type.String(),
  outputName: Type.String(),
  options: Type.Partial(TrainingConfigSchema),
});
export type TrainingRequest = Static<typeof TrainingRequestSchema>;

export const OrchestratorStateSchema = Type.Object({
  initialized: Type.Boolean(),
  envInfo: Type.Optional(EnvInfoSchema),
  activeJobs: Type.Array(Type.String()),
  completedJobs: Type.Array(Type.String()),
  totalGpuHours: Type.Number({ default: 0 }),
});
export type OrchestratorState = Static<typeof OrchestratorStateSchema>;

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  method: "qlora",
  baseModel: "unsloth/llama-3-8b",
  outputName: "tekton-finetune",
  outputDir: "./checkpoints",
  dataset: "alpaca",
  datasetSplit: "train",
  epochs: 3,
  batchSize: 4,
  gradientAccumulationSteps: 8,
  learningRate: 0.0002,
  weightDecay: 0.01,
  warmupSteps: 100,
  maxSeqLength: 2048,
  precision: "bf16",
  loraRank: 64,
  loraAlpha: 16,
  loraDropout: 0.05,
  saveSteps: 500,
  evalSteps: 500,
  loggingSteps: 10,
  useUnsloth: true,
  useFlashAttention: true,
  fsdp: false,
  gpuIds: "0",
  seed: 42,
};
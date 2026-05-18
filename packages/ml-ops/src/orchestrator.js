/**
 * Orchestrator — End-to-end training workflow: detect → prepare → train → monitor → evaluate → export.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { GPUMonitor } from "./gpu-monitor.js";
import { parseTrainingPrompt, buildTrainingConfig } from "./config-builder.js";
import { CheckpointManager } from "./checkpoint-manager.js";
import { MetricsTracker } from "./metrics-tracker.js";
import { DatasetPipeline } from "./dataset-pipeline.js";
import { EvalRunner } from "./eval-runner.js";
import { generateQLoRAScript, generateTernaryScript, generateGRPOScript, } from "./python-templates.js";
export class Orchestrator {
    gpu;
    checkpointManager;
    metricsTracker;
    datasetPipeline;
    evalRunner;
    jobs = new Map();
    baseDir;
    initialized = false;
    constructor(baseDir = "./ml-ops") {
        this.baseDir = resolve(baseDir);
        mkdirSync(this.baseDir, { recursive: true });
        this.gpu = new GPUMonitor();
        this.checkpointManager = new CheckpointManager(join(this.baseDir, "checkpoints"));
        this.metricsTracker = new MetricsTracker(join(this.baseDir, "metrics.db"));
        this.datasetPipeline = new DatasetPipeline(join(this.baseDir, "datasets"));
        this.evalRunner = new EvalRunner(join(this.baseDir, "eval-results"));
    }
    /** Initialize: detect environment, load state */
    async initialize() {
        const env = this.gpu.detectEnvironment();
        this.checkpointManager.loadFromDisk();
        this.initialized = true;
        return env;
    }
    /** Get orchestrator status */
    getStatus() {
        const activeJobs = [];
        const completedJobs = [];
        for (const [id, job] of this.jobs.entries()) {
            if (job.status === "running" || job.status === "preparing" || job.status === "queued") {
                activeJobs.push(id);
            }
            else if (job.status === "completed") {
                completedJobs.push(id);
            }
        }
        return {
            initialized: this.initialized,
            env: this.gpu.detectEnvironment(),
            activeJobs,
            completedJobs,
            totalGpuHours: 0,
        };
    }
    /** Create a training job from a natural language prompt */
    createJobFromPrompt(prompt) {
        const spec = parseTrainingPrompt(prompt);
        return this.createJobFromSpec(spec);
    }
    /** Create a training job from a structured request (alias) */
    createJob(request) {
        return this.createJobFromRequest(request);
    }
    /** Create a training job from a structured request */
    createJobFromRequest(request) {
        const spec = {
            method: request.method,
            baseModel: request.baseModel,
            dataset: request.dataset,
            outputName: request.outputName,
            overrides: request.options,
        };
        return this.createJobFromSpec(spec);
    }
    /** Create a training job with explicit config */
    createJobFromConfig(config) {
        const id = `job-${randomUUID().slice(0, 8)}`;
        const totalSteps = config.epochs * 1000; // Approximate
        const job = {
            id,
            name: config.outputName,
            method: config.method,
            status: "queued",
            config,
            progress: 0,
            currentStep: 0,
            totalSteps,
            currentEpoch: 0,
            totalEpochs: config.epochs,
            trainLoss: 0,
            evalLoss: 0,
            gpuUtil: 0,
            gpuVramUsedMB: 0,
            samplesPerSecond: 0,
            startTime: Date.now(),
        };
        this.jobs.set(id, job);
        return job;
    }
    /** Start a queued/prepared job — generates training script and sets status */
    async startJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        // Generate training script
        job.status = "preparing";
        job.startTime = Date.now();
        const scriptContent = this.generateTrainingScript(job.config);
        const scriptDir = join(this.baseDir, "scripts", job.id);
        mkdirSync(scriptDir, { recursive: true });
        const scriptPath = join(scriptDir, `train_${job.config.method}.py`);
        writeFileSync(scriptPath, scriptContent);
        job.logPath = scriptPath;
        // Update GPU info
        const gpuInfo = this.gpu.getUtilization();
        job.gpuVramUsedMB = gpuInfo.vramUsedMB;
        job.status = "running";
        return job;
    }
    /** Stop a running job */
    stopJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        job.status = "cancelled";
        job.endTime = Date.now();
        return job;
    }
    /** Get a job */
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    /** List all jobs */
    listJobs() {
        return Array.from(this.jobs.values());
    }
    /** Update job progress (called by monitoring loop) */
    updateJobProgress(jobId, step, trainLoss, evalLoss) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        job.currentStep = step;
        job.trainLoss = trainLoss;
        job.evalLoss = evalLoss ?? job.evalLoss;
        job.progress = job.totalSteps > 0 ? step / job.totalSteps : 0;
        job.currentEpoch = Math.floor(step / (job.totalSteps / job.totalEpochs));
        const gpuInfo = this.gpu.getUtilization();
        job.gpuUtil = gpuInfo.gpuUtil;
        job.gpuVramUsedMB = gpuInfo.vramUsedMB;
        // Record metric
        this.metricsTracker.recordMetric(jobId, {
            step,
            epoch: job.currentEpoch,
            trainLoss,
            evalLoss,
            learningRate: job.config.learningRate,
            gpuUtil: gpuInfo.gpuUtil,
            gpuVramMB: gpuInfo.vramUsedMB,
            samplesPerSecond: 0,
        });
        // Save checkpoint periodically
        if (step % job.config.saveSteps === 0) {
            this.checkpointManager.saveCheckpoint(job, step, trainLoss, evalLoss);
        }
    }
    /** Mark job completed */
    completeJob(jobId, finalLoss) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        job.status = "completed";
        job.trainLoss = finalLoss;
        job.progress = 1.0;
        job.endTime = Date.now();
        // Save final checkpoint
        this.checkpointManager.saveCheckpoint(job, job.currentStep, finalLoss);
        return job;
    }
    /** Mark job failed */
    failJob(jobId, error) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        job.status = "failed";
        job.error = error;
        job.endTime = Date.now();
        return job;
    }
    /** Evaluate a trained model */
    async evaluateModel(jobId, tasks = ["mmlu", "hellaswag"]) {
        const job = this.jobs.get(jobId);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        const result = await this.evalRunner.run({
            model: join(job.config.outputDir, job.config.outputName),
            tasks,
            numShots: 5,
            batchSize: 8,
            maxSeqLength: job.config.maxSeqLength,
            device: "auto",
            outputDir: join(this.baseDir, "eval-results", jobId),
        });
        return result;
    }
    /** Get checkpoint manager */
    getCheckpoints() {
        return this.checkpointManager;
    }
    /** Get metrics tracker */
    getMetrics() {
        return this.metricsTracker;
    }
    /** Get dataset pipeline */
    getDatasetPipeline() {
        return this.datasetPipeline;
    }
    /** Get GPU monitor */
    getGPUMonitor() {
        return this.gpu;
    }
    /** Get eval runner */
    getEvalRunner() {
        return this.evalRunner;
    }
    /** Close all resources */
    close() {
        this.metricsTracker.close();
    }
    // ── Private ──────────────────────────────────────────────────────────
    createJobFromSpec(spec) {
        const config = buildTrainingConfig(spec);
        return this.createJobFromConfig(config);
    }
    generateTrainingScript(config) {
        const scriptConfig = {
            baseModel: config.baseModel,
            outputDir: config.outputDir,
            dataset: config.dataset,
            epochs: config.epochs,
            batchSize: config.batchSize,
            gradientAccumulationSteps: config.gradientAccumulationSteps,
            learningRate: config.learningRate,
            maxSeqLength: config.maxSeqLength,
            loraRank: config.loraRank,
            loraAlpha: config.loraAlpha,
            loraDropout: config.loraDropout,
            saveSteps: config.saveSteps,
            evalSteps: config.evalSteps,
            loggingSteps: config.loggingSteps,
            useUnsloth: config.useUnsloth,
            useFlashAttention: config.useFlashAttention,
            precision: config.precision,
            seed: config.seed,
            outputName: config.outputName,
            grpoBeta: config.grpoBeta ?? 0.04,
            rewardModel: config.grpoRewardModel ?? "",
        };
        switch (config.method) {
            case "qlora":
            case "lora":
                return generateQLoRAScript(scriptConfig);
            case "ternary-bitnet":
                return generateTernaryScript(scriptConfig);
            case "grpo":
                return generateGRPOScript(scriptConfig);
            case "full-finetune":
                return generateQLoRAScript({ ...scriptConfig, useUnsloth: false });
            default:
                return generateQLoRAScript(scriptConfig);
        }
    }
}
//# sourceMappingURL=orchestrator.js.map
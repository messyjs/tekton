import { GPUMonitor } from "./gpu-monitor.js";
import { CheckpointManager } from "./checkpoint-manager.js";
import { MetricsTracker } from "./metrics-tracker.js";
import { DatasetPipeline } from "./dataset-pipeline.js";
import { EvalRunner } from "./eval-runner.js";
import type { TrainingConfig, TrainingJob, EnvInfo, TrainingRequest } from "./types.js";
export interface OrchestratorStatus {
    initialized: boolean;
    env: EnvInfo | null;
    activeJobs: string[];
    completedJobs: string[];
    totalGpuHours: number;
}
export declare class Orchestrator {
    private gpu;
    private checkpointManager;
    private metricsTracker;
    private datasetPipeline;
    private evalRunner;
    private jobs;
    private baseDir;
    private initialized;
    constructor(baseDir?: string);
    /** Initialize: detect environment, load state */
    initialize(): Promise<EnvInfo>;
    /** Get orchestrator status */
    getStatus(): OrchestratorStatus;
    /** Create a training job from a natural language prompt */
    createJobFromPrompt(prompt: string): TrainingJob;
    /** Create a training job from a structured request (alias) */
    createJob(request: TrainingRequest): TrainingJob;
    /** Create a training job from a structured request */
    createJobFromRequest(request: TrainingRequest): TrainingJob;
    /** Create a training job with explicit config */
    createJobFromConfig(config: TrainingConfig): TrainingJob;
    /** Start a queued/prepared job — generates training script and sets status */
    startJob(jobId: string): Promise<TrainingJob>;
    /** Stop a running job */
    stopJob(jobId: string): TrainingJob;
    /** Get a job */
    getJob(jobId: string): TrainingJob | undefined;
    /** List all jobs */
    listJobs(): TrainingJob[];
    /** Update job progress (called by monitoring loop) */
    updateJobProgress(jobId: string, step: number, trainLoss: number, evalLoss?: number): void;
    /** Mark job completed */
    completeJob(jobId: string, finalLoss: number): TrainingJob;
    /** Mark job failed */
    failJob(jobId: string, error: string): TrainingJob;
    /** Evaluate a trained model */
    evaluateModel(jobId: string, tasks?: string[]): Promise<import("./types.js").EvalResult>;
    /** Get checkpoint manager */
    getCheckpoints(): CheckpointManager;
    /** Get metrics tracker */
    getMetrics(): MetricsTracker;
    /** Get dataset pipeline */
    getDatasetPipeline(): DatasetPipeline;
    /** Get GPU monitor */
    getGPUMonitor(): GPUMonitor;
    /** Get eval runner */
    getEvalRunner(): EvalRunner;
    /** Close all resources */
    close(): void;
    private createJobFromSpec;
    private generateTrainingScript;
}
//# sourceMappingURL=orchestrator.d.ts.map
import type { Checkpoint, TrainingJob } from "./types.js";
export declare class CheckpointManager {
    private readonly baseDir;
    private checkpoints;
    constructor(baseDir?: string);
    /** Save a checkpoint record */
    saveCheckpoint(job: TrainingJob, step: number, trainLoss: number, evalLoss?: number): Checkpoint;
    /** List all checkpoints for a job */
    listCheckpoints(jobId?: string): Checkpoint[];
    /** Get a specific checkpoint */
    getCheckpoint(id: string): Checkpoint | undefined;
    /** Get the best checkpoint for a job */
    getBestCheckpoint(jobId: string): Checkpoint | undefined;
    /** Delete a checkpoint */
    deleteCheckpoint(id: string): boolean;
    /** Export checkpoint to GGUF format (uses llama.cpp if available) */
    exportCheckpoint(checkpointId: string, format?: "gguf" | "safetensors" | "onnx" | "mlx"): Promise<string>;
    /** Load checkpoints from disk (resume discover) */
    loadFromDisk(): void;
    /** Get total disk usage of all checkpoints */
    getTotalSizeMB(): number;
    /** Clean up old checkpoints, keeping only the N best */
    cleanup(keepCount?: number): number;
    private checkBestCheckpoint;
    private getDirSize;
    private exportToGGUF;
    private exportToSafetensors;
    private generateExportScript;
}
//# sourceMappingURL=checkpoint-manager.d.ts.map
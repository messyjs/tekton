import type { EvalResult } from "./types.js";
export interface EvalConfig {
    /** Model path or HuggingFace ID */
    model: string;
    /** Benchmark tasks (e.g. ["mmlu", "hellaswag", "gsm8k"]) */
    tasks: string[];
    /** Number of shots for few-shot evaluation */
    numShots: number;
    /** Batch size for evaluation */
    batchSize: number;
    /** Maximum sequence length */
    maxSeqLength: number;
    /** Device (auto, cuda, cpu) */
    device: string;
    /** Output directory */
    outputDir: string;
    /** Limits: max number of samples per task */
    limit?: number;
}
export declare const DEFAULT_EVAL_CONFIG: EvalConfig;
export declare class EvalRunner {
    private readonly baseDir;
    private results;
    constructor(baseDir?: string);
    /** Check if lm-eval is available */
    isAvailable(): boolean;
    /** Run evaluation on a model */
    run(config: EvalConfig): Promise<EvalResult>;
    /** Generate the evaluation command (doesn't execute) */
    generateCommand(config: EvalConfig): string;
    /** Get all stored results */
    getResults(): EvalResult[];
    /** Get a stored result by model name */
    getResult(model: string): EvalResult | undefined;
    /** Compare two evaluation results */
    compare(before: EvalResult, after: EvalResult): {
        task: string;
        delta: number;
    }[];
    private generateEvalScript;
    private parseEvalOutput;
}
//# sourceMappingURL=eval-runner.d.ts.map
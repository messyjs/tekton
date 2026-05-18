/**
 * Python Template Scripts — Training scripts built as line arrays.
 * These are NOT executed directly — they are rendered with config values
 * and written to disk for the user to run.
 */
export declare function generateQLoRAScript(config: {
    baseModel: string;
    outputDir: string;
    dataset: string;
    epochs: number;
    batchSize: number;
    gradientAccumulationSteps: number;
    learningRate: number;
    maxSeqLength: number;
    loraRank: number;
    loraAlpha: number;
    loraDropout: number;
    saveSteps: number;
    evalSteps: number;
    loggingSteps: number;
    useUnsloth: boolean;
    useFlashAttention: boolean;
    precision: string;
    seed: number;
    outputName: string;
}): string;
export declare function generateTernaryScript(config: {
    baseModel: string;
    outputDir: string;
    dataset: string;
    epochs: number;
    batchSize: number;
    learningRate: number;
    maxSeqLength: number;
    loraRank: number;
    seed: number;
    outputName: string;
}): string;
export declare function generateGRPOScript(config: {
    baseModel: string;
    outputDir: string;
    dataset: string;
    epochs: number;
    batchSize: number;
    learningRate: number;
    maxSeqLength: number;
    grpoBeta: number;
    rewardModel: string;
    seed: number;
    outputName: string;
}): string;
export declare function generateEvalScript(config: {
    model: string;
    tasks: string[];
    numShots: number;
    batchSize: number;
    maxSeqLength: number;
    outputDir: string;
}): string;
//# sourceMappingURL=python-templates.d.ts.map
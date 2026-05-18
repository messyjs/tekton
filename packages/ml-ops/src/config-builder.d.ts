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
export declare function parseTrainingPrompt(prompt: string): TrainingSpec;
/** Build a TrainingConfig from a TrainingSpec */
export declare function buildTrainingConfig(spec: TrainingSpec): TrainingConfig;
//# sourceMappingURL=config-builder.d.ts.map
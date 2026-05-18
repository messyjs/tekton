import type { ProviderConfig, ModelConfig } from "./providers.js";
export declare const EXPANDED_PROVIDERS: Record<string, ProviderConfig>;
export declare const MODEL_PRICING: Record<string, {
    input: number;
    output: number;
}>;
/** Find a provider config by model ID */
export declare function findProviderForModel(modelId: string): ProviderConfig | null;
/** Find a model config by model ID */
export declare function findModelConfig(modelId: string): ModelConfig | null;
/** Get all models across all providers, grouped by type */
export declare function getModelsByType(): Record<string, Array<{
    id: string;
    name: string;
    provider: string;
    costTier: string;
}>>;
/** Get all provider IDs */
export declare function getProviderIds(): string[];
//# sourceMappingURL=providers-expanded.d.ts.map
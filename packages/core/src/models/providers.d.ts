export interface ProviderConfig {
    id: string;
    name: string;
    baseUrl: string;
    apiKeyEnv?: string;
    models: ModelConfig[];
    priority: number;
    latency?: number;
    costPer1KInput?: number;
    costPer1KOutput?: number;
    maxContextTokens?: number;
    supportsStreaming?: boolean;
    supportsTools?: boolean;
    supportsVision?: boolean;
    apiMode?: "chat_completions" | "anthropic_messages" | "embeddings";
    local?: boolean;
}
export interface ModelConfig {
    id: string;
    name: string;
    type: "fast" | "deep" | "reasoning" | "vision" | "code";
    costTier: "free" | "low" | "medium" | "high";
    contextWindow: number;
    maxOutputTokens: number;
    latencyRange: string;
}
export declare const PROVIDERS: Record<string, ProviderConfig>;
//# sourceMappingURL=providers.d.ts.map
import type { ProviderConfig } from "./providers.js";
export interface ModelRequest {
    model: string;
    provider: string;
    messages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
    }>;
    maxTokens?: number;
    temperature?: number;
    tools?: unknown[];
    stream?: boolean;
}
export interface ModelResponse {
    content: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
    provider: string;
    latencyMs: number;
    costEstimate: number;
    error?: string;
}
export type FallbackErrorCode = "rate_limit" | "server_error" | "auth_error" | "timeout" | "unknown";
export interface FallbackError {
    code: FallbackErrorCode;
    status?: number;
    message: string;
    provider: string;
    model: string;
    retryable: boolean;
}
export declare class FallbackErrorClass extends Error {
    code: FallbackErrorCode;
    status?: number;
    provider: string;
    model: string;
    retryable: boolean;
    constructor(code: FallbackErrorCode, message: string, opts: {
        status?: number;
        provider: string;
        model: string;
        retryable: boolean;
    });
}
export interface FallbackChainConfig {
    /** Primary and backup providers in priority order */
    providers: Array<{
        model: string;
        provider: string;
    }>;
    /** Max retries on a single provider before falling back */
    maxRetries: number;
    /** Timeout per request in ms */
    timeoutMs: number;
    /** Whether to retry once on 5xx before falling back */
    retryOnServerError: boolean;
    /** Whether to attempt credential refresh on 401/403 */
    retryOnAuthError: boolean;
}
export declare class FallbackChain {
    private config;
    private providerConfigs;
    private callLog;
    constructor(providerConfigs: Record<string, ProviderConfig>, config?: Partial<FallbackChainConfig>);
    /**
     * Try primary provider, fall through to backups on error.
     * Returns the response from the first successful provider.
     */
    call(request: ModelRequest): Promise<ModelResponse>;
    /**
     * Simulate a call (for testing; real calls go through the provider)
     */
    private executeCall;
    /**
     * Classify an error into a fallback error code.
     */
    private classifyError;
    /**
     * Get the call log for debugging.
     */
    getCallLog(): Array<{
        model: string;
        provider: string;
        success: boolean;
        error?: string;
        latencyMs: number;
    }>;
    /**
     * Clear the call log.
     */
    clearLog(): void;
}
//# sourceMappingURL=fallback.d.ts.map
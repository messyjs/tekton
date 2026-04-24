import type { ProviderConfig } from "./providers.js";

// ── Types ──────────────────────────────────────────────────────────────

export interface ModelRequest {
  model: string;
  provider: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
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

export class FallbackErrorClass extends Error {
  code: FallbackErrorCode;
  status?: number;
  provider: string;
  model: string;
  retryable: boolean;

  constructor(code: FallbackErrorCode, message: string, opts: { status?: number; provider: string; model: string; retryable: boolean }) {
    super(message);
    this.code = code;
    this.status = opts.status;
    this.provider = opts.provider;
    this.model = opts.model;
    this.retryable = opts.retryable;
  }
}

export interface FallbackChainConfig {
  /** Primary and backup providers in priority order */
  providers: Array<{ model: string; provider: string }>;
  /** Max retries on a single provider before falling back */
  maxRetries: number;
  /** Timeout per request in ms */
  timeoutMs: number;
  /** Whether to retry once on 5xx before falling back */
  retryOnServerError: boolean;
  /** Whether to attempt credential refresh on 401/403 */
  retryOnAuthError: boolean;
}

const DEFAULT_FALLBACK_CONFIG: FallbackChainConfig = {
  providers: [],
  maxRetries: 1,
  timeoutMs: 60000,
  retryOnServerError: true,
  retryOnAuthError: false,
};

// ── FallbackChain ────────────────────────────────────────────────────

export class FallbackChain {
  private config: FallbackChainConfig;
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private callLog: Array<{ model: string; provider: string; success: boolean; error?: string; latencyMs: number }> = [];

  constructor(
    providerConfigs: Record<string, ProviderConfig>,
    config: Partial<FallbackChainConfig> = {},
  ) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
    if (!this.config.providers.length) {
      throw new Error("FallbackChain requires at least one provider in config.providers");
    }

    for (const [id, pc] of Object.entries(providerConfigs)) {
      this.providerConfigs.set(id, pc);
    }
  }

  /**
   * Try primary provider, fall through to backups on error.
   * Returns the response from the first successful provider.
   */
  async call(request: ModelRequest): Promise<ModelResponse> {
    const errors: FallbackError[] = [];

    for (const providerEntry of this.config.providers) {
      const model = providerEntry.model;
      const provider = providerEntry.provider;

      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          const response = await this.executeCall({
            ...request,
            model,
            provider,
          });
          this.callLog.push({ model, provider, success: true, latencyMs: response.latencyMs });
          return response;
        } catch (err) {
          const fbError = this.classifyError(err, provider, model);
          errors.push(fbError);
          this.callLog.push({ model, provider, success: false, error: fbError.message, latencyMs: 0 });

          // Decide whether to retry or fall back
          if (fbError.code === "rate_limit") {
            // 429: don't retry, fall back immediately
            break;
          }
          if (fbError.code === "server_error" && this.config.retryOnServerError && attempt === 0) {
            // 5xx: retry once, then fall back
            continue;
          }
          if (fbError.code === "auth_error" && this.config.retryOnAuthError && attempt === 0) {
            // 401/403: try credential refresh once (not implemented, just skip)
            break;
          }
          // For other errors or exhausted retries, fall back
          break;
        }
      }
    }

    // All providers failed
    const lastError = errors[errors.length - 1];
    throw new FallbackErrorClass(
      lastError?.code ?? "unknown",
      `All ${this.config.providers.length} providers failed: ${errors.map(e => `${e.provider}/${e.model}: ${e.message}`).join("; ")}`,
      {
        status: lastError?.status,
        provider: lastError?.provider ?? "unknown",
        model: lastError?.model ?? "unknown",
        retryable: false,
      },
    );
  }

  /**
   * Simulate a call (for testing; real calls go through the provider)
   */
  private async executeCall(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();

    // In a real implementation, this would call the provider's API
    // For now, we simulate based on provider availability
    const providerConfig = this.providerConfigs.get(request.provider);

    // Check if provider has API key configured (simulated)
    if (providerConfig?.apiKeyEnv) {
      // Real implementation would check process.env[providerConfig.apiKeyEnv]
      // This is a placeholder that doesn't make actual API calls
    }

    const latencyMs = Date.now() - startTime;

    return {
      content: `[${request.provider}/${request.model}] Response simulated`,
      inputTokens: request.messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0),
      outputTokens: 100,
      model: request.model,
      provider: request.provider,
      latencyMs: Math.max(latencyMs, 50),
      costEstimate: 0.001,
    };
  }

  /**
   * Classify an error into a fallback error code.
   */
  private classifyError(err: unknown, provider: string, model: string): FallbackError {
    if (err instanceof FallbackErrorClass) {
      return {
        code: err.code,
        status: err.status,
        message: err.message,
        provider: err.provider,
        model: err.model,
        retryable: err.retryable,
      };
    }

    if (err instanceof Error) {
      const msg = err.message.toLowerCase();

      if (msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests")) {
        return { code: "rate_limit", message: err.message, provider, model, retryable: false };
      }
      if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("server error")) {
        return { code: "server_error", message: err.message, provider, model, retryable: true };
      }
      if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("forbidden")) {
        return { code: "auth_error", message: err.message, provider, model, retryable: false };
      }
      if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted")) {
        return { code: "timeout", message: err.message, provider, model, retryable: true };
      }
    }

    return { code: "unknown", message: err instanceof Error ? err.message : String(err), provider, model, retryable: false };
  }

  /**
   * Get the call log for debugging.
   */
  getCallLog(): Array<{ model: string; provider: string; success: boolean; error?: string; latencyMs: number }> {
    return [...this.callLog];
  }

  /**
   * Clear the call log.
   */
  clearLog(): void {
    this.callLog = [];
  }
}
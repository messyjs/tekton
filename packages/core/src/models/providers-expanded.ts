import type { ProviderConfig, ModelConfig } from "./providers.js";

// ── Provider definitions for 18+ providers ──────────────────────────────────

export const EXPANDED_PROVIDERS: Record<string, ProviderConfig> = {
  // ── Local providers ────────────────────────────────────────────────

  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434",
    priority: 0,
    models: [
      { id: "gemma3:27b", name: "Gemma 3 27B", type: "deep", costTier: "free", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "5-30s" },
      { id: "gemma3:12b", name: "Gemma 3 12B", type: "fast", costTier: "free", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "2-10s" },
      { id: "qwen3:8b", name: "Qwen 3 8B", type: "fast", costTier: "free", contextWindow: 32768, maxOutputTokens: 4096, latencyRange: "1-5s" },
      { id: "deepseek-r1:14b", name: "DeepSeek R1 14B", type: "fast", costTier: "free", contextWindow: 65536, maxOutputTokens: 8192, latencyRange: "3-15s" },
      { id: "llama3.3:70b", name: "Llama 3.3 70B", type: "deep", costTier: "free", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "10-60s" },
      { id: "codellama:13b", name: "Code Llama 13B", type: "code", costTier: "free", contextWindow: 16384, maxOutputTokens: 4096, latencyRange: "3-10s" },
    ],
    apiMode: "chat_completions",
    local: true,
    latency: 5000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  lmstudio: {
    id: "lmstudio",
    name: "LM Studio (Local)",
    baseUrl: "http://localhost:1234/v1",
    priority: 0,
    models: [
      { id: "*", name: "Any loaded model", type: "fast", costTier: "free", contextWindow: 32768, maxOutputTokens: 4096, latencyRange: "2-15s" },
    ],
    apiMode: "chat_completions",
    local: true,
    latency: 4000,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: true,
  },

  // ── Major cloud providers ───────────────────────────────────────────

  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    priority: 3,
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", type: "deep", costTier: "high", contextWindow: 200000, maxOutputTokens: 16384, latencyRange: "3-10s" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", type: "deep", costTier: "high", contextWindow: 200000, maxOutputTokens: 16384, latencyRange: "3-10s" },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", type: "deep", costTier: "medium", contextWindow: 200000, maxOutputTokens: 16384, latencyRange: "1-5s" },
      { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", type: "deep", costTier: "medium", contextWindow: 200000, maxOutputTokens: 8192, latencyRange: "1-3s" },
      { id: "claude-3-haiku", name: "Claude 3 Haiku", type: "fast", costTier: "low", contextWindow: 200000, maxOutputTokens: 4096, latencyRange: "100-400ms" },
    ],
    apiMode: "anthropic_messages",
    costPer1KInput: 0.003,
    costPer1KOutput: 0.015,
    latency: 1000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  openai: {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    priority: 2,
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", type: "deep", costTier: "high", contextWindow: 256000, maxOutputTokens: 16384, latencyRange: "2-8s" },
      { id: "gpt-4.1", name: "GPT-4.1", type: "deep", costTier: "medium", contextWindow: 128000, maxOutputTokens: 16384, latencyRange: "1-5s" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", type: "fast", costTier: "low", contextWindow: 128000, maxOutputTokens: 16384, latencyRange: "200-800ms" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", type: "fast", costTier: "low", contextWindow: 128000, maxOutputTokens: 16384, latencyRange: "100-400ms" },
      { id: "o3-pro", name: "O3 Pro", type: "reasoning", costTier: "high", contextWindow: 200000, maxOutputTokens: 100000, latencyRange: "10-60s" },
      { id: "o4-mini", name: "O4 Mini", type: "reasoning", costTier: "medium", contextWindow: 200000, maxOutputTokens: 100000, latencyRange: "5-30s" },
      { id: "gpt-4o", name: "GPT-4o", type: "deep", costTier: "high", contextWindow: 128000, maxOutputTokens: 16384, latencyRange: "1-3s" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", type: "fast", costTier: "low", contextWindow: 128000, maxOutputTokens: 16384, latencyRange: "200-600ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.005,
    costPer1KOutput: 0.015,
    latency: 1500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  google: {
    id: "google",
    name: "Google AI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnv: "GOOGLE_API_KEY",
    priority: 4,
    models: [
      { id: "gemma-4-27b", name: "Gemma 4 27B", type: "deep", costTier: "medium", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "1-5s" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", type: "deep", costTier: "medium", contextWindow: 1048576, maxOutputTokens: 8192, latencyRange: "1-5s" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", type: "fast", costTier: "low", contextWindow: 1048576, maxOutputTokens: 8192, latencyRange: "200-800ms" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", type: "fast", costTier: "low", contextWindow: 1048576, maxOutputTokens: 8192, latencyRange: "100-400ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.00125,
    costPer1KOutput: 0.005,
    latency: 1500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  // ── Chinese providers ───────────────────────────────────────────────

  zhipu: {
    id: "zhipu",
    name: "GLM (ZhipuAI)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    priority: 1,
    models: [
      { id: "glm-5.1", name: "GLM 5.1", type: "deep", costTier: "low", contextWindow: 131072, maxOutputTokens: 16384, latencyRange: "1-5s" },
      { id: "glm-z1-9b", name: "GLM Z1 9B", type: "fast", costTier: "low", contextWindow: 65536, maxOutputTokens: 4096, latencyRange: "200-800ms" },
      { id: "glm-4-flash", name: "GLM 4 Flash", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 4096, latencyRange: "200-800ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.001,
    costPer1KOutput: 0.001,
    latency: 2000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    priority: 5,
    models: [
      { id: "deepseek-r1", name: "DeepSeek R1", type: "reasoning", costTier: "medium", contextWindow: 131072, maxOutputTokens: 16384, latencyRange: "5-30s" },
      { id: "deepseek-chat", name: "DeepSeek V3", type: "deep", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "1-5s" },
      { id: "deepseek-coder", name: "DeepSeek Coder", type: "code", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "1-5s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.0014,
    costPer1KOutput: 0.0028,
    latency: 2000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  // ── Alternative / speciality providers ─────────────────────────────

  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    priority: 6,
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 16384, latencyRange: "20-100ms" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", type: "fast", costTier: "free", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "10-50ms" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", type: "fast", costTier: "low", contextWindow: 32768, maxOutputTokens: 4096, latencyRange: "20-100ms" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B", type: "fast", costTier: "free", contextWindow: 8192, maxOutputTokens: 4096, latencyRange: "10-50ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.00059,
    costPer1KOutput: 0.00079,
    latency: 100,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  mistral: {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    priority: 7,
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", type: "deep", costTier: "medium", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "1-5s" },
      { id: "mistral-medium-latest", name: "Mistral Medium", type: "fast", costTier: "medium", contextWindow: 32768, maxOutputTokens: 8192, latencyRange: "500ms-2s" },
      { id: "mistral-small-latest", name: "Mistral Small", type: "fast", costTier: "low", contextWindow: 32768, maxOutputTokens: 8192, latencyRange: "200-800ms" },
      { id: "codestral-latest", name: "Codestral", type: "code", costTier: "medium", contextWindow: 32768, maxOutputTokens: 8192, latencyRange: "1-3s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.002,
    costPer1KOutput: 0.006,
    latency: 1000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  xai: {
    id: "xai",
    name: "xAI",
    baseUrl: "https://api.x.ai/v1",
    apiKeyEnv: "XAI_API_KEY",
    priority: 8,
    models: [
      { id: "grok-3", name: "Grok 3", type: "deep", costTier: "medium", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "1-5s" },
      { id: "grok-3-mini", name: "Grok 3 Mini", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "200-800ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.003,
    costPer1KOutput: 0.015,
    latency: 1500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  cerebras: {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    apiKeyEnv: "CEREBRAS_API_KEY",
    priority: 9,
    models: [
      { id: "llama-3.3-70b", name: "Llama 3.3 70B (Cerebras)", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "10-50ms" },
      { id: "llama-3.1-8b", name: "Llama 3.1 8B (Cerebras)", type: "fast", costTier: "free", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "5-30ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.00085,
    costPer1KOutput: 0.0017,
    latency: 50,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  together: {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    apiKeyEnv: "TOGETHER_API_KEY",
    priority: 10,
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "100-500ms" },
      { id: "meta-llama/Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B", type: "deep", costTier: "high", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "2-10s" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B", type: "fast", costTier: "low", contextWindow: 32768, maxOutputTokens: 4096, latencyRange: "100-500ms" },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1 (Together)", type: "reasoning", costTier: "medium", contextWindow: 131072, maxOutputTokens: 16384, latencyRange: "5-30s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.00088,
    costPer1KOutput: 0.00264,
    latency: 500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  fireworks: {
    id: "fireworks",
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    apiKeyEnv: "FIREWORKS_API_KEY",
    priority: 11,
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", name: "Llama 3.3 70B (Fireworks)", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 16384, latencyRange: "50-200ms" },
      { id: "accounts/fireworks/models/qwen2p5-72b-instruct", name: "Qwen 2.5 72B (Fireworks)", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "50-200ms" },
      { id: "accounts/fireworks/models/deepseek-r1", name: "DeepSeek R1 (Fireworks)", type: "reasoning", costTier: "medium", contextWindow: 131072, maxOutputTokens: 16384, latencyRange: "2-15s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.0009,
    costPer1KOutput: 0.0009,
    latency: 200,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    priority: 12,
    models: [
      { id: "*", name: "Any OpenRouter model", type: "deep", costTier: "medium", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "1-10s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.002,
    costPer1KOutput: 0.006,
    latency: 2000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },

  nous: {
    id: "nous",
    name: "Nous Research",
    baseUrl: "https://api.nousresearch.com/v1",
    apiKeyEnv: "NOUS_API_KEY",
    priority: 13,
    models: [
      { id: "hermes-3-llama-3.1-405b", name: "Hermes 3 405B", type: "deep", costTier: "high", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "2-10s" },
      { id: "hermes-3-llama-3.1-70b", name: "Hermes 3 70B", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 8192, latencyRange: "500ms-3s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.003,
    costPer1KOutput: 0.015,
    latency: 1500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  perplexity: {
    id: "perplexity",
    name: "Perplexity AI",
    baseUrl: "https://api.perplexity.ai",
    apiKeyEnv: "PERPLEXITY_API_KEY",
    priority: 14,
    models: [
      { id: "sonar-pro", name: "Sonar Pro", type: "fast", costTier: "medium", contextWindow: 200000, maxOutputTokens: 8192, latencyRange: "200ms-2s" },
      { id: "sonar", name: "Sonar", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 4096, latencyRange: "100-500ms" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.001,
    costPer1KOutput: 0.001,
    latency: 500,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
  },

  cohere: {
    id: "cohere",
    name: "Cohere",
    baseUrl: "https://api.cohere.ai/v2",
    apiKeyEnv: "COHERE_API_KEY",
    priority: 15,
    models: [
      { id: "command-r-plus", name: "Command R+", type: "deep", costTier: "medium", contextWindow: 131072, maxOutputTokens: 4096, latencyRange: "1-5s" },
      { id: "command-r", name: "Command R", type: "fast", costTier: "low", contextWindow: 131072, maxOutputTokens: 4096, latencyRange: "500ms-2s" },
    ],
    apiMode: "chat_completions",
    costPer1KInput: 0.0025,
    costPer1KOutput: 0.01,
    latency: 1200,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },

  voyage: {
    id: "voyage",
    name: "Voyage AI (Embeddings)",
    baseUrl: "https://api.voyageai.com/v1",
    apiKeyEnv: "VOYAGE_API_KEY",
    priority: 16,
    models: [
      { id: "voyage-3", name: "Voyage 3", type: "fast", costTier: "low", contextWindow: 32768, maxOutputTokens: 0, latencyRange: "50-200ms" },
      { id: "voyage-3-lite", name: "Voyage 3 Lite", type: "fast", costTier: "low", contextWindow: 32768, maxOutputTokens: 0, latencyRange: "30-100ms" },
    ],
    apiMode: "embeddings",
    costPer1KInput: 0.00006,
    costPer1KOutput: 0,
    latency: 100,
    supportsStreaming: false,
    supportsTools: false,
    supportsVision: false,
  },
};

// ── Model pricing table (USD per 1K tokens) ─────────────────────────

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "claude-opus-4-6":     { input: 0.015, output: 0.075 },
  "claude-opus-4-5":     { input: 0.015, output: 0.075 },
  "claude-sonnet-4":     { input: 0.003, output: 0.015 },
  "claude-3.5-sonnet":   { input: 0.003, output: 0.015 },
  "claude-3-haiku":      { input: 0.00025, output: 0.00125 },
  // OpenAI
  "gpt-5.4":             { input: 0.01, output: 0.03 },
  "gpt-4.1":             { input: 0.002, output: 0.008 },
  "gpt-4.1-mini":        { input: 0.0004, output: 0.0016 },
  "gpt-4.1-nano":        { input: 0.0001, output: 0.0004 },
  "o3-pro":              { input: 0.03, output: 0.12 },
  "o4-mini":             { input: 0.0011, output: 0.0044 },
  "gpt-4o":              { input: 0.005, output: 0.015 },
  "gpt-4o-mini":         { input: 0.00015, output: 0.0006 },
  // Google
  "gemma-4-27b":         { input: 0.00125, output: 0.005 },
  "gemini-2.5-pro":       { input: 0.00125, output: 0.005 },
  "gemini-2.5-flash":     { input: 0.00015, output: 0.0006 },
  "gemini-2.5-flash-lite":{ input: 0.000075, output: 0.0003 },
  // Zhipu
  "glm-5.1":             { input: 0.001, output: 0.001 },
  "glm-z1-9b":           { input: 0.0001, output: 0.0001 },
  "glm-4-flash":         { input: 0.0001, output: 0.0001 },
  // DeepSeek
  "deepseek-r1":         { input: 0.0014, output: 0.0028 },
  "deepseek-chat":        { input: 0.0014, output: 0.0028 },
  "deepseek-coder":       { input: 0.0014, output: 0.0028 },
  // Groq
  "llama-3.3-70b-versatile": { input: 0.00059, output: 0.00079 },
  "llama-3.1-8b-instant":    { input: 0.0, output: 0.0 },
  // Mistral
  "mistral-large-latest": { input: 0.002, output: 0.006 },
  "mistral-medium-latest": { input: 0.0007, output: 0.0021 },
  "mistral-small-latest":  { input: 0.0002, output: 0.0006 },
  "codestral-latest":      { input: 0.001, output: 0.003 },
  // xAI
  "grok-3":              { input: 0.003, output: 0.015 },
  "grok-3-mini":         { input: 0.0003, output: 0.0005 },
  // Cerebras
  "llama-3.3-70b":       { input: 0.00085, output: 0.0017 },
  "llama-3.1-8b":        { input: 0.00005, output: 0.0001 },
  // Together
  "meta-llama/Llama-3.3-70B-Instruct-Turbo": { input: 0.00088, output: 0.00264 },
  // Fireworks
  "accounts/fireworks/models/llama-v3p3-70b-instruct": { input: 0.0009, output: 0.0009 },
  // Others
  "sonar-pro":            { input: 0.003, output: 0.015 },
  "sonar":                { input: 0.001, output: 0.001 },
  "command-r-plus":       { input: 0.0025, output: 0.01 },
  "command-r":            { input: 0.0005, output: 0.002 },
  // Ollama (local — free)
  "gemma3:27b":           { input: 0, output: 0 },
  "gemma3:12b":           { input: 0, output: 0 },
  "qwen3:8b":             { input: 0, output: 0 },
  "deepseek-r1:14b":      { input: 0, output: 0 },
  "llama3.3:70b":         { input: 0, output: 0 },
  "codellama:13b":        { input: 0, output: 0 },
};

/** Find a provider config by model ID */
export function findProviderForModel(modelId: string): ProviderConfig | null {
  for (const provider of Object.values(EXPANDED_PROVIDERS)) {
    for (const model of provider.models) {
      if (model.id === modelId || (model.id === "*" && provider.id !== "ollama" && provider.id !== "lmstudio" && provider.id !== "openrouter")) {
        return provider;
      }
    }
  }
  return null;
}

/** Find a model config by model ID */
export function findModelConfig(modelId: string): ModelConfig | null {
  for (const provider of Object.values(EXPANDED_PROVIDERS)) {
    for (const model of provider.models) {
      if (model.id === modelId) {
        return model;
      }
    }
  }
  return null;
}

/** Get all models across all providers, grouped by type */
export function getModelsByType(): Record<string, Array<{ id: string; name: string; provider: string; costTier: string }>> {
  const result: Record<string, Array<{ id: string; name: string; provider: string; costTier: string }>> = {
    fast: [],
    deep: [],
    reasoning: [],
    code: [],
    vision: [],
  };

  for (const provider of Object.values(EXPANDED_PROVIDERS)) {
    for (const model of provider.models) {
      if (model.id === "*") continue; // Skip wildcard entries
      const entry = { id: model.id, name: model.name, provider: provider.id, costTier: model.costTier };
      if (result[model.type]) {
        result[model.type].push(entry);
      }
    }
  }

  return result;
}

/** Get all provider IDs */
export function getProviderIds(): string[] {
  return Object.keys(EXPANDED_PROVIDERS);
}
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
  latencyRange: string; // e.g., "50-200ms", "2-10s"
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434",
    priority: 0,
    models: [
      {
        id: "gemma3:27b",
        name: "Gemma 3 27B",
        type: "deep",
        costTier: "free",
        contextWindow: 131072,
        maxOutputTokens: 8192,
        latencyRange: "5-30s",
      },
      {
        id: "gemma3:12b",
        name: "Gemma 3 12B",
        type: "fast",
        costTier: "free",
        contextWindow: 131072,
        maxOutputTokens: 8192,
        latencyRange: "2-10s",
      },
      {
        id: "qwen3:8b",
        name: "Qwen 3 8B",
        type: "fast",
        costTier: "free",
        contextWindow: 32768,
        maxOutputTokens: 4096,
        latencyRange: "1-5s",
      },
    ],
    latency: 5000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  glm: {
    id: "glm",
    name: "GLM (ZhipuAI)",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "GLM_API_KEY",
    priority: 1,
    models: [
      {
        id: "glm-5.1",
        name: "GLM 5.1",
        type: "deep",
        costTier: "low",
        contextWindow: 131072,
        maxOutputTokens: 16384,
        latencyRange: "1-5s",
      },
      {
        id: "glm-4-flash",
        name: "GLM 4 Flash",
        type: "fast",
        costTier: "low",
        contextWindow: 131072,
        maxOutputTokens: 4096,
        latencyRange: "200-800ms",
      },
    ],
    costPer1KInput: 0.001,
    costPer1KOutput: 0.001,
    latency: 2000,
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
      {
        id: "gpt-4o",
        name: "GPT-4o",
        type: "deep",
        costTier: "high",
        contextWindow: 128000,
        maxOutputTokens: 16384,
        latencyRange: "1-3s",
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        type: "fast",
        costTier: "medium",
        contextWindow: 128000,
        maxOutputTokens: 16384,
        latencyRange: "200-600ms",
      },
    ],
    costPer1KInput: 0.005,
    costPer1KOutput: 0.015,
    latency: 1500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    priority: 3,
    models: [
      {
        id: "claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        type: "deep",
        costTier: "high",
        contextWindow: 200000,
        maxOutputTokens: 8192,
        latencyRange: "1-3s",
      },
      {
        id: "claude-3-haiku",
        name: "Claude 3 Haiku",
        type: "fast",
        costTier: "low",
        contextWindow: 200000,
        maxOutputTokens: 4096,
        latencyRange: "100-400ms",
      },
    ],
    costPer1KInput: 0.003,
    costPer1KOutput: 0.015,
    latency: 1000,
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
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        type: "deep",
        costTier: "medium",
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        latencyRange: "1-5s",
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        type: "fast",
        costTier: "low",
        contextWindow: 1048576,
        maxOutputTokens: 8192,
        latencyRange: "200-800ms",
      },
    ],
    costPer1KInput: 0.00125,
    costPer1KOutput: 0.005,
    latency: 1500,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
};
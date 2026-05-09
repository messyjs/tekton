/**
 * Chat Handler — Manages LLM conversations for the dashboard.
 * Talks directly to the configured model provider (Ollama, OpenAI, Anthropic, etc.)
 */
import { DEFAULT_CONFIG } from "@tekton/core";

// ── Types ──────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
  tokens?: { input: number; output: number };
  durationMs?: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
  provider: string;
}

export interface ChatConfig {
  model: string;
  provider: string;
  baseUrl: string;
  apiKey?: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface StreamEvent {
  type: "start" | "token" | "done" | "error" | "user_message";
  data: Record<string, any>;
}

interface StreamToken {
  type: "token" | "done" | "error";
  text?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

// ── LLM Caller ─────────────────────────────────────────────────────────

async function callOllama(
  messages: Array<{ role: string; content: string }>,
  config: ChatConfig,
): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const startTime = Date.now();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: false,
    options: {
      temperature: config.temperature,
      num_predict: config.maxTokens,
    },
  };

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;

  return {
    content: data.message?.content ?? data.response ?? "",
    model: data.model ?? config.model,
    inputTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
    durationMs,
  };
}

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  config: ChatConfig,
): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const startTime = Date.now();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI-compatible error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content ?? "",
    model: data.model ?? config.model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    durationMs,
  };
}

async function callAnthropic(
  messages: Array<{ role: string; content: string }>,
  config: ChatConfig,
): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const startTime = Date.now();
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  // Separate system message
  const systemMsg = messages.find(m => m.role === "system")?.content ?? "";
  const chatMsgs = messages.filter(m => m.role !== "system")
    .map(m => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemMsg,
    messages: chatMsgs,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (config.apiKey) {
    headers["x-api-key"] = config.apiKey;
  }

  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const durationMs = Date.now() - startTime;

  return {
    content: data.content?.[0]?.text ?? "",
    model: data.model ?? config.model,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    durationMs,
  };
}

// ── Provider URL Resolution ─────────────────────────────────────────────

const PROVIDER_URLS: Record<string, string> = {
  ollama: "http://localhost:11434",
  lmstudio: "http://localhost:1234/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  deepseek: "https://api.deepseek.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  xai: "https://api.x.ai/v1",
};

function resolveBaseUrl(provider: string, explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  return PROVIDER_URLS[provider] ?? `http://localhost:11434`;
}

function getApiKey(provider: string): string | undefined {
  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    groq: "GROQ_API_KEY",
    mistral: "MISTRAL_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    together: "TOGETHER_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    google: "GOOGLE_API_KEY",
    xai: "XAI_API_KEY",
  };
  const envVar = envMap[provider];
  return envVar ? process.env[envVar] : undefined;
}

// ── Chat Manager ───────────────────────────────────────────────────────

export class ChatManager {
  private conversations: Map<string, ChatConversation> = new Map();
  private activeConversationId: string | null = null;
  private maxConversations = 50;
  private defaultConfig: ChatConfig;

  // Injected by the runtime — if set, messages are routed through the agent system
  private _agentBridge: any = null;

  constructor(config?: Partial<ChatConfig>) {
    const cfg = (DEFAULT_CONFIG as any);
    this.defaultConfig = {
      model: config?.model ?? cfg.models?.fast?.model ?? "gemma4:e4b",
      provider: config?.provider ?? cfg.models?.fast?.provider ?? "ollama",
      baseUrl: config?.baseUrl ?? resolveBaseUrl(cfg.models?.fast?.provider ?? "ollama"),
      apiKey: config?.apiKey ?? getApiKey(cfg.models?.fast?.provider ?? "ollama"),
      systemPrompt: config?.systemPrompt ?? cfg.identity?.soul ?? "You are Tekton, an adaptive coding agent that learns. Be helpful, concise, and accurate.",
      maxTokens: config?.maxTokens ?? 4096,
      temperature: config?.temperature ?? 0.3,
    };
  }

  /** Inject agent bridge for real agent execution */
  setAgentBridge(bridge: any): void {
    this._agentBridge = bridge;
  }

  /** Create a new conversation */
  createConversation(title?: string): ChatConversation {
    const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const conv: ChatConversation = {
      id,
      title: title ?? "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: this.defaultConfig.model,
      provider: this.defaultConfig.provider,
    };
    this.conversations.set(id, conv);
    this.activeConversationId = id;

    // Evict oldest if over limit
    if (this.conversations.size > this.maxConversations) {
      const oldest = [...this.conversations.entries()]
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
      if (oldest) this.conversations.delete(oldest[0]);
    }

    return conv;
  }

  /** Get a conversation by ID */
  getConversation(id: string): ChatConversation | undefined {
    return this.conversations.get(id);
  }

  /** List all conversations */
  listConversations(): Array<{ id: string; title: string; messageCount: number; updatedAt: number; model: string }> {
    return [...this.conversations.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(c => ({
        id: c.id,
        title: c.title,
        messageCount: c.messages.filter(m => m.role !== "system").length,
        updatedAt: c.updatedAt,
        model: c.model,
      }));
  }

  /** Delete a conversation */
  deleteConversation(id: string): boolean {
    if (this.activeConversationId === id) {
      this.activeConversationId = null;
    }
    return this.conversations.delete(id);
  }

  /** Send a message and get a response */
  async sendMessage(
    conversationId: string,
    userContent: string,
    configOverrides?: Partial<ChatConfig>,
  ): Promise<ChatMessage> {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error(`Conversation not found: ${conversationId}`);

    const config = { ...this.defaultConfig, ...configOverrides };

    // Update conversation model if changed
    if (configOverrides?.model) conv.model = configOverrides.model;
    if (configOverrides?.provider) conv.provider = configOverrides.provider;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };
    conv.messages.push(userMsg);

    // Auto-title from first user message
    if (conv.messages.filter(m => m.role === "user").length === 1) {
      conv.title = userContent.slice(0, 60) + (userContent.length > 60 ? "..." : "");
    }

    // Build messages for LLM
    const systemMsg = { role: "system" as const, content: config.systemPrompt };
    const chatHistory = conv.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));
    const messages = [systemMsg, ...chatHistory];

    let result: { content: string; model: string; inputTokens: number; outputTokens: number; durationMs: number };

    // If agent bridge is connected, route through it
    if (this._agentBridge) {
      const bridgeResult = await this._agentBridge.executeTask({
        systemPrompt: config.systemPrompt,
        taskDescription: userContent,
        maxTurns: 1,
      });
      result = {
        content: bridgeResult.result ?? bridgeResult.error ?? "No response",
        model: bridgeResult.modelUsed ?? config.model,
        inputTokens: bridgeResult.tokensUsed ?? 0,
        outputTokens: 0,
        durationMs: bridgeResult.durationMs ?? 0,
      };
    } else {
      // Direct LLM call
      result = await this.callLLM(messages, config);
    }

    // Add assistant message
    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "assistant",
      content: result.content,
      timestamp: Date.now(),
      model: result.model,
      provider: config.provider,
      tokens: { input: result.inputTokens, output: result.outputTokens },
      durationMs: result.durationMs,
    };
    conv.messages.push(assistantMsg);
    conv.updatedAt = Date.now();

    return assistantMsg;
  }

  /** Send a message with SSE streaming — yields tokens as they arrive */
  async *sendMessageStream(
    conversationId: string,
    userContent: string,
    configOverrides?: Partial<ChatConfig>,
  ): AsyncGenerator<StreamEvent> {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      yield { type: "error", data: { error: `Conversation not found: ${conversationId}` } };
      return;
    }

    const config = { ...this.defaultConfig, ...configOverrides };
    if (configOverrides?.model) conv.model = configOverrides.model;
    if (configOverrides?.provider) conv.provider = configOverrides.provider;

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: userContent,
      timestamp: Date.now(),
    };
    conv.messages.push(userMsg);

    // Auto-title from first user message
    if (conv.messages.filter(m => m.role === "user").length === 1) {
      conv.title = userContent.slice(0, 60) + (userContent.length > 60 ? "..." : "");
    }
    yield { type: "user_message", data: { id: userMsg.id, content: userContent, timestamp: userMsg.timestamp } };

    // Build messages for LLM
    const systemMsg = { role: "system", content: config.systemPrompt };
    const chatHistory = conv.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));
    const messages = [systemMsg, ...chatHistory];

    yield { type: "start", data: { model: config.model, provider: config.provider } };

    let fullContent = "";
    let inputTokens = 0;
    const startTime = Date.now();

    try {
      for await (const token of this.streamLLM(messages, config)) {
        if (token.type === "token") {
          fullContent += token.text;
          yield { type: "token", data: { text: token.text } };
        } else if (token.type === "done") {
          inputTokens = token.inputTokens ?? 0;
          const outputTokens = token.outputTokens ?? 0;
          const durationMs = Date.now() - startTime;

          // Add assistant message
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: "assistant",
            content: fullContent,
            timestamp: Date.now(),
            model: token.model ?? config.model,
            provider: config.provider,
            tokens: { input: inputTokens, output: outputTokens },
            durationMs,
          };
          conv.messages.push(assistantMsg);
          conv.updatedAt = Date.now();

          yield {
            type: "done",
            data: {
              id: assistantMsg.id,
              content: fullContent,
              model: assistantMsg.model,
              provider: config.provider,
              tokens: { input: inputTokens, output: outputTokens },
              durationMs,
            },
          };
        } else if (token.type === "error") {
          yield { type: "error", data: { error: token.error } };
        }
      }
    } catch (err: any) {
      yield { type: "error", data: { error: err.message ?? String(err) } };
    }
  }

  /** Call the appropriate LLM provider */
  private async callLLM(
    messages: Array<{ role: string; content: string }>,
    config: ChatConfig,
  ): Promise<{ content: string; model: string; inputTokens: number; outputTokens: number; durationMs: number }> {
    const provider = config.provider.toLowerCase();

    // Ollama and OpenAI-compatible providers
    if (provider === "ollama" || provider === "lmstudio") {
      return callOllama(messages, config);
    }

    if (provider === "anthropic") {
      return callAnthropic(messages, config);
    }

    // Default: OpenAI-compatible API
    return callOpenAI(messages, config);
  }

  /** Stream LLM responses token by token */
  private async *streamLLM(
    messages: Array<{ role: string; content: string }>,
    config: ChatConfig,
  ): AsyncGenerator<StreamToken> {
    const provider = config.provider.toLowerCase();

    if (provider === "ollama" || provider === "lmstudio") {
      yield* this.streamOllama(messages, config);
      return;
    }

    if (provider === "anthropic") {
      // Anthropic streaming not yet supported — fall back to non-streaming
      try {
        const result = await callAnthropic(messages, config);
        // Yield content in chunks for progressive display
        const chunks = result.content.match(/.{1,8}/g) ?? [result.content];
        for (const chunk of chunks) {
          yield { type: "token", text: chunk };
        }
        yield { type: "done", model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
      } catch (err: any) {
        yield { type: "error", error: err.message ?? String(err) };
      }
      return;
    }

    // OpenAI-compatible streaming
    yield* this.streamOpenAI(messages, config);
  }

  /** Stream from Ollama */
  private async *streamOllama(
    messages: Array<{ role: string; content: string }>,
    config: ChatConfig,
  ): AsyncGenerator<StreamToken> {
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const body = {
      model: config.model,
      messages,
      stream: true,
      options: { temperature: config.temperature, num_predict: config.maxTokens },
    };

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        const errText = await response.text();
        yield { type: "error", error: `Ollama error ${response.status}: ${errText}` };
        return;
      }

      if (!response.body) {
        // Fallback to non-streaming
        const result = await callOllama(messages, config);
        const chunks = result.content.match(/.{1,8}/g) ?? [result.content];
        for (const chunk of chunks) {
          yield { type: "token", text: chunk };
        }
        yield { type: "done", model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let model = config.model;
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.message?.content) {
              yield { type: "token", text: data.message.content };
            }
            if (data.model) model = data.model;
            if (data.prompt_eval_count) inputTokens = data.prompt_eval_count;
            if (data.eval_count) outputTokens = data.eval_count;
            if (data.done) {
              yield { type: "done", model, inputTokens: inputTokens || data.prompt_eval_count || 0, outputTokens: outputTokens || data.eval_count || 0 };
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // If we didn't get a done event
      yield { type: "done", model, inputTokens, outputTokens };
    } catch (err: any) {
      yield { type: "error", error: err.message ?? String(err) };
    }
  }

  /** Stream from OpenAI-compatible APIs */
  private async *streamOpenAI(
    messages: Array<{ role: string; content: string }>,
    config: ChatConfig,
  ): AsyncGenerator<StreamToken> {
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const body = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        const errText = await response.text();
        yield { type: "error", error: `OpenAI error ${response.status}: ${errText}` };
        return;
      }

      if (!response.body) {
        // Fallback to non-streaming
        const result = await callOpenAI(messages, config);
        const chunks = result.content.match(/.{1,8}/g) ?? [result.content];
        for (const chunk of chunks) {
          yield { type: "token", text: chunk };
        }
        yield { type: "done", model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let model = config.model;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const dataStr = trimmed.slice(6);
          if (dataStr === "[DONE]") {
            yield { type: "done", model };
            return;
          }
          try {
            const data = JSON.parse(dataStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: "token", text: content };
            }
            if (data.model) model = data.model;
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // If we didn't see [DONE]
      yield { type: "done", model };
    } catch (err: any) {
      yield { type: "error", error: err.message ?? String(err) };
    }
  }

  /** Get the active conversation */
  getActiveConversation(): ChatConversation | undefined {
    if (this.activeConversationId) {
      return this.conversations.get(this.activeConversationId);
    }
    return undefined;
  }

  /** Set active conversation */
  setActiveConversation(id: string): void {
    if (this.conversations.has(id)) {
      this.activeConversationId = id;
    }
  }

  /** Get the default config (for displaying current model info) */
  getConfig(): ChatConfig {
    return { ...this.defaultConfig };
  }

  /** Update config */
  updateConfig(updates: Partial<ChatConfig>): ChatConfig {
    Object.assign(this.defaultConfig, updates);
    // Recompute baseUrl if provider changes
    if (updates.provider) {
      this.defaultConfig.baseUrl = resolveBaseUrl(updates.provider, updates.baseUrl);
      this.defaultConfig.apiKey = getApiKey(updates.provider);
    }
    return { ...this.defaultConfig };
  }

  /** Check if LLM is reachable */
  async healthCheck(): Promise<{ ok: boolean; model: string; provider: string; latencyMs: number; error?: string }> {
    const startTime = Date.now();
    try {
      const config = this.defaultConfig;

      if (config.provider === "ollama") {
        const resp = await fetch(`${config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) throw new Error(`Ollama returned ${resp.status}`);
        const data = await resp.json() as any;
        const models: string[] = (data.models ?? []).map((m: any) => m.name);
        return {
          ok: true,
          model: config.model,
          provider: config.provider,
          latencyMs: Date.now() - startTime,
          // Include available models if model not found
          error: models.includes(config.model) ? undefined : `Model "${config.model}" not found. Available: ${models.join(", ")}`,
        };
      }

      // For cloud providers, just try a minimal request
      const messages = [
        { role: "system" as const, content: "Respond with OK." },
        { role: "user" as const, content: "ping" },
      ];
      const result = await this.callLLM(messages, config);
      return {
        ok: true,
        model: result.model,
        provider: config.provider,
        latencyMs: result.durationMs,
      };
    } catch (err) {
      return {
        ok: false,
        model: this.defaultConfig.model,
        provider: this.defaultConfig.provider,
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
/**
 * Agent LLM Bridge — Connects AgentSession to real LLM API calls.
 *
 * Multi-turn execution loop: LLM call → tool execution → LLM call → ...
 * until the LLM returns a final text response (no tool calls) or maxTurns is reached.
 */
import type { ModelRouter, RoutingContext, RoutingDecision } from "../models/router.js";
import type { FallbackChain } from "../models/fallback.js";

// ── Types ──────────────────────────────────────────────────────────────

export interface AgentLLMBridgeOptions {
  /** Default max LLM call loops (default 20) */
  maxTurns?: number;
  /** Default max tokens for LLM responses */
  maxTokens?: number;
  /** Temperature for LLM responses */
  temperature?: number;
  /** Whether to stream LLM responses (not used in initial impl) */
  stream?: boolean;
}

export interface BridgeMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ToolCallRecord {
  tool: string;
  params: Record<string, unknown>;
  result: string;
  isError: boolean;
}

export interface BridgeTaskParams {
  systemPrompt: string;
  taskDescription: string;
  context?: string;
  tools?: string[];
  model?: string;
  maxTurns?: number;
  onMessage?: (msg: BridgeMessage) => void;
}

export interface BridgeTaskResult {
  success: boolean;
  result: string;
  filesModified: string[];
  toolCalls: ToolCallRecord[];
  messageCount: number;
  tokensUsed: number;
  modelUsed: string;
  durationMs: number;
  error?: string;
}

// ── LLM Response shapes ────────────────────────────────────────────────

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string | null;
  toolCalls: LLMToolCall[];
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

// ── Tool Executor interface ────────────────────────────────────────────

/**
 * Interface for executing tools during LLM loops.
 * Implemented by the caller (e.g. AgentPool) which has access to ToolRegistry.
 * This keeps @tekton/core independent from @tekton/tools.
 */
export interface ToolExecutor {
  /**
   * Execute a tool by name with given parameters.
   * Returns the tool result content and error status.
   */
  execute(name: string, params: Record<string, unknown>): Promise<{ content: string; isError: boolean }>;

  /**
   * Get the list of available tools, optionally filtered by toolset names.
   */
  getTools(toolsets?: string[]): Array<{ name: string; description: string; parameters: unknown }>;
}

// ── AgentLLMBridge ─────────────────────────────────────────────────────

export class AgentLLMBridge {
  private modelRouter: ModelRouter;
  private toolExecutor: ToolExecutor | null;
  private fallbackChain: FallbackChain | null;
  private options: Required<AgentLLMBridgeOptions>;

  /**
   * Internal override for testing. Set a custom LLM call function
   * that receives (model, provider, messages, tools) and returns an LLMResponse.
   * This avoids having to mock real LLM APIs in tests.
   */
  public _callLLMOverride: ((
    model: string,
    provider: string,
    messages: BridgeMessage[],
    tools: Array<{ name: string; description: string; parameters: unknown }>,
  ) => Promise<LLMResponse>) | null = null;

  constructor(
    modelRouter: ModelRouter,
    toolExecutor?: ToolExecutor,
    options?: AgentLLMBridgeOptions,
    fallbackChain?: FallbackChain,
  ) {
    this.modelRouter = modelRouter;
    this.toolExecutor = toolExecutor ?? null;
    this.fallbackChain = fallbackChain ?? null;
    this.options = {
      maxTurns: options?.maxTurns ?? 20,
      maxTokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.3,
      stream: options?.stream ?? false,
    };
  }

  // ── Main execution loop ───────────────────────────────────────────

  async executeTask(params: BridgeTaskParams): Promise<BridgeTaskResult> {
    const startTime = Date.now();
    const maxTurns = params.maxTurns ?? this.options.maxTurns;

    const messages: BridgeMessage[] = [];
    const toolCalls: ToolCallRecord[] = [];
    const filesModified: string[] = [];
    let messageCount = 0;
    let totalTokensUsed = 0;
    let lastModelUsed = "unknown";

    // 1. Build system prompt
    const systemParts = [params.systemPrompt];
    if (params.context) {
      systemParts.push(`\n\nAdditional context:\n${params.context}`);
    }
    const systemMsg: BridgeMessage = { role: "system", content: systemParts.join("\n") };
    messages.push(systemMsg);
    messageCount++;
    params.onMessage?.(systemMsg);

    // 2. Add task description as user message
    const userMsg: BridgeMessage = { role: "user", content: params.taskDescription };
    messages.push(userMsg);
    messageCount++;
    params.onMessage?.(userMsg);

    // 3. Get available tools (filtered by toolset)
    const availableTools = this.toolExecutor
      ? this.toolExecutor.getTools(params.tools)
      : [];

    // 4. Execution loop
    let turnCount = 0;
    let lastError: string | undefined;

    while (turnCount < maxTurns) {
      turnCount++;

      try {
        // Call LLM
        const llmResponse = await this.callLLM(messages, availableTools, params.model);
        lastModelUsed = llmResponse.model;
        totalTokensUsed += llmResponse.inputTokens + llmResponse.outputTokens;

        // Record assistant message
        const assistantContent = llmResponse.content ?? "";
        const assistantMsg: BridgeMessage = { role: "assistant", content: assistantContent };
        messages.push(assistantMsg);
        messageCount++;
        params.onMessage?.(assistantMsg);

        // If no tool calls, we're done — the LLM gave a final text response
        if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
          return {
            success: true,
            result: assistantContent,
            filesModified: [...new Set(filesModified)],
            toolCalls,
            messageCount,
            tokensUsed: totalTokensUsed,
            modelUsed: lastModelUsed,
            durationMs: Date.now() - startTime,
          };
        }

        // Execute tool calls
        for (const tc of llmResponse.toolCalls) {
          let toolResultContent: string;
          let toolResultIsError = false;

          if (this.toolExecutor) {
            try {
              const result = await this.toolExecutor.execute(tc.name, tc.arguments);
              toolResultContent = result.content;
              toolResultIsError = result.isError;
            } catch (err) {
              toolResultContent = `Tool execution error: ${err instanceof Error ? err.message : String(err)}`;
              toolResultIsError = true;
            }
          } else {
            toolResultContent = `Tool not available: ${tc.name}`;
            toolResultIsError = true;
          }

          toolCalls.push({
            tool: tc.name,
            params: tc.arguments,
            result: toolResultContent,
            isError: toolResultIsError,
          });

          // Track file modifications from write/patch tools
          if (tc.name.includes("write") || tc.name.includes("patch")) {
            const filePath = String(tc.arguments?.path ?? tc.arguments?.file_path ?? tc.arguments?.filepath ?? "");
            if (filePath) filesModified.push(filePath);
          }

          // Add tool result to messages
          const toolMessage: BridgeMessage = {
            role: "tool",
            content: toolResultContent,
            toolCallId: tc.id,
            toolName: tc.name,
          };
          messages.push(toolMessage);
          messageCount++;
          params.onMessage?.(toolMessage);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        lastError = errorMsg;

        // If LLM call fails, retry once with fallback
        if (this.fallbackChain && turnCount <= 1) {
          try {
            const llmResponse = await this.callLLMFallback(messages, availableTools, params.model);
            lastModelUsed = llmResponse.model;
            totalTokensUsed += llmResponse.inputTokens + llmResponse.outputTokens;

            const assistantContent = llmResponse.content ?? "";
            const assistantMsg: BridgeMessage = { role: "assistant", content: assistantContent };
            messages.push(assistantMsg);
            messageCount++;
            params.onMessage?.(assistantMsg);

            if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
              return {
                success: true,
                result: assistantContent,
                filesModified: [...new Set(filesModified)],
                toolCalls,
                messageCount,
                tokensUsed: totalTokensUsed,
                modelUsed: lastModelUsed,
                durationMs: Date.now() - startTime,
              };
            }

            // Execute fallback tool calls
            for (const tc of llmResponse.toolCalls) {
              let toolResultContent: string;
              let toolResultIsError = false;

              if (this.toolExecutor) {
                try {
                  const result = await this.toolExecutor.execute(tc.name, tc.arguments);
                  toolResultContent = result.content;
                  toolResultIsError = result.isError;
                } catch (err2) {
                  toolResultContent = `Tool execution error: ${err2 instanceof Error ? err2.message : String(err2)}`;
                  toolResultIsError = true;
                }
              } else {
                toolResultContent = `Tool not available: ${tc.name}`;
                toolResultIsError = true;
              }

              toolCalls.push({
                tool: tc.name,
                params: tc.arguments,
                result: toolResultContent,
                isError: toolResultIsError,
              });

              const filePath = String(tc.arguments?.path ?? tc.arguments?.file_path ?? tc.arguments?.filepath ?? "");
              if (filePath) filesModified.push(filePath);

              const toolMsg: BridgeMessage = {
                role: "tool",
                content: toolResultContent,
                toolCallId: tc.id,
                toolName: tc.name,
              };
              messages.push(toolMsg);
              messageCount++;
              params.onMessage?.(toolMsg);
            }

            continue; // Fallback succeeded, continue loop
          } catch {
            // Fallback also failed, include error in messages and let LLM recover
            const errMsg: BridgeMessage = {
              role: "tool",
              content: `LLM error (fallback also failed): ${errorMsg}`,
            };
            messages.push(errMsg);
            messageCount++;
            params.onMessage?.(errMsg);
            continue;
          }
        }

        // Tool execution error — include in messages and let LLM recover
        const errMsg: BridgeMessage = {
          role: "tool",
          content: `Error: ${errorMsg}`,
        };
        messages.push(errMsg);
        messageCount++;
        params.onMessage?.(errMsg);
      }
    }

    // maxTurns reached
    const lastAssistantContent = messages
      .filter(m => m.role === "assistant")
      .pop()?.content ?? "";

    return {
      success: false,
      result: lastAssistantContent || "Task did not complete within max turns",
      filesModified: [...new Set(filesModified)],
      toolCalls,
      messageCount,
      tokensUsed: totalTokensUsed,
      modelUsed: lastModelUsed,
      durationMs: Date.now() - startTime,
      error: `Max turns (${maxTurns}) reached. ${lastError ? `Last error: ${lastError}` : ""}`,
    };
  }

  // ── LLM Call ──────────────────────────────────────────────────────

  private async callLLM(
    messages: BridgeMessage[],
    availableTools: Array<{ name: string; description: string; parameters: unknown }>,
    modelOverride?: string,
  ): Promise<LLMResponse> {
    const prompt = messages.map(m => m.content).join("\n");
    const routingContext: RoutingContext = {
      prompt,
      tokenCount: Math.ceil(prompt.length / 4),
      hasCodeBlocks: prompt.includes("```"),
      matchingSkills: [],
      sessionComplexityHistory: [],
    };

    // Determine model
    let decision: RoutingDecision;
    if (modelOverride) {
      decision = {
        model: modelOverride,
        provider: "manual",
        reason: "Model override from task params",
        complexityScore: 0.5,
        estimatedCost: 0,
      };
    } else {
      decision = this.modelRouter.route(routingContext);
    }

    const startTime = Date.now();

    // If a test has set a callLLMOverride, use it
    if (this._callLLMOverride) {
      return this._callLLMOverride(decision.model, decision.provider, messages, availableTools);
    }

    // Default: return a stub response indicating no LLM backend
    return {
      content: `[stub] No LLM backend configured for ${decision.model}/${decision.provider}`,
      toolCalls: [],
      model: decision.model,
      provider: decision.provider,
      inputTokens: Math.ceil(prompt.length / 4),
      outputTokens: 0,
      durationMs: Date.now() - startTime,
    };
  }

  private async callLLMFallback(
    messages: BridgeMessage[],
    availableTools: Array<{ name: string; description: string; parameters: unknown }>,
    modelOverride?: string,
  ): Promise<LLMResponse> {
    // Try fallback chain
    if (this.fallbackChain) {
      const prompt = messages.map(m => m.content).join("\n");
      const response = await this.fallbackChain.call({
        model: modelOverride ?? this.modelRouter.getRecentDecisions(1)[0]?.model ?? "unknown",
        provider: "fallback",
        messages: messages.map(m => ({ role: m.role as "system" | "user" | "assistant", content: m.content })),
        maxTokens: this.options.maxTokens,
        temperature: this.options.temperature,
      });

      return {
        content: response.content,
        toolCalls: [],
        model: response.model,
        provider: response.provider,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        durationMs: response.latencyMs,
      };
    }

    // No fallback chain — just retry primary
    return this.callLLM(messages, availableTools, modelOverride);
  }
}
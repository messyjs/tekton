/**
 * Agent LLM Bridge — Connects AgentSession to real LLM API calls.
 *
 * Multi-turn execution loop: LLM call → tool execution → LLM call → ...
 * until the LLM returns a final text response (no tool calls) or maxTurns is reached.
 */
import type { ModelRouter } from "../models/router.js";
import type { FallbackChain } from "../models/fallback.js";
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
    execute(name: string, params: Record<string, unknown>): Promise<{
        content: string;
        isError: boolean;
    }>;
    /**
     * Get the list of available tools, optionally filtered by toolset names.
     */
    getTools(toolsets?: string[]): Array<{
        name: string;
        description: string;
        parameters: unknown;
    }>;
}
export declare class AgentLLMBridge {
    private modelRouter;
    private toolExecutor;
    private fallbackChain;
    private options;
    /**
     * Internal override for testing. Set a custom LLM call function
     * that receives (model, provider, messages, tools) and returns an LLMResponse.
     * This avoids having to mock real LLM APIs in tests.
     */
    _callLLMOverride: ((model: string, provider: string, messages: BridgeMessage[], tools: Array<{
        name: string;
        description: string;
        parameters: unknown;
    }>) => Promise<LLMResponse>) | null;
    constructor(modelRouter: ModelRouter, toolExecutor?: ToolExecutor, options?: AgentLLMBridgeOptions, fallbackChain?: FallbackChain);
    executeTask(params: BridgeTaskParams): Promise<BridgeTaskResult>;
    private callLLM;
    private callLLMFallback;
}
//# sourceMappingURL=agent-llm-bridge.d.ts.map
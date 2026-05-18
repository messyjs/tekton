import type { SCPMessage } from "../scp/types.js";
import type { AgentInfo, AgentState, TaskDefinition, TaskResult, LifecycleHooks, ContextMode } from "./types.js";
import { AgentLLMBridge, type BridgeMessage } from "./agent-llm-bridge.js";
import type { ContextEngineer } from "./context-engineer.js";
import type { KnowledgeLibrarian } from "../knowledge/librarian.js";
export interface SessionConfig {
    agentId?: string;
    name?: string;
    allowedTools: string[];
    skillHints: string[];
    maxTokenBudget: number;
    timeoutMs: number;
    metadata?: Record<string, unknown>;
    contextMode?: ContextMode;
}
export interface SessionLogEntry {
    timestamp: number;
    direction: "inbound" | "outbound";
    message: SCPMessage;
}
export declare class AgentSession {
    readonly id: string;
    readonly name: string;
    readonly config: SessionConfig;
    readonly createdAt: number;
    private state;
    private currentTaskId;
    private tokensUsed;
    private tasksCompleted;
    private tasksFailed;
    private log;
    private maxLogEntries;
    private lastActivityAt;
    private resultCallback;
    private abortController;
    private bridge;
    private _messageCount;
    private _onMessageCallback;
    private contextEngineer;
    private knowledgeLibrarian;
    constructor(config: SessionConfig, bridge?: AgentLLMBridge, contextEngineer?: ContextEngineer, knowledgeLibrarian?: KnowledgeLibrarian);
    start(hooks?: LifecycleHooks): Promise<void>;
    kill(reason: string, hooks?: LifecycleHooks): Promise<void>;
    /**
     * Execute a task — uses AgentLLMBridge for real execution if available,
     * falls back to simulation otherwise.
     */
    executeTask(task: TaskDefinition, hooks?: LifecycleHooks): Promise<TaskResult>;
    /**
     * Real task execution through AgentLLMBridge.
     * Builds a system prompt from session config, runs the multi-turn loop,
     * and emits SCP result/error messages.
     */
    private runDelegatedTask;
    /**
     * Simulated task execution for backward compatibility.
     * Used when no AgentLLMBridge is provided.
     */
    private runSimulatedTask;
    /**
     * Wait for the next result from this session.
     */
    waitForResult(): Promise<TaskResult>;
    getInfo(): AgentInfo;
    getState(): AgentState;
    isIdle(): boolean;
    isBusy(): boolean;
    isAvailable(): boolean;
    /** Number of messages (LLM turns) processed in this session. */
    get messageCount(): number;
    /**
     * Register a callback for every message processed during bridge execution.
     * Returns an unsubscribe function.
     */
    onMessage(callback: (msg: BridgeMessage) => void): () => void;
    /** Get the Context Engineer for this session (if any). */
    getContextEngineer(): ContextEngineer | null;
    /** Set the Context Engineer for this session. */
    setContextEngineer(ce: ContextEngineer | null): void;
    /** Get the Knowledge Librarian for this session (if any). */
    getKnowledgeLibrarian(): KnowledgeLibrarian | null;
    /** Set the Knowledge Librarian for this session. */
    setKnowledgeLibrarian(kl: KnowledgeLibrarian | null): void;
    /** Get context mode configuration. */
    getContextMode(): ContextMode;
    /** Switch context mode mid-session. */
    setContextMode(mode: ContextMode): void;
    /**
     * Build the messages array for an LLM call, using Context Engineer
     * and Knowledge Librarian when configured.
     */
    buildMessagesForLLM(systemPrompt: string): Array<{
        role: string;
        content: string;
    }>;
    getLog(limit?: number): SessionLogEntry[];
    private setState;
    private logEntry;
    private logResult;
    private estimateTokens;
}
//# sourceMappingURL=session.d.ts.map
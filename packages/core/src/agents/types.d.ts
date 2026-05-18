/**
 * Agent orchestration types — shared across pool, session, router, queue.
 */
export type AgentState = "spawning" | "idle" | "busy" | "blocked" | "killed" | "error";
export interface AgentInfo {
    id: string;
    name: string;
    state: AgentState;
    currentTaskId: string | null;
    createdAt: number;
    lastActivityAt: number;
    tokensUsed: number;
    tasksCompleted: number;
    tasksFailed: number;
    metadata: Record<string, unknown>;
}
export type TaskPriority = "low" | "normal" | "high";
export type TaskStatus = "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";
export interface TaskDefinition {
    id: string;
    description: string;
    priority: TaskPriority;
    skillHint?: string;
    tools?: string[];
    context?: string;
    timeoutMs?: number;
    parentId?: string;
    dependencies?: string[];
    createdAt: number;
    metadata?: Record<string, unknown>;
}
export interface TaskResult {
    taskId: string;
    agentId: string;
    status: "ok" | "partial" | "error";
    result: string;
    tokensUsed: number;
    modelUsed: string;
    durationMs: number;
    error?: string;
}
export type PoolEvent = {
    type: "agent_spawned";
    agentId: string;
} | {
    type: "agent_killed";
    agentId: string;
    reason: string;
} | {
    type: "agent_error";
    agentId: string;
    error: string;
} | {
    type: "task_queued";
    taskId: string;
    agentId?: string;
} | {
    type: "task_started";
    taskId: string;
    agentId: string;
} | {
    type: "task_completed";
    taskId: string;
    agentId: string;
    status: string;
} | {
    type: "task_failed";
    taskId: string;
    agentId: string;
    error: string;
} | {
    type: "pool_full";
} | {
    type: "pool_idle";
};
export interface PoolConfig {
    maxAgents: number;
    idleTimeoutMs: number;
    taskTimeoutMs: number;
    maxRetries: number;
    concurrencyLimit: number;
}
export declare const DEFAULT_POOL_CONFIG: PoolConfig;
export type RoutingStrategy = "inline" | "delegate" | "auto";
export interface RouterConfig {
    complexityThreshold: number;
    dependencyThreshold: number;
    alwaysInlineSkills: string[];
    alwaysDelegateSkills: string[];
}
export declare const DEFAULT_ROUTER_CONFIG: RouterConfig;
export interface PrecisionItem {
    id: string;
    category: string;
    value: string;
    context: string;
    sourceMessageIndex: number;
    supersedes?: string;
    superseded: boolean;
    pinned: boolean;
    timestamp: string;
}
export interface ContextEngineerConfig {
    model: string;
    rawWindowSize: number;
    rewriteInterval: number;
    maxPrecisionLogTokens: number;
    maxRollingContextTokens: number;
    enabled: boolean;
}
export interface OptimizedContext {
    rollingContext: string;
    precisionLog: string;
    rawMessages: Message[];
    tokenEstimate: number;
}
export interface ContextEngineerStats {
    totalMessages: number;
    rawWindowMessages: number;
    precisionItems: number;
    supersededItems: number;
    rollingContextTokens: number;
    precisionLogTokens: number;
    compressionRatio: number;
    lastRewriteAt: number;
}
export type ContextMode = "context-engineer" | "caveman" | "raw";
export interface Message {
    role: "user" | "assistant" | "tool";
    content: string;
    messageIndex: number;
}
export interface LifecycleHooks {
    onAgentSpawn?: (agentId: string) => void | Promise<void>;
    onAgentKill?: (agentId: string, reason: string) => void | Promise<void>;
    onAgentError?: (agentId: string, error: string) => void | Promise<void>;
    onTaskStart?: (taskId: string, agentId: string) => void | Promise<void>;
    onTaskComplete?: (taskId: string, result: TaskResult) => void | Promise<void>;
    onTaskFail?: (taskId: string, error: string) => void | Promise<void>;
}
//# sourceMappingURL=types.d.ts.map
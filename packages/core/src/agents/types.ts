/**
 * Agent orchestration types — shared across pool, session, router, queue.
 */

// ── Agent lifecycle ──────────────────────────────────────────────────

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

// ── Task definition ───────────────────────────────────────────────────

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
  parentId?: string;       // parent task if sub-task
  dependencies?: string[]; // task IDs that must complete before this one
  createdAt: number;
  metadata?: Record<string, unknown>; // extra data like model override
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

// ── Pool events ──────────────────────────────────────────────────────

export type PoolEvent =
  | { type: "agent_spawned"; agentId: string }
  | { type: "agent_killed"; agentId: string; reason: string }
  | { type: "agent_error"; agentId: string; error: string }
  | { type: "task_queued"; taskId: string; agentId?: string }
  | { type: "task_started"; taskId: string; agentId: string }
  | { type: "task_completed"; taskId: string; agentId: string; status: string }
  | { type: "task_failed"; taskId: string; agentId: string; error: string }
  | { type: "pool_full" }
  | { type: "pool_idle" };

// ── Pool config ──────────────────────────────────────────────────────

export interface PoolConfig {
  maxAgents: number;           // max concurrent agents (default: 4)
  idleTimeoutMs: number;       // kill idle agents after this (default: 60000)
  taskTimeoutMs: number;        // default task timeout (default: 120000)
  maxRetries: number;          // max retries per task (default: 2)
  concurrencyLimit: number;     // max parallel tasks (default: equal to maxAgents)
}

export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxAgents: 4,
  idleTimeoutMs: 60000,
  taskTimeoutMs: 120000,
  maxRetries: 2,
  concurrencyLimit: 4,
};

// ── Router config ────────────────────────────────────────────────────

export type RoutingStrategy = "inline" | "delegate" | "auto";

export interface RouterConfig {
  complexityThreshold: number;   // above this → delegate (default: 0.6)
  dependencyThreshold: number;  // above this dependency count → delegate (default: 2)
  alwaysInlineSkills: string[]; // skills that always run inline
  alwaysDelegateSkills: string[]; // skills that always delegate
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  complexityThreshold: 0.6,
  dependencyThreshold: 2,
  alwaysInlineSkills: [],
  alwaysDelegateSkills: [],
};

// ── Context Engineer ────────────────────────────────────────────────

export interface PrecisionItem {
  id: string;
  category: string;            // "audio-params", "file-paths", "decisions", etc.
  value: string;               // The precise content
  context: string;             // Why it matters / where it came from
  sourceMessageIndex: number;
  supersedes?: string;          // ID of item this replaces
  superseded: boolean;          // true if a newer item replaced this
  pinned: boolean;              // true if manually pinned by user
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

// ── Lifecycle hooks ──────────────────────────────────────────────────

export interface LifecycleHooks {
  onAgentSpawn?: (agentId: string) => void | Promise<void>;
  onAgentKill?: (agentId: string, reason: string) => void | Promise<void>;
  onAgentError?: (agentId: string, error: string) => void | Promise<void>;
  onTaskStart?: (taskId: string, agentId: string) => void | Promise<void>;
  onTaskComplete?: (taskId: string, result: TaskResult) => void | Promise<void>;
  onTaskFail?: (taskId: string, error: string) => void | Promise<void>;
}
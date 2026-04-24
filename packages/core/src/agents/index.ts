/**
 * Agent orchestration module — re-exports for public API.
 */
export { AgentLLMBridge, type AgentLLMBridgeOptions, type BridgeMessage, type ToolCallRecord, type BridgeTaskParams, type BridgeTaskResult, type LLMToolCall, type LLMResponse, type ToolExecutor } from "./agent-llm-bridge.js";
export { AgentPool, type PoolStatus } from "./pool.js";
export { AgentSession, type SessionConfig, type SessionLogEntry } from "./session.js";
export { AgentRouter, type RoutingDecision, type AggregatedResult } from "./router.js";
export { TaskQueue } from "./queue.js";
export { ContextEngineer, DEFAULT_CONTEXT_ENGINEER_CONFIG, type LLMCaller } from "./context-engineer.js";
export type {
  AgentState,
  AgentInfo,
  TaskDefinition,
  TaskResult,
  TaskPriority,
  TaskStatus,
  PoolEvent,
  PoolConfig,
  RouterConfig,
  RoutingStrategy,
  LifecycleHooks,
  PrecisionItem,
  ContextEngineerConfig,
  OptimizedContext,
  ContextEngineerStats,
  ContextMode,
  Message,
} from "./types.js";
export { DEFAULT_POOL_CONFIG, DEFAULT_ROUTER_CONFIG } from "./types.js";
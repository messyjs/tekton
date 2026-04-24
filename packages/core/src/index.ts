export { SCPDelegate, SCPResult, SCPError, SCPStatus, SCPSkillQuery, SCPSkillResponse, SCPMessage } from "./scp/types.js";
export { encodeSCP, decodeSCP } from "./scp/codec.js";
export { validateSCP } from "./scp/validate.js";
export { compress, decompress, getCompressionRatio, estimateTokens, type CompressionTier } from "./compression/caveman.js";
export { detectTier } from "./compression/tiers.js";
export { CompressionMetrics } from "./compression/metrics.js";
export { PROVIDERS, type ProviderConfig, type ModelConfig } from "./models/providers.js";
export { EXPANDED_PROVIDERS, MODEL_PRICING, findProviderForModel, findModelConfig, getModelsByType, getProviderIds } from "./models/providers-expanded.js";
export { ModelRouter, type RoutingMode, type RoutingContext, type RoutingDecision as ModelRoutingDecision } from "./models/router.js";
export { scoreComplexity } from "./models/complexity.js";
export { FallbackChain, FallbackErrorClass, type FallbackChainConfig, type FallbackError, type FallbackErrorCode, type ModelRequest, type ModelResponse } from "./models/fallback.js";
export { RoutingRulesEngine, DEFAULT_ROUTING_RULES, type RoutingRule, type RoutingCondition, type RoutingAction, type RuleEvaluationResult } from "./models/rules-engine.js";
export { CostTracker, type CostEntry, type CostReport, type CostSavings } from "./models/cost.js";
export { TelemetryTracker } from "./telemetry/tracker.js";
export { TokenBudget } from "./telemetry/budget.js";
export { initTelemetryStore } from "./telemetry/store.js";
export { loadConfig, type TektonConfig } from "./config/loader.js";
export { DEFAULT_CONFIG } from "./config/defaults.js";
export { CONFIG_SCHEMA } from "./config/schema.js";
export { SoulManager, DEFAULT_SOUL } from "./identity/soul.js";
export { PersonalityManager, PERSONALITY_PRESETS } from "./identity/personality.js";
export { MemoryManager, type UserModel } from "./memory/memory-manager.js";
export { MEMORY_TOOL_SCHEMA, type MemoryToolParams, type MemoryToolResult } from "./memory/memory-tool.js";
export { SessionSearcher, type SessionSearchResult, type SessionSummary } from "./memory/session-search.js";
export { CavememBridge, type CavememResult, type CavememEntry, type CavememObservation, type CavememSession } from "./memory/cavemem-bridge.js";

// Agent orchestration
export { AgentLLMBridge, type AgentLLMBridgeOptions, type BridgeMessage, type ToolCallRecord, type BridgeTaskParams, type BridgeTaskResult, type LLMToolCall, type LLMResponse, type ToolExecutor } from "./agents/agent-llm-bridge.js";
export { AgentPool, type PoolStatus } from "./agents/pool.js";
export { AgentSession, type SessionConfig, type SessionLogEntry } from "./agents/session.js";
export { AgentRouter, type RoutingDecision, type AggregatedResult } from "./agents/router.js";
export { TaskQueue } from "./agents/queue.js";
export { ContextEngineer, DEFAULT_CONTEXT_ENGINEER_CONFIG, type LLMCaller } from "./agents/context-engineer.js";
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
} from "./agents/types.js";
export { DEFAULT_POOL_CONFIG, DEFAULT_ROUTER_CONFIG } from "./agents/types.js";

// Knowledge Librarian
export { KnowledgeIngestor } from "./knowledge/ingestor.js";
export type { DoclingClient } from "./knowledge/ingestor.js";
export { KnowledgeIndexStore } from "./knowledge/index-store.js";
export { KnowledgeLibrarian } from "./knowledge/librarian.js";
export type { LibrarianResult, LLMCallerForLibrarian } from "./knowledge/librarian.js";
export type {
  KnowledgeDocument,
  KnowledgeChunk,
  KnowledgeSearchResult,
  KnowledgeConfig,
} from "./knowledge/types.js";
export { DEFAULT_KNOWLEDGE_CONFIG } from "./knowledge/types.js";
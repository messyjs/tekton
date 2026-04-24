/**
 * Dashboard Types — API routes, page definitions, config schema.
 */

export interface DashboardConfig {
  port: number;
  host: string;
  autoStart: boolean;
  refreshIntervalMs: number;
  theme: "dark" | "light";
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  port: 7700,
  host: "127.0.0.1",
  autoStart: false,
  refreshIntervalMs: 5000,
  theme: "dark",
};

export interface StatusResponse {
  version: string;
  uptimeMs: number;
  model: { current: string; provider: string };
  tokens: { total: number; input: number; output: number; budget: number | null };
  compression: { ratio: number; tokensSaved: number };
  skills: { total: number; topUsed: string[] };
  agents: { active: number; max: number };
  learning: { enabled: boolean; totalEvaluations: number; avgConfidence: number };
  gateway: { platforms: Record<string, { connected: boolean; messagesIn: number; messagesOut: number }> } | { [key: string]: unknown };
  voice: { enabled: boolean; sttProvider: string; ttsProvider: string };
}

export interface SessionListResponse {
  sessions: Array<{
    id: string;
    name: string;
    state: string;
    tokensUsed: number;
    tasksCompleted: number;
    createdAt: number;
    lastActivityAt: number;
  }>;
  total: number;
}

export interface SkillListResponse {
  skills: Array<{
    name: string;
    description: string;
    confidence: number;
    usageCount: number;
    category: string;
    enabled: boolean;
  }>;
  total: number;
}

export interface RoutingLogEntry {
  timestamp: string;
  promptSnippet: string;
  complexityScore: number;
  modelChosen: string;
  provider: string;
  outcome: "success" | "fallback" | "error";
  latencyMs: number;
  costEstimate: number;
}

export interface RoutingRulesResponse {
  rules: Array<{
    id: string;
    name: string;
    priority: number;
    enabled: boolean;
    condition: string;
    action: string;
  }>;
}

export interface AnalyticsTokensResponse {
  entries: Array<{
    timestamp: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  totalTokens: number;
  totalCost: number;
}

export interface AnalyticsCompressionResponse {
  entries: Array<{
    timestamp: string;
    tier: string;
    originalLength: number;
    compressedLength: number;
    ratio: number;
    tokensSaved: number;
  }>;
  totalTokensSaved: number;
  avgRatio: number;
}

export interface AnalyticsCostResponse {
  entries: Array<{
    date: string;
    provider: string;
    model: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  totalCost: number;
  savings: number;
}

export interface SCPTrafficEntry {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  taskType: string;
  payloadSize: number;
  status: string;
}

export interface ConfigResponse {
  config: Record<string, unknown>;
  schema: Record<string, unknown>;
}

export interface MemoryResponse {
  memory: string;
  userModel: string;
  sessions: Array<{
    id: string;
    summary: string;
    timestamp: string;
  }>;
}

export interface TrainingStatusResponse {
  running: boolean;
  jobs: Array<{
    id: string;
    name: string;
    status: string;
    progress: number;
    gpuUtil: number;
    loss: number;
    epoch: number;
  }>;
}

export type DashboardPage =
  | "status"
  | "sessions"
  | "skills"
  | "routing"
  | "analytics"
  | "scp-traffic"
  | "config"
  | "training"
  | "memory"
  | "gateway"
  | "documents"
  | "forge";

export const DASHBOARD_PAGES: Array<{ id: DashboardPage; label: string; icon: string }> = [
  { id: "status", label: "Status", icon: "⚡" },
  { id: "sessions", label: "Sessions", icon: "💬" },
  { id: "skills", label: "Skills", icon: "🎯" },
  { id: "routing", label: "Routing", icon: "🔀" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "scp-traffic", label: "SCP Traffic", icon: "📡" },
  { id: "config", label: "Config", icon: "⚙️" },
  { id: "training", label: "Training", icon: "🧠" },
  { id: "memory", label: "Memory", icon: "📌" },
  { id: "gateway", label: "Gateway", icon: "🌐" },
  { id: "documents", label: "Documents", icon: "📄" },
  { id: "forge", label: "Forge", icon: "🔨" },
];
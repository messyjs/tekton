/**
 * Dashboard Types — API routes, page definitions, config schema.
 */

export interface DashboardConfig {
  port: number;
  host: string;
  autoStart: boolean;
  refreshIntervalMs: number;
  theme: "dark" | "light";
  wsPort?: number;
  authEnabled?: boolean;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  port: 7700,
  host: "127.0.0.1",
  autoStart: false,
  refreshIntervalMs: 5000,
  theme: "dark",
  wsPort: undefined,
  authEnabled: false,
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

export interface TradingData {
  traders: Array<{
    id: string; name: string; emoji: string; strategy: string;
    pnl: number; pnl_pct: number; dd: number; positions: number;
  }>;
  positions: Array<{
    trader_id: string; trader_name: string; symbol: string;
    side: string; qty: number; entry: number; mark: number;
    tp: number | string; sl: number | string; pnl: number;
  }>;
  total_pnl: number;
  trades_placed: number;
  closed: Array<{
    trader_id: string; trader_name: string; symbol: string;
    side: string; status: string;
  }>;
  remaining_seconds: number;
  progress: number;
  log: Array<{ text: string; type: string }>;
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
  | "chat"
  | "status"
  | "sessions"
  | "skills"
  | "terminal"
  | "files"
  | "kanban"
  | "swarm"
  | "routing"
  | "analytics"
  | "scp-traffic"
  | "config"
  | "training"
  | "memory"
  | "gateway"
  | "documents"
  | "forge"
  | "trading"
  | "conductor"
  | "models"
  | "pi";

export const DASHBOARD_PAGES: Array<{ id: DashboardPage; label: string; icon: string }> = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "status", label: "Status", icon: "status" },
  { id: "sessions", label: "Sessions", icon: "sessions" },
  { id: "skills", label: "Skills", icon: "skills" },
  { id: "terminal", label: "Terminal", icon: "terminal" },
  { id: "files", label: "Files", icon: "files" },
  { id: "kanban", label: "Kanban", icon: "kanban" },
  { id: "swarm", label: "Swarm", icon: "swarm" },
  { id: "routing", label: "Routing", icon: "routing" },
  { id: "analytics", label: "Analytics", icon: "analytics" },
  { id: "scp-traffic", label: "SCP Traffic", icon: "scp-traffic" },
  { id: "config", label: "Config", icon: "config" },
  { id: "training", label: "Training", icon: "training" },
  { id: "memory", label: "Memory", icon: "memory" },
  { id: "gateway", label: "Gateway", icon: "gateway" },
  { id: "documents", label: "Documents", icon: "documents" },
  { id: "forge", label: "Forge", icon: "forge" },
  { id: "trading", label: "Trading", icon: "trading" },
  { id: "pi", label: "PI Agent", icon: "pi" },
  { id: "conductor", label: "Conductor", icon: "conductor" },
  { id: "models", label: "Models", icon: "routing" },
];
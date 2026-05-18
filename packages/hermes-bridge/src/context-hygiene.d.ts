/**
 * ContextHygiene — Implements usage-limit-reducer principles.
 * Manages session compaction, history pruning, and context window efficiency.
 */
import type { AgentMessage } from "./evaluator.js";
export interface HygieneConfig {
    maxTurnsBeforeRefresh: number;
    compactThreshold: number;
    pruneOlderThanTurns: number;
    maxTokenPerExchangeWarning: number;
}
export interface SessionState {
    messages: AgentMessage[];
    contextWindow: number;
    turnCount: number;
}
export interface HygieneRecommendation {
    action: "compact" | "refresh" | "prune" | "warn_token_spike";
    reason: string;
    urgency: "low" | "medium" | "high";
    estimatedSavings?: number;
}
export declare class ContextHygiene {
    private config;
    constructor(config?: Partial<HygieneConfig>);
    /** Should we compact the session? */
    shouldCompact(session: {
        messages: AgentMessage[];
        contextWindow: number;
    }): boolean;
    /** Should we suggest a fresh session? */
    shouldRefresh(session: {
        turnCount: number;
    }): boolean;
    /** Prune old tool results from history, keeping 1-line summaries */
    pruneHistory(messages: AgentMessage[], maxTurns?: number): AgentMessage[];
    /** Estimate current context usage as percentage (0-1) */
    getContextUsage(messages: AgentMessage[], contextWindow: number): number;
    /** Get hygiene recommendations for current session */
    getRecommendations(session: SessionState): HygieneRecommendation[];
    private estimateTotalTokens;
    private countOldToolResults;
    private getAvgTokensPerExchange;
}
//# sourceMappingURL=context-hygiene.d.ts.map
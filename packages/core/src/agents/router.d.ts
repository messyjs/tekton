import type { RoutingContext } from "../models/router.js";
import type { TaskDefinition, RouterConfig, RoutingStrategy } from "./types.js";
export interface RoutingDecision {
    strategy: RoutingStrategy;
    taskId: string;
    reason: string;
    complexityScore: number;
    delegateTo?: string;
    estimatedCost: number;
}
export interface AggregatedResult {
    taskId: string;
    results: Array<{
        subtaskId: string;
        status: "ok" | "partial" | "error";
        result: string;
        durationMs: number;
    }>;
    overallStatus: "ok" | "partial" | "error";
    summary: string;
    totalDurationMs: number;
    totalTokensUsed: number;
}
export declare class AgentRouter {
    private config;
    private decisionHistory;
    private maxHistory;
    constructor(config?: Partial<RouterConfig>);
    /**
     * Route a task — determine if it should be handled inline or delegated.
     */
    route(task: TaskDefinition, context?: Partial<RoutingContext>): RoutingDecision;
    /**
     * Aggregate results from multiple delegated sub-tasks.
     */
    aggregateResults(parentTaskId: string, results: Array<{
        subtaskId: string;
        status: "ok" | "partial" | "error";
        result: string;
        durationMs: number;
        tokensUsed?: number;
    }>): AggregatedResult;
    /**
     * Check if two tasks can run in parallel (no shared dependencies).
     */
    canRunParallel(a: TaskDefinition, b: TaskDefinition): boolean;
    /**
     * Get routing decision history.
     */
    getHistory(limit?: number): RoutingDecision[];
    private calculateComplexity;
    private makeDecision;
    private estimateCost;
    private determineOverallStatus;
    private buildSummary;
    updateConfig(config: Partial<RouterConfig>): void;
    getConfig(): RouterConfig;
}
//# sourceMappingURL=router.d.ts.map
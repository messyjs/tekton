import { RoutingRulesEngine, type RoutingRule } from "./rules-engine.js";
import { CostTracker } from "./cost.js";
export interface RoutingConfig {
    fastModel: string;
    fastProvider: string;
    deepModel: string;
    deepProvider: string;
    fallbackChain: Array<{
        model: string;
        provider: string;
    }>;
    complexityThreshold: number;
    simpleThreshold: number;
}
export interface RoutingContext {
    prompt: string;
    tokenCount: number;
    hasCodeBlocks: boolean;
    matchingSkills: string[];
    userOverride?: string;
    sessionComplexityHistory: number[];
}
export interface RoutingDecision {
    model: string;
    provider: string;
    reason: string;
    complexityScore: number;
    estimatedCost: number;
    /** Whether this decision was made by a routing rule */
    ruleMatch?: string;
}
export type RoutingMode = "auto" | "fast" | "deep" | "rules";
export declare class ModelRouter {
    private config;
    private mode;
    private recentDecisions;
    private maxHistory;
    private rulesEngine;
    private costTracker;
    constructor(config: RoutingConfig, options?: {
        rules?: RoutingRule[];
    });
    route(context: RoutingContext): RoutingDecision;
    setMode(mode: RoutingMode): void;
    getMode(): RoutingMode;
    getRecentDecisions(limit?: number): RoutingDecision[];
    /** Get the rules engine for direct rule manipulation */
    getRulesEngine(): RoutingRulesEngine;
    /** Get the cost tracker for cost reporting */
    getCostTracker(): CostTracker;
    private recordDecision;
}
//# sourceMappingURL=router.d.ts.map
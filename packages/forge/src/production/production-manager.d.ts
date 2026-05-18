import type { ProductionPlan, TaskCard, AgentTuple, SessionRecord } from "../types.js";
export interface ProductionManagerConfig {
    maxConcurrency: number;
    maxRetries: number;
    agentPool?: any;
}
export interface ProductionResult {
    completed: TaskCard[];
    failed: TaskCard[];
    allComplete: boolean;
    sessionRecords: SessionRecord[];
}
/**
 * Production Manager — executes a production plan by spawning agents
 * and running sessions within budget constraints.
 */
export declare class ProductionManager {
    private config;
    private sessionRunner;
    private retryCounts;
    constructor(config?: Partial<ProductionManagerConfig>);
    /**
     * Execute a production plan — the main loop.
     *
     * 1. Copy project template
     * 2. Resolve dependency order
     * 3. While uncompleted tasks exist:
     *    a. Get ready tasks
     *    b. Spawn agents and run sessions
     *    c. Handle completion, retries, failures
     * 4. Return results
     */
    executePlan(plan: ProductionPlan, projectDir: string, executor?: (tuple: AgentTuple, budget: any) => Promise<{
        messages: number;
        result: string;
        completed: boolean;
    }>): Promise<ProductionResult>;
    /**
     * Execute a single task card.
     */
    private executeTask;
    /**
     * Copy project template to project directory.
     */
    private copyTemplate;
}
//# sourceMappingURL=production-manager.d.ts.map
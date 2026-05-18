/**
 * Session Runner — Executes agent sessions with budget tracking and wrap-up warnings.
 */
import type { AgentTuple, TaskCard, RoleDefinition, SessionRecord } from "../types.js";
import { type SessionBudget } from "../session-budget.js";
export interface SessionResult {
    sessionRecord: SessionRecord;
    completed: boolean;
    result: string;
}
export interface SessionRunnerConfig {
    agentPool: any;
    maxConcurrency?: number;
}
/**
 * Session Runner — orchestrates agent execution within budget constraints.
 *
 * Manages message budgets, warning injection, and force-stops.
 */
export declare class SessionRunner {
    private agentPool;
    private config;
    constructor(config: SessionRunnerConfig);
    /**
     * Run a session for a given agent tuple and task card.
     *
     * In production this calls agentPool to spawn and run agents.
     * For testing, it can be run with a simulated executor.
     */
    runSession(tuple: AgentTuple, taskCard: TaskCard, role: RoleDefinition, executor?: (tuple: AgentTuple, budget: SessionBudget) => Promise<{
        messages: number;
        result: string;
        completed: boolean;
    }>): Promise<SessionResult>;
    /**
     * Check if a warning should be injected.
     * Returns the warning message or null.
     */
    getWarningMessage(budget: SessionBudget): string | null;
}
//# sourceMappingURL=session-runner.d.ts.map
export interface SessionLimitsConfig {
    defaults: Record<string, number>;
    categories: Record<string, number>;
    roleOverrides: Record<string, number>;
    warnings: {
        firstWarning: number;
        secondWarning: number;
        finalWarning: number;
    };
}
export interface SessionBudget {
    roleId: string;
    limit: number;
    used: number;
    warnings: {
        firstWarning: number;
        secondWarning: number;
        finalWarning: number;
    };
}
/**
 * Create a session budget for a role.
 */
export declare function createBudget(roleId: string): SessionBudget;
/**
 * Increment a budget's used count. Returns the updated budget.
 */
export declare function increment(budget: SessionBudget): SessionBudget;
/**
 * Get remaining messages in a budget.
 */
export declare function remaining(budget: SessionBudget): number;
/**
 * Check if a budget is in the warning zone (remaining <= firstWarning threshold).
 */
export declare function isWarningZone(budget: SessionBudget): boolean;
/**
 * Check if a budget is exhausted.
 */
export declare function isExhausted(budget: SessionBudget): boolean;
/**
 * Get the session limit for a role.
 * Checks role override first, then category heuristics, then default.
 */
export declare function getLimit(roleId: string): number;
//# sourceMappingURL=session-budget.d.ts.map
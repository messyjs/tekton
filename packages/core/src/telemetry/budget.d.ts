export interface BudgetConfig {
    dailyLimit: number | null;
    sessionLimit: number | null;
    warnPercent: number;
}
export declare class TokenBudget {
    private config;
    private spent;
    private dailySpent;
    private dailyResetDate;
    constructor(config: BudgetConfig);
    spend(tokens: number): void;
    getRemaining(): {
        daily: number | null;
        session: number | null;
    };
    isOverBudget(): boolean;
    shouldWarn(): boolean;
    reset(): void;
    private checkDailyReset;
}
//# sourceMappingURL=budget.d.ts.map
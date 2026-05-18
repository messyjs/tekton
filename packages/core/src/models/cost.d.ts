export interface CostEntry {
    timestamp: Date;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    routingMode: string;
    complexityScore: number;
}
export interface CostReport {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    byModel: Record<string, {
        cost: number;
        inputTokens: number;
        outputTokens: number;
        calls: number;
    }>;
    byProvider: Record<string, {
        cost: number;
        calls: number;
    }>;
    byDay: Record<string, number>;
    savings: CostSavings;
}
export interface CostSavings {
    /** Cost if all calls went to the deep model */
    withoutRouting: number;
    /** Actual cost with routing */
    withRouting: number;
    /** Amount saved */
    saved: number;
    /** Percentage saved */
    savedPercent: number;
}
export declare class CostTracker {
    private entries;
    private pricing;
    constructor(pricing?: Record<string, {
        input: number;
        output: number;
    }>);
    /**
     * Record a cost entry.
     */
    record(entry: Omit<CostEntry, "cost">): CostEntry;
    /**
     * Estimate cost for a model given token counts.
     */
    estimateCost(model: string, inputTokens: number, outputTokens: number): number;
    /**
     * Get total cost since a given date.
     */
    getTotalCost(since?: Date): number;
    /**
     * Get cost broken down by model.
     */
    getCostByModel(since?: Date): Record<string, {
        cost: number;
        calls: number;
        inputTokens: number;
        outputTokens: number;
    }>;
    /**
     * Get cost broken down by provider.
     */
    getCostByProvider(since?: Date): Record<string, {
        cost: number;
        calls: number;
    }>;
    /**
     * Get cost broken down by day.
     */
    getCostByDay(since?: Date): Record<string, number>;
    /**
     * Calculate cost savings from routing.
     * Compares actual cost vs. cost if all calls went to the deep model.
     */
    getCostSavings(since?: Date): CostSavings;
    /**
     * Generate a full cost report.
     */
    getReport(since?: Date): CostReport;
    /**
     * Get the number of recorded entries.
     */
    get entryCount(): number;
    /**
     * Clear all entries.
     */
    clear(): void;
    /**
     * Get entries, optionally filtered by date range.
     */
    getEntries(since?: Date): CostEntry[];
}
//# sourceMappingURL=cost.d.ts.map
export interface TelemetryEvent {
    type: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    compressionRatio?: number;
    latencyMs: number;
    routingDecision?: string;
    skillUsed?: string;
    costEstimate: number;
}
export declare class TelemetryTracker {
    private db;
    constructor(dbPath: string);
    private init;
    record(event: TelemetryEvent): void;
    getTokensByModel(since?: Date): Record<string, number>;
    getTokensByDay(days?: number): Array<{
        date: string;
        tokens: number;
    }>;
    getCompressionStats(): {
        totalSaved: number;
        averageRatio: number;
    };
    getRoutingStats(): {
        fastCount: number;
        deepCount: number;
        avgComplexity: number;
    };
    getCostEstimate(since?: Date): number;
    close(): void;
}
//# sourceMappingURL=tracker.d.ts.map
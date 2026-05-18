import type { MetricPoint } from "./types.js";
export declare class MetricsTracker {
    private db;
    private metrics;
    constructor(dbPath?: string);
    private initSchema;
    /** Record a metric point for a job */
    recordMetric(jobId: string, point: Omit<MetricPoint, "timestamp">): void;
    /** Parse a training log line and extract metrics */
    parseLogLine(jobId: string, line: string): boolean;
    /** Parse a full training log */
    parseLog(jobId: string, logContent: string): number;
    /** Get all metrics for a job */
    getMetrics(jobId: string): MetricPoint[];
    /** Get the latest metric for a job */
    getLatestMetric(jobId: string): MetricPoint | undefined;
    /** Get training summary for a job */
    getTrainingSummary(jobId: string): {
        totalSteps: number;
        currentLoss: number;
        bestLoss: number;
        lossReduction: number;
        averageGpuUtil: number;
        averageSpeed: number;
    };
    /** Export metrics to JSON */
    exportMetrics(jobId: string): string;
    /** Clear metrics for a job */
    clearMetrics(jobId: string): void;
    /** Close the database */
    close(): void;
}
//# sourceMappingURL=metrics-tracker.d.ts.map
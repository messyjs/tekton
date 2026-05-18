import Database from "better-sqlite3";
import type { CompressionTier } from "./caveman.js";
export interface CompressionStats {
    totalSaved: number;
    averageRatio: number;
    byTier: Partial<Record<CompressionTier, {
        count: number;
        avgRatio: number;
    }>>;
}
export declare class CompressionMetrics {
    private db;
    constructor(db: Database.Database);
    record(tier: CompressionTier, originalLength: number, compressedLength: number): void;
    getStats(): CompressionStats;
}
//# sourceMappingURL=metrics.d.ts.map
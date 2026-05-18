export class CompressionMetrics {
    db;
    constructor(db) {
        this.db = db;
        db.exec(`
      CREATE TABLE IF NOT EXISTS compression_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT (datetime('now')),
        tier TEXT NOT NULL,
        original_length INTEGER NOT NULL,
        compressed_length INTEGER NOT NULL,
        ratio REAL NOT NULL,
        tokens_saved INTEGER NOT NULL
      )
    `);
    }
    record(tier, originalLength, compressedLength) {
        const ratio = originalLength > 0 ? compressedLength / originalLength : 1;
        const tokensSaved = Math.round((originalLength - compressedLength) / 4);
        this.db.prepare(`
      INSERT INTO compression_events (tier, original_length, compressed_length, ratio, tokens_saved)
      VALUES (?, ?, ?, ?, ?)
    `).run(tier, originalLength, compressedLength, ratio, tokensSaved);
    }
    getStats() {
        const rows = this.db.prepare(`
      SELECT tier, COUNT(*) as count, AVG(ratio) as avg_ratio, SUM(tokens_saved) as total_saved
      FROM compression_events
      GROUP BY tier
    `).all();
        let totalSaved = 0;
        let totalWeightedRatio = 0;
        let totalCount = 0;
        const byTier = {};
        for (const row of rows) {
            totalSaved += row.total_saved ?? 0;
            totalWeightedRatio += (row.avg_ratio ?? 1) * row.count;
            totalCount += row.count;
            byTier[row.tier] = {
                count: row.count,
                avgRatio: row.avg_ratio ?? 1,
            };
        }
        return {
            totalSaved,
            averageRatio: totalCount > 0 ? totalWeightedRatio / totalCount : 1,
            byTier,
        };
    }
}
//# sourceMappingURL=metrics.js.map
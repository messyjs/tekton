import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
export class TelemetryTracker {
    db;
    constructor(dbPath) {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(dbPath);
        this.init();
    }
    init() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT (datetime('now')),
        type TEXT NOT NULL,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        compression_ratio REAL,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        routing_decision TEXT,
        skill_used TEXT,
        cost_estimate REAL NOT NULL DEFAULT 0
      )
    `);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_model ON events(model)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`);
    }
    record(event) {
        this.db.prepare(`
      INSERT INTO events (type, model, provider, input_tokens, output_tokens, compression_ratio, latency_ms, routing_decision, skill_used, cost_estimate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(event.type, event.model, event.provider, event.inputTokens, event.outputTokens, event.compressionRatio ?? null, event.latencyMs, event.routingDecision ?? null, event.skillUsed ?? null, event.costEstimate);
    }
    getTokensByModel(since) {
        const where = since ? `WHERE timestamp >= ?` : "";
        const sql = `SELECT model, SUM(input_tokens + output_tokens) as total FROM events ${where} GROUP BY model`;
        const stmt = this.db.prepare(sql);
        const params = since ? [since.toISOString()] : [];
        const rows = stmt.all(...params);
        const result = {};
        for (const row of rows) {
            result[row.model] = row.total;
        }
        return result;
    }
    getTokensByDay(days = 30) {
        const rows = this.db.prepare(`
      SELECT DATE(timestamp) as date, SUM(input_tokens + output_tokens) as tokens
      FROM events
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();
        return rows;
    }
    getCompressionStats() {
        const row = this.db.prepare(`SELECT AVG(compression_ratio) as avg_ratio, COUNT(*) as count FROM events WHERE compression_ratio IS NOT NULL`).get();
        const totalRow = this.db.prepare(`SELECT SUM(input_tokens) as total_input, SUM(output_tokens) as total_output FROM events WHERE compression_ratio IS NOT NULL`).get();
        const totalTokens = (totalRow?.total_input ?? 0) + (totalRow?.total_output ?? 0);
        const avgRatio = row?.avg_ratio ?? 1;
        const totalSaved = Math.round(totalTokens * (1 - avgRatio));
        return { totalSaved, averageRatio: avgRatio };
    }
    getRoutingStats() {
        const fastRow = this.db.prepare(`SELECT COUNT(*) as count FROM events WHERE routing_decision LIKE '%fast%'`).get();
        const deepRow = this.db.prepare(`SELECT COUNT(*) as count FROM events WHERE routing_decision LIKE '%deep%'`).get();
        return {
            fastCount: fastRow?.count ?? 0,
            deepCount: deepRow?.count ?? 0,
            avgComplexity: 0.5,
        };
    }
    getCostEstimate(since) {
        const where = since ? `WHERE timestamp >= ?` : "";
        const sql = `SELECT SUM(cost_estimate) as total FROM events ${where}`;
        const stmt = this.db.prepare(sql);
        const params = since ? [since.toISOString()] : [];
        const row = stmt.get(...params);
        return row?.total ?? 0;
    }
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=tracker.js.map
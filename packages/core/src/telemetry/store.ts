import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export function initTelemetryStore(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS compression_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      tier TEXT NOT NULL,
      original_length INTEGER NOT NULL,
      compressed_length INTEGER NOT NULL,
      ratio REAL NOT NULL,
      tokens_saved INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      budget_type TEXT NOT NULL,
      limit_tokens INTEGER,
      spent_tokens INTEGER NOT NULL,
      remaining_tokens INTEGER,
      is_over_budget INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_model ON events(model);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_compression_tier ON compression_events(tier);
    CREATE INDEX IF NOT EXISTS idx_budget_type ON budget_tracking(budget_type);
  `);

  return db;
}
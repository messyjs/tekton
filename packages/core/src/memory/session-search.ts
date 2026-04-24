import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export interface SessionSearchResult {
  sessionId: string;
  timestamp: string;
  snippet: string;
  rank: number;
}

export interface SessionSummary {
  sessionId: string;
  startTime: string;
  endTime: string;
  messageCount: number;
  summary: string;
}

export class SessionSearcher {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        message_count INTEGER DEFAULT 0,
        summary TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS session_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);

    // Try to create FTS5 index — gracefully handle if FTS5 not available
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS session_messages_fts USING fts5(
          content,
          content='session_messages',
          content_rowid='id'
        );

        CREATE TRIGGER IF NOT EXISTS session_messages_ai AFTER INSERT ON session_messages BEGIN
          INSERT INTO session_messages_fts(rowid, content) VALUES (new.id, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS session_messages_ad AFTER DELETE ON session_messages BEGIN
          INSERT INTO session_messages_fts(session_messages_fts, rowid, content) VALUES('delete', old.id, old.content);
        END;
      `);
    } catch {
      // FTS5 not available; fallback to LIKE-based search
    }
  }

  search(query: string, limit = 10): SessionSearchResult[] {
    // Try FTS5 first
    try {
      const rows = this.db.prepare(`
        SELECT m.session_id as sessionId, m.timestamp, snippet(session_messages_fts, 0, '>>>', '<<<', '...', 32) as snippet, rank
        FROM session_messages_fts f
        JOIN session_messages m ON m.id = f.rowid
        WHERE session_messages_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(query, limit) as SessionSearchResult[];
      return rows;
    } catch {
      // Fallback to LIKE search
      const rows = this.db.prepare(`
        SELECT session_id as sessionId, timestamp, substr(content, 1, 200) as snippet, 0 as rank
        FROM session_messages
        WHERE content LIKE ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(`%${query}%`, limit) as SessionSearchResult[];
      return rows;
    }
  }

  getRecentSessions(limit = 10): SessionSummary[] {
    const rows = this.db.prepare(`
      SELECT id as sessionId, start_time as startTime, end_time as endTime,
             message_count as messageCount, summary
      FROM sessions
      ORDER BY start_time DESC
      LIMIT ?
    `).all(limit) as SessionSummary[];
    return rows;
  }

  recordSessionStart(sessionId: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, start_time, message_count)
      VALUES (?, datetime('now'), 0)
    `).run(sessionId);
  }

  recordMessage(sessionId: string, role: string, content: string): void {
    this.db.prepare(`
      INSERT INTO session_messages (session_id, timestamp, role, content)
      VALUES (?, datetime('now'), ?, ?)
    `).run(sessionId, role, content);

    this.db.prepare(`
      UPDATE sessions SET message_count = message_count + 1, end_time = datetime('now') WHERE id = ?
    `).run(sessionId);
  }

  close(): void {
    this.db.close();
  }
}
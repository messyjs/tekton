/**
 * Session Store — Per-user, per-platform session isolation backed by SQLite.
 * Persists conversation state across gateway restarts.
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS sessions (
  session_key TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  message_count INTEGER DEFAULT 0,
  current_model TEXT,
  personality_id TEXT,
  voice_enabled INTEGER DEFAULT 0,
  skills_installed TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  text TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  platform TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  FOREIGN KEY (session_key) REFERENCES sessions(session_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_key, timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_platform ON sessions(platform, user_id);
`;
export class SessionStore {
    db;
    constructor(config) {
        // Ensure directory exists
        const dir = dirname(config.dbPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        this.db = new Database(config.dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.exec(CREATE_TABLES);
    }
    /** Get or create a session for a user on a platform */
    getOrCreateSession(key) {
        const sessionKey = this.makeKey(key);
        const row = this.db.prepare("SELECT * FROM sessions WHERE session_key = ?").get(sessionKey);
        if (row) {
            return this.rowToSession(row);
        }
        // Create new session
        const now = Date.now();
        this.db.prepare(`INSERT INTO sessions (session_key, platform, user_id, user_name, created_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?)`).run(sessionKey, key.platform, key.userId, "", now, now);
        return {
            sessionKey,
            platform: key.platform,
            userId: key.userId,
            userName: "",
            createdAt: now,
            lastActivityAt: now,
            messageCount: 0,
            currentModel: null,
            personalityId: null,
            voiceEnabled: false,
            skillsInstalled: [],
            metadata: {},
        };
    }
    /** Update session fields */
    updateSession(key, updates) {
        const sessionKey = this.makeKey(key);
        const sets = [];
        const values = [];
        if (updates.userName !== undefined) {
            sets.push("user_name = ?");
            values.push(updates.userName);
        }
        if (updates.currentModel !== undefined) {
            sets.push("current_model = ?");
            values.push(updates.currentModel);
        }
        if (updates.personalityId !== undefined) {
            sets.push("personality_id = ?");
            values.push(updates.personalityId);
        }
        if (updates.voiceEnabled !== undefined) {
            sets.push("voice_enabled = ?");
            values.push(updates.voiceEnabled ? 1 : 0);
        }
        if (updates.skillsInstalled !== undefined) {
            sets.push("skills_installed = ?");
            values.push(JSON.stringify(updates.skillsInstalled));
        }
        if (updates.metadata !== undefined) {
            sets.push("metadata = ?");
            values.push(JSON.stringify(updates.metadata));
        }
        sets.push("last_activity_at = ?");
        values.push(Date.now());
        if (sets.length > 1) { // more than just last_activity_at
            values.push(sessionKey);
            this.db.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE session_key = ?`).run(...values);
        }
    }
    /** Increment message count for a session */
    incrementMessageCount(key) {
        const sessionKey = this.makeKey(key);
        this.db.prepare("UPDATE sessions SET message_count = message_count + 1, last_activity_at = ? WHERE session_key = ?").run(Date.now(), sessionKey);
    }
    /** Store a message */
    addMessage(key, direction, text, platform) {
        const sessionKey = this.makeKey(key);
        this.db.prepare("INSERT INTO messages (session_key, direction, text, timestamp, platform) VALUES (?, ?, ?, ?, ?)").run(sessionKey, direction, text, Date.now(), platform);
        this.incrementMessageCount(key);
    }
    /** Get recent messages for a session */
    getRecentMessages(key, limit = 50) {
        const sessionKey = this.makeKey(key);
        return this.db.prepare("SELECT direction, text, timestamp FROM messages WHERE session_key = ? ORDER BY timestamp DESC LIMIT ?").all(sessionKey, limit).reverse();
    }
    /** List all sessions */
    listSessions() {
        const rows = this.db.prepare("SELECT * FROM sessions ORDER BY last_activity_at DESC").all();
        return rows.map((r) => this.rowToSession(r));
    }
    /** Find sessions by platform */
    findSessions(platform) {
        const rows = this.db.prepare("SELECT * FROM sessions WHERE platform = ?").all(platform);
        return rows.map((r) => this.rowToSession(r));
    }
    /** Delete a session and its messages */
    deleteSession(key) {
        const sessionKey = this.makeKey(key);
        this.db.prepare("DELETE FROM messages WHERE session_key = ?").run(sessionKey);
        this.db.prepare("DELETE FROM sessions WHERE session_key = ?").run(sessionKey);
    }
    /** Close the database */
    close() {
        this.db.close();
    }
    makeKey(key) {
        return `${key.platform}:${key.userId}`;
    }
    rowToSession(row) {
        return {
            sessionKey: row.session_key,
            platform: row.platform,
            userId: row.user_id,
            userName: row.user_name ?? "",
            createdAt: row.created_at,
            lastActivityAt: row.last_activity_at,
            messageCount: row.message_count,
            currentModel: row.current_model,
            personalityId: row.personality_id,
            voiceEnabled: Boolean(row.voice_enabled),
            skillsInstalled: JSON.parse(row.skills_installed ?? "[]"),
            metadata: JSON.parse(row.metadata ?? "{}"),
        };
    }
}
//# sourceMappingURL=store.js.map
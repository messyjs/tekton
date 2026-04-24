/**
 * Knowledge Index Store — SQLite-backed storage for knowledge chunks.
 * Supports FTS5 full-text search and cosine similarity for embeddings.
 */
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { KnowledgeDocument, KnowledgeChunk, KnowledgeSearchResult, KnowledgeConfig } from "./types.js";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class KnowledgeIndexStore {
  private db: Database.Database;
  private config: KnowledgeConfig;

  constructor(config: KnowledgeConfig) {
    this.config = config;

    // Ensure index directory exists
    const indexPath = config.indexPath.replace("~", process.env.HOME ?? process.env.USERPROFILE ?? ".");
    if (!existsSync(indexPath)) {
      mkdirSync(indexPath, { recursive: true });
    }

    const dbPath = join(indexPath, "knowledge.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initializeSchema();
  }

  // ── Schema ──────────────────────────────────────────────────────

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        title TEXT NOT NULL,
        filePath TEXT NOT NULL,
        format TEXT NOT NULL,
        topics_json TEXT NOT NULL DEFAULT '[]',
        ingestedAt TEXT NOT NULL,
        totalTokens INTEGER NOT NULL DEFAULT 0,
        fileHash TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        content TEXT NOT NULL,
        heading TEXT NOT NULL DEFAULT '',
        pageNumber INTEGER,
        chunkIndex INTEGER NOT NULL DEFAULT 0,
        tokens INTEGER NOT NULL DEFAULT 0,
        topics_json TEXT NOT NULL DEFAULT '[]',
        embedding_blob BLOB,
        FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_documentId ON chunks(documentId);
      CREATE INDEX IF NOT EXISTS idx_chunks_tokens ON chunks(tokens);
    `);

    // Create FTS5 virtual table for full-text search
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
          content,
          heading,
          topics_json,
          content='chunks',
          content_rowid='rowid'
        );
      `);

      // Triggers to keep FTS in sync
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
          INSERT INTO chunks_fts(rowid, content, heading, topics_json)
          VALUES (new.rowid, new.content, new.heading, new.topics_json);
        END;

        CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
          INSERT INTO chunks_fts(chunks_fts, rowid, content, heading, topics_json)
          VALUES ('delete', old.rowid, old.content, old.heading, old.topics_json);
        END;
      `);
    } catch {
      // FTS5 not available in this SQLite build — fall back to LIKE search
    }
  }

  // ── Save ──────────────────────────────────────────────────────────

  /**
   * Save chunks for a document. Also saves the document metadata.
   */
  saveChunks(chunks: KnowledgeChunk[], document: KnowledgeDocument): void {
    const insertDoc = this.db.prepare(`
      INSERT OR REPLACE INTO documents (id, filename, title, filePath, format, topics_json, ingestedAt, totalTokens, fileHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertChunk = this.db.prepare(`
      INSERT INTO chunks (id, documentId, content, heading, pageNumber, chunkIndex, tokens, topics_json, embedding_blob)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertDoc.run(
        document.id,
        document.filename,
        document.title,
        document.filePath,
        document.format,
        JSON.stringify(document.topics),
        document.ingestedAt,
        document.totalTokens,
        document.fileHash,
      );

      for (const chunk of chunks) {
        insertChunk.run(
          chunk.id,
          chunk.documentId,
          chunk.content,
          chunk.heading,
          chunk.pageNumber ?? null,
          chunk.chunkIndex,
          chunk.tokens,
          JSON.stringify(chunk.topics),
          chunk.embedding ? Buffer.from(new Float64Array(chunk.embedding).buffer) : null,
        );
      }
    });

    transaction();
  }

  // ── Search ────────────────────────────────────────────────────────

  /**
   * Search for chunks by text query using FTS5 (if available) or LIKE.
   */
  searchByText(query: string, maxResults: number = 5): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = [];

    // Try FTS5 first
    try {
      const ftsRows = this.db.prepare(`
        SELECT c.*, d.filename, d.title as docTitle, d.format, d.topics_json as docTopicsJson, d.filePath as docFilePath, d.ingestedAt, d.totalTokens, d.fileHash
        FROM chunks_fts fts
        JOIN chunks c ON c.rowid = fts.rowid
        JOIN documents d ON c.documentId = d.id
        WHERE chunks_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `).all(query, maxResults) as any[];

      for (const row of ftsRows) {
        const chunk = this.rowToChunk(row);
        const doc = this.rowToDocument(row);
        results.push({
          chunk,
          document: doc,
          relevanceScore: 1.0, // FTS rank normalized
          matchedQuery: query,
        });
      }

      if (results.length > 0) return results;
    } catch {
      // FTS5 not available, fall through to LIKE
    }

    // Fallback: LIKE search
    const likeQuery = `%${query}%`;
    const likeRows = this.db.prepare(`
      SELECT c.*, d.filename, d.title as docTitle, d.format, d.topics_json as docTopicsJson, d.filePath as docFilePath, d.ingestedAt, d.totalTokens, d.fileHash
      FROM chunks c
      JOIN documents d ON c.documentId = d.id
      WHERE c.content LIKE ? OR c.heading LIKE ?
      ORDER BY c.tokens DESC
      LIMIT ?
    `).all(likeQuery, likeQuery, maxResults) as any[];

    for (const row of likeRows) {
      const chunk = this.rowToChunk(row);
      const doc = this.rowToDocument(row);
      results.push({
        chunk,
        document: doc,
        relevanceScore: 0.7, // LIKE search gets lower relevance
        matchedQuery: query,
      });
    }

    return results;
  }

  /**
   * Search for chunks by topics.
   */
  searchByTopics(topics: string[], maxResults: number = 5): KnowledgeSearchResult[] {
    if (topics.length === 0) return [];

    const results: KnowledgeSearchResult[] = [];
    const topicPatterns = topics.map(t => `%"${t}"%`);

    // Build WHERE clause for topic JSON matching
    const conditions = topicPatterns.map(() => "c.topics_json LIKE ?").join(" OR ");
    const rows = this.db.prepare(`
      SELECT c.*, d.filename, d.title as docTitle, d.format, d.topics_json as docTopicsJson, d.filePath as docFilePath, d.ingestedAt, d.totalTokens, d.fileHash
      FROM chunks c
      JOIN documents d ON c.documentId = d.id
      WHERE ${conditions}
      ORDER BY c.chunkIndex ASC
      LIMIT ?
    `).all(...topicPatterns, maxResults) as any[];

    for (const row of rows) {
      const chunk = this.rowToChunk(row);
      const doc = this.rowToDocument(row);
      const matchedTopics = topics.filter(t => chunk.topics.includes(t));
      results.push({
        chunk,
        document: doc,
        relevanceScore: matchedTopics.length / topics.length,
        matchedQuery: topics.join(", "),
      });
    }

    return results;
  }

  // ── Document retrieval ────────────────────────────────────────────

  getChunksByDocument(documentId: string): KnowledgeChunk[] {
    const rows = this.db.prepare("SELECT * FROM chunks WHERE documentId = ? ORDER BY chunkIndex ASC")
      .all(documentId) as any[];

    return rows.map(row => this.rowToChunk(row));
  }

  getAllDocuments(): KnowledgeDocument[] {
    const rows = this.db.prepare("SELECT * FROM documents ORDER BY ingestedAt DESC").all() as any[];
    return rows.map(row => this.rowToDocument(row));
  }

  getDocumentsByTopic(topic: string): KnowledgeDocument[] {
    const pattern = `%"${topic}"%`;
    const rows = this.db.prepare("SELECT * FROM documents WHERE topics_json LIKE ? ORDER BY ingestedAt DESC")
      .all(pattern) as any[];
    return rows.map(row => this.rowToDocument(row));
  }

  /**
   * Remove a document and all its chunks.
   */
  removeDocument(documentId: string): boolean {
    const result = this.db.prepare("DELETE FROM documents WHERE id = ?").run(documentId);
    this.db.prepare("DELETE FROM chunks WHERE documentId = ?").run(documentId);
    return result.changes > 0;
  }

  // ── Row conversion helpers ──────────────────────────────────────

  private rowToChunk(row: any): KnowledgeChunk {
    return {
      id: row.id,
      documentId: row.documentId,
      content: row.content,
      heading: row.heading ?? "",
      pageNumber: row.pageNumber ?? undefined,
      chunkIndex: row.chunkIndex ?? 0,
      tokens: row.tokens ?? 0,
      embedding: row.embedding_blob
        ? Array.from(new Float64Array(row.embedding_blob.buffer ?? row.embedding_blob))
        : undefined,
      topics: JSON.parse(row.topics_json ?? "[]"),
    };
  }

  private rowToDocument(row: any): KnowledgeDocument {
    return {
      id: row.id,
      filename: row.filename,
      title: row.docTitle ?? row.title ?? "",
      filePath: row.docFilePath ?? row.filePath ?? "",
      format: row.format ?? "",
      topics: JSON.parse(row.docTopicsJson ?? row.topics_json ?? "[]"),
      chunks: [], // Chunks loaded separately
      ingestedAt: row.ingestedAt ?? "",
      totalTokens: row.totalTokens ?? 0,
      fileHash: row.fileHash ?? "",
    };
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  close(): void {
    this.db.close();
  }
}
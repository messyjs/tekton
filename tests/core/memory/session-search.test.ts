import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SessionSearcher } from "../../../packages/core/src/memory/session-search.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function tempDbPath(): string {
  return path.join(os.tmpdir(), `tekton-session-test-${Date.now()}.db`);
}

describe("SessionSearcher", () => {
  let searcher: SessionSearcher;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    searcher = new SessionSearcher(dbPath);
  });

  afterEach(() => {
    searcher.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("records session start", () => {
    searcher.recordSessionStart("sess-1");
    const sessions = searcher.getRecentSessions(10);
    expect(sessions.length).toBe(1);
    expect(sessions[0].sessionId).toBe("sess-1");
  });

  it("records messages and searches them", () => {
    searcher.recordSessionStart("sess-2");
    searcher.recordMessage("sess-2", "user", "How do I create a React component?");
    searcher.recordMessage("sess-2", "assistant", "You can create a React component using a function...");

    const results = searcher.search("React");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("lists multiple sessions", () => {
    searcher.recordSessionStart("sess-a");
    searcher.recordSessionStart("sess-b");

    const sessions = searcher.getRecentSessions(10);
    expect(sessions.length).toBe(2);
  });

  it("finds messages via LIKE fallback", () => {
    searcher.recordSessionStart("sess-3");
    searcher.recordMessage("sess-3", "user", "Explain Python decorators");

    const results = searcher.search("Python decorators");
    expect(results.length).toBeGreaterThanOrEqual(1);
    // The snippet may contain FTS5 markup characters, so check for substrings
    const snippet = results[0].snippet.replace(/>>>{1,3}|<<</g, "");
    expect(snippet).toContain("Python");
    expect(snippet).toContain("decorators");
  });

  it("lists sessions with message counts", () => {
    searcher.recordSessionStart("sess-4");
    searcher.recordMessage("sess-4", "user", "Hello");
    searcher.recordMessage("sess-4", "assistant", "Hi there");

    const sessions = searcher.getRecentSessions(10);
    expect(sessions[0].messageCount).toBe(2);
  });
});
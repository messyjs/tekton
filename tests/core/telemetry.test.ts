import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TelemetryTracker } from "../../packages/core/src/telemetry/tracker.ts";
import type { TelemetryEvent } from "../../packages/core/src/telemetry/tracker.ts";
import { TokenBudget } from "../../packages/core/src/telemetry/budget.ts";
import { initTelemetryStore } from "../../packages/core/src/telemetry/store.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function tempDbPath(): string {
  return path.join(os.tmpdir(), `tekton-test-${Date.now()}.db`);
}

describe("TelemetryTracker", () => {
  let tracker: TelemetryTracker;
  let dbPath: string;

  beforeEach(() => {
    dbPath = tempDbPath();
    tracker = new TelemetryTracker(dbPath);
  });

  afterEach(() => {
    tracker.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("records and queries events", () => {
    const event: TelemetryEvent = {
      type: "completion",
      model: "gemma3:27b",
      provider: "ollama",
      inputTokens: 100,
      outputTokens: 200,
      latencyMs: 1500,
      costEstimate: 0,
    };
    tracker.record(event);

    const tokensByModel = tracker.getTokensByModel();
    expect(tokensByModel["gemma3:27b"]).toBe(300);
  });

  it("tracks token usage by day", () => {
    tracker.record({
      type: "completion",
      model: "gemma3:27b",
      provider: "ollama",
      inputTokens: 50,
      outputTokens: 50,
      latencyMs: 1000,
      costEstimate: 0,
    });

    const byDay = tracker.getTokensByDay(1);
    expect(byDay.length).toBeGreaterThanOrEqual(1);
    expect(byDay[0].tokens).toBe(100);
  });

  it("estimates cost", () => {
    tracker.record({
      type: "completion",
      model: "gpt-4o",
      provider: "openai",
      inputTokens: 1000,
      outputTokens: 1000,
      latencyMs: 2000,
      costEstimate: 0.02,
    });

    const cost = tracker.getCostEstimate();
    expect(cost).toBeCloseTo(0.02);
  });
});

describe("TokenBudget", () => {
  it("tracks spending against daily limit", () => {
    const budget = new TokenBudget({ dailyLimit: 1000, sessionLimit: null, warnPercent: 80 });
    budget.spend(800);
    expect(budget.isOverBudget()).toBe(false);
    expect(budget.shouldWarn()).toBe(true);
    budget.spend(300);
    expect(budget.isOverBudget()).toBe(true);
  });

  it("tracks spending against session limit", () => {
    const budget = new TokenBudget({ dailyLimit: null, sessionLimit: 500, warnPercent: 80 });
    budget.spend(400);
    expect(budget.isOverBudget()).toBe(false);
    expect(budget.shouldWarn()).toBe(true); // 400/500 = 80%
    budget.spend(200);
    expect(budget.isOverBudget()).toBe(true);
  });

  it("returns null for unlimited budgets", () => {
    const budget = new TokenBudget({ dailyLimit: null, sessionLimit: null, warnPercent: 80 });
    budget.spend(100000);
    const remaining = budget.getRemaining();
    expect(remaining.daily).toBeNull();
    expect(remaining.session).toBeNull();
    expect(budget.isOverBudget()).toBe(false);
    expect(budget.shouldWarn()).toBe(false);
  });

  it("resets budget", () => {
    const budget = new TokenBudget({ dailyLimit: 1000, sessionLimit: 500, warnPercent: 80 });
    budget.spend(400);
    budget.reset();
    const remaining = budget.getRemaining();
    expect(remaining.session).toBe(500);
  });
});

describe("initTelemetryStore", () => {
  it("creates database with expected tables", () => {
    const dbPath = tempDbPath();
    const db = initTelemetryStore(dbPath);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as Array<{ name: string }>;

    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain("events");
    expect(tableNames).toContain("compression_events");
    expect(tableNames).toContain("budget_tracking");

    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });
});
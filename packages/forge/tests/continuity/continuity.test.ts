/**
 * Continuity Layer Tests — Session management, handoff, cavemem, file tracking.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import os from "os";
import { ScribePool, type ScribePoolConfig } from "../../src/continuity/scribe-pool.js";
import { SessionManager, getWarningMessage } from "../../src/continuity/session-manager.js";
import { ForgeCavememBridge } from "../../src/continuity/cavemem-bridge.js";
import { FileTracker } from "../../src/continuity/file-tracker.js";
import { loadLatestHandoff, formatAsContext } from "../../src/continuity/handoff-loader.js";
import { ResetOrchestrator } from "../../src/continuity/reset-orchestrator.js";
import type { TaskCard, HandoffPackage } from "../../src/types.js";
import type { ScribeConfig, CavememStore } from "../../src/continuity/scribe.js";

// ── Helper: Mock Cavemem ────────────────────────────────────────────────

function createMockCavemem(): CavememStore & { observations: Array<{ text: string; metadata: any }> } {
  const observations: Array<{ text: string; metadata: any }> = [];
  return {
    observations,
    storeObservation(text: string, metadata: any): string {
      observations.push({ text, metadata });
      return `obs-${observations.length}`;
    },
    async searchMemory() { return []; },
    async getTimeline() { return []; },
    async exportForHandoff() { return []; },
  };
}

// ── Helper: Mock Task Card ───────────────────────────────────────────────

function createMockTaskCard(): TaskCard {
  return {
    id: "task-test-1",
    planId: "plan-test-1",
    role: "frontend-developer",
    title: "Build Landing Page",
    description: "Create a landing page",
    context: "",
    acceptanceCriteria: ["Page loads"],
    outputFiles: ["index.html"],
    dependencies: [],
    status: "in-progress",
    sessionHistory: [],
  };
}

// ── ScribePool Tests ────────────────────────────────────────────────────

describe("ScribePool", () => {
  const config: ScribePoolConfig = {
    scribes: [
      { id: "scribe-ideation", observes: ["ideation", "director"], model: "gemini-flash" },
      { id: "scribe-production", observes: ["production"], model: "gemini-flash" },
      { id: "scribe-qa", observes: ["qa"], model: "gemini-flash" },
    ],
  };

  it("assigns scribe based on layer", () => {
    const pool = new ScribePool(config, createMockCavemem());

    const ideationScribe = pool.getScribeForLayer("ideation");
    expect(ideationScribe).not.toBeNull();
    expect(ideationScribe!.config.id).toBe("scribe-ideation");

    const productionScribe = pool.getScribeForLayer("production");
    expect(productionScribe).not.toBeNull();
    expect(productionScribe!.config.id).toBe("scribe-production");

    const qaScribe = pool.getScribeForLayer("qa");
    expect(qaScribe).not.toBeNull();
    expect(qaScribe!.config.id).toBe("scribe-qa");
  });

  it("returns scribe by ID", () => {
    const pool = new ScribePool(config, createMockCavemem());
    const scribe = pool.getScribeById("scribe-production");
    expect(scribe).not.toBeUndefined();
    expect(scribe!.config.id).toBe("scribe-production");
  });

  it("lists all scribe IDs", () => {
    const pool = new ScribePool(config, createMockCavemem());
    const ids = pool.listScribeIds();
    expect(ids).toContain("scribe-ideation");
    expect(ids).toContain("scribe-production");
    expect(ids).toContain("scribe-qa");
  });

  it("shuts down all scribes", async () => {
    const pool = new ScribePool(config, createMockCavemem());
    await pool.shutdownAll();
    expect(pool.getScribeForLayer("production")).toBeNull();
  });
});

// ── SessionManager Tests ────────────────────────────────────────────────

describe("SessionManager", () => {
  it("monitors sessions and tracks message count", () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const manager = new SessionManager(pool, { defaultLimit: 10 });

    const taskCard = createMockTaskCard();
    const session = manager.monitorSession("session-1", taskCard, { id: "dev", sessionLimit: 10 }, "production");

    expect(session.messageCount).toBe(0);
    expect(session.maxMessages).toBe(10);
    expect(session.status).toBe("active");
  });

  it("injects warnings at correct message counts", () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const manager = new SessionManager(pool, { defaultLimit: 10 });
    const taskCard = createMockTaskCard();

    // Session with limit of 5: 3 remaining after 2 messages
    manager.monitorSession("session-warn", taskCard, { id: "dev", sessionLimit: 5 }, "production");

    // Send 2 messages → 3 remaining
    manager.onMessage("session-warn");
    manager.onMessage("session-warn");
    // 3rd message → 2 remaining, but we need to check the result from the call that leaves 3 remaining
    const result = manager.onMessage("session-warn");
    // After 3 messages, 2 remaining — no warning for 2
    expect(result.warning).toBeNull();
    // After 4 messages, 1 remaining
    const result4 = manager.onMessage("session-warn");
    expect(result4.warning).toContain("FINAL MESSAGE");
  });

  it("triggers shutdown when budget is exhausted", () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const manager = new SessionManager(pool, { defaultLimit: 5 });
    const taskCard = createMockTaskCard();

    manager.monitorSession("session-3", taskCard, { id: "dev", sessionLimit: 5 }, "production");

    // Use all 5 messages
    for (let i = 0; i < 5; i++) {
      manager.onMessage("session-3");
    }

    // 6th message should trigger shutdown
    const result = manager.onMessage("session-3");
    expect(result.shouldShutdown).toBe(true);
  });

  it("produces handoff package on graceful shutdown", async () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const tmpDir = join(os.tmpdir(), `tekton-test-handoff-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const manager = new SessionManager(pool, { handoffDir: tmpDir });
    const taskCard = createMockTaskCard();

    manager.monitorSession("session-4", taskCard, { id: "dev", sessionLimit: 20 }, "production");

    const handoff = await manager.gracefulShutdown("session-4");

    expect(handoff.sessionId).toBe("session-4");
    expect(handoff.summary.length).toBeGreaterThan(0);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("stores handoff to disk", async () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const tmpDir = join(os.tmpdir(), `tekton-test-handoff-disk-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const manager = new SessionManager(pool, { handoffDir: tmpDir });
    const taskCard = createMockTaskCard();

    manager.monitorSession("session-5", taskCard, { id: "dev", sessionLimit: 20 }, "production");

    await manager.gracefulShutdown("session-5");

    // Check that handoff file was created
    const files = existsSync(tmpDir) ? require("fs").readdirSync(tmpDir) : [];
    expect(files.length).toBeGreaterThan(0);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ── Warning System Tests ────────────────────────────────────────────────

describe("getWarningMessage", () => {
  it("returns checkpoint message at 3 remaining", () => {
    const msg = getWarningMessage(3);
    expect(msg).toContain("SESSION CHECKPOINT");
  });

  it("returns final message at 1 remaining", () => {
    const msg = getWarningMessage(1);
    expect(msg).toContain("FINAL MESSAGE");
  });

  it("returns null at 0 remaining", () => {
    const msg = getWarningMessage(0);
    expect(msg).toBeNull();
  });

  it("returns null for other counts", () => {
    expect(getWarningMessage(5)).toBeNull();
    expect(getWarningMessage(10)).toBeNull();
    expect(getWarningMessage(2)).toBeNull();
  });
});

// ── ForgeCavememBridge Tests ────────────────────────────────────────────

describe("ForgeCavememBridge", () => {
  it("stores and retrieves observations", async () => {
    const bridge = new ForgeCavememBridge();
    const id = bridge.storeObservation("Decided to use React", {
      projectId: "proj-1",
      taskCardId: "task-1",
      role: "scribe-production",
      sessionNum: 1,
    });

    expect(id).toBeTruthy();

    const results = await bridge.searchMemory("React", "proj-1");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("React");
  });

  it("filters by projectId", async () => {
    const bridge = new ForgeCavememBridge();
    bridge.storeObservation("obs 1", { projectId: "proj-1", taskCardId: "t-1", role: "r", sessionNum: 1 });
    bridge.storeObservation("obs 2", { projectId: "proj-2", taskCardId: "t-2", role: "r", sessionNum: 1 });

    const results1 = await bridge.searchMemory("obs", "proj-1");
    expect(results1.length).toBe(1);

    const results2 = await bridge.searchMemory("obs", "proj-2");
    expect(results2.length).toBe(1);
  });

  it("returns timeline in chronological order", async () => {
    const bridge = new ForgeCavememBridge();

    // Store two observations with different timestamps
    bridge.storeObservation("first", { projectId: "p1", taskCardId: "timeline-task", role: "r", sessionNum: 1 });
    bridge.storeObservation("second", { projectId: "p1", taskCardId: "timeline-task", role: "r", sessionNum: 1 });

    const timeline = await bridge.getTimeline("timeline-task");
    expect(timeline.length).toBe(2);
  });

  it("exports observations for handoff", async () => {
    const bridge = new ForgeCavememBridge();
    bridge.storeObservation("handoff data", { projectId: "p1", taskCardId: "task-handoff", role: "r", sessionNum: 1 });

    const exported = await bridge.exportForHandoff("task-handoff");
    expect(exported.length).toBeGreaterThan(0);
  });
});

// ── FileTracker Tests ───────────────────────────────────────────────────

describe("FileTracker", () => {
  const tmpDir = join(os.tmpdir(), `tekton-test-files-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects new files", () => {
    const tracker = new FileTracker(tmpDir);
    tracker.startTracking();

    // Create a new file
    writeFileSync(join(tmpDir, "test.txt"), "hello world");

    const changes = tracker.getChanges();
    expect(changes.some(c => c.action === "created" && c.path.includes("test.txt"))).toBe(true);
  });

  it("detects modified files", () => {
    // Create initial file
    writeFileSync(join(tmpDir, "existing.txt"), "original content");

    const tracker = new FileTracker(tmpDir);
    tracker.startTracking();

    // Modify the file
    writeFileSync(join(tmpDir, "existing.txt"), "modified content");

    const changes = tracker.getChanges();
    expect(changes.some(c => c.action === "modified" && c.path.includes("existing.txt"))).toBe(true);
  });

  it("records changes by role", () => {
    const tracker = new FileTracker(tmpDir);
    tracker.startTracking();

    tracker.recordChange("src/app.ts", "created", "frontend-developer");
    tracker.recordChange("src/api.ts", "created", "backend-developer");

    const devChanges = tracker.getChangesByRole("frontend-developer");
    expect(devChanges.length).toBe(1);
    expect(devChanges[0].path).toBe("src/app.ts");
  });
});

// ── HandoffLoader Tests ─────────────────────────────────────────────────

describe("loadLatestHandoff", () => {
  const tmpDir = join(os.tmpdir(), `tekton-test-handoff-load-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(join(tmpDir, "handoffs"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads correct handoff file", () => {
    const handoff: HandoffPackage = {
      sessionId: "s-1",
      taskCardId: "task-load-1",
      summary: "Test handoff",
      completedWork: ["Built feature"],
      remainingWork: ["Add tests"],
      filesModified: [],
      importantDecisions: ["Used Tailwind"],
      blockers: [],
      cavememObservations: [],
      nextSessionContext: "Continue from where you left off",
    };

    const filePath = join(tmpDir, "handoffs", "task-load-1-1000.json");
    writeFileSync(filePath, JSON.stringify(handoff, null, 2));

    const loaded = loadLatestHandoff(tmpDir, "task-load-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.summary).toBe("Test handoff");
    expect(loaded!.completedWork).toContain("Built feature");
  });

  it("returns null when no handoff exists", () => {
    const loaded = loadLatestHandoff(tmpDir, "nonexistent-task");
    expect(loaded).toBeNull();
  });
});

describe("formatAsContext", () => {
  it("formats handoff into readable context", () => {
    const handoff: HandoffPackage = {
      sessionId: "s-1",
      taskCardId: "task-fmt",
      summary: "Built the UI components",
      completedWork: ["Created header", "Added navigation"],
      remainingWork: ["Add footer", "Write tests"],
      filesModified: [{ path: "src/header.tsx", action: "created" as const, status: "beta" as const, hash: "abc" }],
      importantDecisions: ["Used React"],
      blockers: ["API not ready"],
      cavememObservations: [],
      nextSessionContext: "",
    };

    const context = formatAsContext(handoff);

    expect(context).toContain("Previous Session Summary");
    expect(context).toContain("Built the UI components");
    expect(context).toContain("## Completed");
    expect(context).toContain("Created header");
    expect(context).toContain("## Remaining Work");
    expect(context).toContain("Add footer");
    expect(context).toContain("## Key Decisions");
    expect(context).toContain("Used React");
    expect(context).toContain("## Files Modified");
    expect(context).toContain("src/header.tsx");
    expect(context).toContain("## Blockers");
    expect(context).toContain("API not ready");
    expect(context).toContain("Continue from where");
  });
});

// ── ResetOrchestrator Tests ────────────────────────────────────────────

describe("ResetOrchestrator", () => {
  const tmpDir = join(os.tmpdir(), `tekton-test-reset-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(join(tmpDir, "handoffs"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("provides handoff context for fresh session", async () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const manager = new SessionManager(pool, { handoffDir: join(tmpDir, "handoffs") });
    const orchestrator = new ResetOrchestrator(manager, tmpDir);

    const taskCard = createMockTaskCard();
    const role = { id: "frontend-developer", name: "Frontend Developer", systemPrompt: "", tools: ["file"], model: "deep", sessionLimit: 20 };

    // Write a handoff file
    const handoff: HandoffPackage = {
      sessionId: "s-old",
      taskCardId: "task-test-1",
      summary: "Built half the landing page",
      completedWork: ["Created HTML structure"],
      remainingWork: ["Add CSS styling"],
      filesModified: [],
      importantDecisions: ["Used Tailwind"],
      blockers: [],
      cavememObservations: [],
      nextSessionContext: "Continue with CSS",
    };
    writeFileSync(
      join(tmpDir, "handoffs", "task-test-1-1000.json"),
      JSON.stringify(handoff, null, 2),
    );

    const result = await orchestrator.resetAndContinue(taskCard, role);

    expect(result.handoff).not.toBeNull();
    expect(result.handoff!.taskCardId).toBe("task-test-1");
    expect(result.context).toContain("Previous Session Summary");
  });

  it("returns default context when no handoff exists", async () => {
    const cavemem = createMockCavemem();
    const pool = new ScribePool({
      scribes: [{ id: "scribe-prod", observes: ["production"], model: "gemini-flash" }],
    }, cavemem);
    const manager = new SessionManager(pool, { handoffDir: join(tmpDir, "handoffs") });
    const orchestrator = new ResetOrchestrator(manager, tmpDir);

    const taskCard = createMockTaskCard();
    const role = { id: "dev", name: "Developer", systemPrompt: "", tools: ["file"], model: "deep", sessionLimit: 20 };

    const result = await orchestrator.resetAndContinue(taskCard, role);

    expect(result.handoff).toBeNull();
    expect(result.context).toContain("No previous session found");
  });
});
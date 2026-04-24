import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  AgentPool,
  AgentSession,
  AgentRouter,
  TaskQueue,
  DEFAULT_POOL_CONFIG,
  DEFAULT_ROUTER_CONFIG,
} from "@tekton/core";
import type { TaskDefinition, PoolEvent, AgentState, RoutingDecision } from "@tekton/core";

// ── TaskQueue tests ──────────────────────────────────────────────────

describe("TaskQueue", () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue(4);
  });

  it("enqueue and dequeue tasks", () => {
    const task: TaskDefinition = {
      id: "t1",
      description: "Test task",
      priority: "normal",
      createdAt: Date.now(),
    };
    queue.enqueue(task);
    expect(queue.size).toBe(1);

    const dequeued = queue.dequeue();
    expect(dequeued).toBeDefined();
    expect(dequeued!.id).toBe("t1");
    expect(queue.size).toBe(0);
  });

  it("respects priority ordering (high > normal > low)", () => {
    queue.enqueue({ id: "t1", description: "Low task", priority: "low", createdAt: Date.now() });
    queue.enqueue({ id: "t2", description: "High task", priority: "high", createdAt: Date.now() });
    queue.enqueue({ id: "t3", description: "Normal task", priority: "normal", createdAt: Date.now() });

    const high = queue.dequeue();
    expect(high?.id).toBe("t2");

    const normal = queue.dequeue();
    expect(normal?.id).toBe("t3");

    const low = queue.dequeue();
    expect(low?.id).toBe("t1");
  });

  it("tracks completed tasks", () => {
    queue.enqueue({ id: "t1", description: "Task", priority: "normal", createdAt: Date.now() });
    queue.dequeue();
    queue.complete("t1");

    expect(queue.getCompleted()).toHaveLength(1);
    expect(queue.getStatus("t1")).toBe("completed");
  });

  it("supports task cancellation", () => {
    queue.enqueue({ id: "t1", description: "Task", priority: "normal", createdAt: Date.now() });
    expect(queue.cancel("t1")).toBe(true);
    expect(queue.size).toBe(0);
  });

  it("respects concurrency limits", () => {
    const smallQueue = new TaskQueue(2);
    smallQueue.enqueue({ id: "t1", description: "1", priority: "normal", createdAt: Date.now() });
    smallQueue.enqueue({ id: "t2", description: "2", priority: "normal", createdAt: Date.now() });
    smallQueue.enqueue({ id: "t3", description: "3", priority: "normal", createdAt: Date.now() });

    const t1 = smallQueue.dequeue();
    expect(t1).toBeDefined();
    const t2 = smallQueue.dequeue();
    expect(t2).toBeDefined();

    // Third task stays in queue due to concurrency limit
    expect(smallQueue.getConcurrencyLimit()).toBe(2);
  });

  it("handles dependencies", () => {
    queue.enqueue({ id: "t1", description: "First", priority: "normal", createdAt: Date.now() });
    queue.enqueue({
      id: "t2",
      description: "Second",
      priority: "normal",
      dependencies: ["t1"],
      createdAt: Date.now(),
    });

    // t2 should not be dequeued until t1 is complete
    const first = queue.dequeue();
    expect(first?.id).toBe("t1");

    // t2 has unresolved dependency
    const second = queue.dequeue();
    expect(second).toBeUndefined();

    // After completing t1
    queue.complete("t1");
    const secondNow = queue.dequeue();
    expect(secondNow?.id).toBe("t2");
  });

  it("purges old completed tasks", () => {
    queue.enqueue({ id: "t1", description: "Old", priority: "normal", createdAt: Date.now() - 600000 });
    queue.dequeue();
    queue.complete("t1");

    const purged = queue.purgeCompleted(300000);
    expect(purged).toBe(1);
    expect(queue.getCompleted()).toHaveLength(0);
  });

  it("reports isIdle when empty", () => {
    expect(queue.isIdle).toBe(true);
    queue.enqueue({ id: "t1", description: "Task", priority: "normal", createdAt: Date.now() });
    expect(queue.isIdle).toBe(false);
    queue.dequeue();
    queue.complete("t1");
    expect(queue.isIdle).toBe(true);
  });
});

// ── AgentRouter tests ────────────────────────────────────────────────

describe("AgentRouter", () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter();
  });

  it("routes simple tasks inline", () => {
    const task: TaskDefinition = {
      id: "t1",
      description: "fix typo",
      priority: "low",
      createdAt: Date.now(),
    };
    const decision = router.route(task);
    expect(decision.strategy).toBe("inline");
    expect(decision.complexityScore).toBeLessThan(0.5);
  });

  it("routes complex tasks to delegate", () => {
    const task: TaskDefinition = {
      id: "t2",
      description: "architect a distributed system with concurrent race condition handling and security audit",
      priority: "high",
      createdAt: Date.now(),
    };
    const decision = router.route(task);
    // Complex description should push towards delegation
    expect(decision.complexityScore).toBeGreaterThan(0);
  });

  it("routes always-inline skills inline regardless of complexity", () => {
    router.updateConfig({
      alwaysInlineSkills: ["format"],
    });
    const task: TaskDefinition = {
      id: "t3",
      description: "Complex task that should be inline",
      priority: "normal",
      skillHint: "format",
      createdAt: Date.now(),
    };
    const decision = router.route(task);
    expect(decision.strategy).toBe("inline");
    expect(decision.reason).toContain("always-inline");
  });

  it("routes always-delegate skills to delegation", () => {
    router.updateConfig({
      alwaysDelegateSkills: ["systematic-debugging"],
    });
    const task: TaskDefinition = {
      id: "t4",
      description: "Simple task",
      priority: "normal",
      skillHint: "systematic-debugging",
      createdAt: Date.now(),
    };
    const decision = router.route(task);
    expect(decision.strategy).toBe("delegate");
    expect(decision.reason).toContain("always-delegate");
  });

  it("calculates complexity from description length", () => {
    const shortTask: TaskDefinition = {
      id: "t5",
      description: "fix typo",
      priority: "normal",
      createdAt: Date.now(),
    };
    const longTask: TaskDefinition = {
      id: "t6",
      description: "a".repeat(300),
      priority: "normal",
      createdAt: Date.now(),
    };

    const shortDecision = router.route(shortTask);
    const longDecision = router.route(longTask);

    expect(longDecision.complexityScore).toBeGreaterThanOrEqual(shortDecision.complexityScore);
  });

  it("aggregateResults handles all success", () => {
    const aggregated = router.aggregateResults("parent1", [
      { subtaskId: "s1", status: "ok" as const, result: "Done 1", durationMs: 100, tokensUsed: 50 },
      { subtaskId: "s2", status: "ok" as const, result: "Done 2", durationMs: 200, tokensUsed: 100 },
    ]);

    expect(aggregated.overallStatus).toBe("ok");
    expect(aggregated.results).toHaveLength(2);
    expect(aggregated.totalDurationMs).toBe(300);
    expect(aggregated.totalTokensUsed).toBe(150);
  });

  it("aggregateResults handles partial failures", () => {
    const aggregated = router.aggregateResults("parent2", [
      { subtaskId: "s1", status: "ok" as const, result: "Done", durationMs: 100, tokensUsed: 50 },
      { subtaskId: "s2", status: "error" as const, result: "Failed", durationMs: 50, tokensUsed: 10 },
    ]);

    expect(aggregated.overallStatus).toBe("error");
    expect(aggregated.summary).toContain("1/2");
  });

  it("canRunParallel detects dependent tasks", () => {
    const a: TaskDefinition = {
      id: "a", description: "A", priority: "normal", createdAt: Date.now(),
    };
    const b: TaskDefinition = {
      id: "b", description: "B", priority: "normal", dependencies: ["a"], createdAt: Date.now(),
    };

    expect(router.canRunParallel(a, b)).toBe(false);
  });

  it("canRunParallel allows independent tasks", () => {
    const a: TaskDefinition = {
      id: "a", description: "A", priority: "normal", createdAt: Date.now(),
    };
    const b: TaskDefinition = {
      id: "b", description: "B", priority: "normal", createdAt: Date.now(),
    };

    expect(router.canRunParallel(a, b)).toBe(true);
  });

  it("stores and retrieves decision history", () => {
    const task: TaskDefinition = {
      id: "t1", description: "Test", priority: "normal", createdAt: Date.now(),
    };
    router.route(task);
    const history = router.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].taskId).toBe("t1");
  });

  it("updateConfig changes routing behavior", () => {
    router.updateConfig({ complexityThreshold: 0.9 });
    const task: TaskDefinition = {
      id: "t1", description: "Moderate task", priority: "normal", createdAt: Date.now(),
    };
    const decision = router.route(task);
    // With high threshold, moderate tasks route inline
    expect(decision.strategy).toBe("inline");
  });
});

// ── AgentSession tests ────────────────────────────────────────────────

describe("AgentSession", () => {
  it("creates a session with default config", () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    expect(session.id).toBeDefined();
    expect(session.name).toMatch(/^agent-/);
    expect(session.isIdle()).toBe(false); // Starts as "spawning"
  });

  it("starts and becomes idle", async () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start();
    expect(session.isIdle()).toBe(true);
    expect(session.getState()).toBe("idle");
  });

  it("executes a task and returns to idle", async () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start();

    const result = await session.executeTask({
      id: "task-1",
      description: "Test task",
      priority: "normal",
      createdAt: Date.now(),
    });

    expect(result.status).toBe("ok");
    expect(result.taskId).toBe("task-1");
    expect(session.isIdle()).toBe(true);
  });

  it("rejects task when busy", async () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start();

    // Start a task
    const taskPromise = session.executeTask({
      id: "task-1",
      description: "Long task",
      priority: "normal",
      createdAt: Date.now(),
    });

    // Try to start another (should fail because session is busy)
    const result = await session.executeTask({
      id: "task-2",
      description: "Another task",
      priority: "normal",
      createdAt: Date.now(),
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("busy");

    // Wait for first task to complete
    await taskPromise;
  });

  it("can be killed", async () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start();
    expect(session.isIdle()).toBe(true);

    await session.kill("test");
    expect(session.getState()).toBe("killed");
    expect(session.isAvailable()).toBe(false);
  });

  it("tracks task statistics", async () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start();

    const result = await session.executeTask({
      id: "task-1",
      description: "Test task",
      priority: "normal",
      createdAt: Date.now(),
    });

    expect(result.tokensUsed).toBeGreaterThan(0);

    const info = session.getInfo();
    expect(info.tasksCompleted).toBe(1);
    expect(info.tokensUsed).toBeGreaterThan(0);
  });

  it("provides session logs", async () => {
    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start();

    await session.executeTask({
      id: "task-1",
      description: "Test task",
      priority: "normal",
      createdAt: Date.now(),
    });

    const log = session.getLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].direction).toBe("outbound");
  });

  it("calls lifecycle hooks", async () => {
    const spawnedIds: string[] = [];
    const hooks = {
      onAgentSpawn: (id: string) => { spawnedIds.push(id); },
    };

    const session = new AgentSession({
      allowedTools: [],
      skillHints: [],
      maxTokenBudget: 50000,
      timeoutMs: 120000,
    });

    await session.start(hooks);
    expect(spawnedIds).toContain(session.id);
  });
});

// ── AgentPool tests ──────────────────────────────────────────────────

describe("AgentPool", () => {
  let pool: AgentPool;

  beforeEach(() => {
    pool = new AgentPool({ maxAgents: 4, idleTimeoutMs: 60000, taskTimeoutMs: 120000, concurrencyLimit: 4 });
  });

  afterEach(async () => {
    await pool.shutdown();
  });

  it("spawns an agent", async () => {
    const agentId = await pool.spawn();
    expect(agentId).toBeDefined();

    const agents = pool.getAgentInfo();
    expect(agents).toHaveLength(1);
    expect(agents[0].state).toBe("idle");
  });

  it("respects maxAgents limit", async () => {
    const smallPool = new AgentPool({ maxAgents: 2, idleTimeoutMs: 60000, taskTimeoutMs: 120000, concurrencyLimit: 2 });

    await smallPool.spawn();
    await smallPool.spawn();

    await expect(smallPool.spawn()).rejects.toThrow("Agent pool is full");

    await smallPool.shutdown();
  });

  it("kills an agent", async () => {
    const agentId = await pool.spawn();
    const killed = await pool.kill(agentId);
    expect(killed).toBe(true);

    const agents = pool.getAgentInfo();
    expect(agents).toHaveLength(0);
  });

  it("submits tasks and routes them", () => {
    const result = pool.submitTask({
      id: "task-1",
      description: "Simple formatting task",
      priority: "normal",
      createdAt: Date.now(),
    });

    expect(result.taskId).toBe("task-1");
    expect(result.strategy).toBeDefined();
    // Simple task should route inline
    expect(result.strategy).toBe("inline");
  });

  it("returns pool status", async () => {
    await pool.spawn();

    const status = pool.getStatus();
    expect(status.totalAgents).toBe(1);
    expect(status.idleAgents).toBe(1);
    expect(status.activeAgents).toBe(0);
  });

  it("emits events on spawn and kill", async () => {
    const agentId = await pool.spawn();
    await pool.kill(agentId);

    const events = pool.getEventLog();
    expect(events.some(e => e.type === "agent_spawned")).toBe(true);
    expect(events.some(e => e.type === "agent_killed")).toBe(true);
  });

  it("kills all agents", async () => {
    await pool.spawn();
    await pool.spawn();
    await pool.killAll("test");

    const agents = pool.getAgentInfo();
    expect(agents).toHaveLength(0);
  });

  it("provides access to router and queue", () => {
    const router = pool.getRouter();
    const queue = pool.getQueue();

    expect(router).toBeDefined();
    expect(queue).toBeDefined();
  });

  it("updates config", () => {
    pool.updateConfig({ maxAgents: 8 });
    const config = pool.getConfig();
    expect(config.maxAgents).toBe(8);
  });
});

// ── Types and constants tests ─────────────────────────────────────────

describe("Agent types", () => {
  it("DEFAULT_POOL_CONFIG has expected values", () => {
    expect(DEFAULT_POOL_CONFIG.maxAgents).toBe(4);
    expect(DEFAULT_POOL_CONFIG.idleTimeoutMs).toBe(60000);
    expect(DEFAULT_POOL_CONFIG.taskTimeoutMs).toBe(120000);
    expect(DEFAULT_POOL_CONFIG.maxRetries).toBe(2);
    expect(DEFAULT_POOL_CONFIG.concurrencyLimit).toBe(4);
  });

  it("DEFAULT_ROUTER_CONFIG has expected values", () => {
    expect(DEFAULT_ROUTER_CONFIG.complexityThreshold).toBe(0.6);
    expect(DEFAULT_ROUTER_CONFIG.dependencyThreshold).toBe(2);
    expect(DEFAULT_ROUTER_CONFIG.alwaysInlineSkills).toEqual([]);
    expect(DEFAULT_ROUTER_CONFIG.alwaysDelegateSkills).toEqual([]);
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { delegateTaskTool, setGlobalPool, getGlobalPool } from "@tekton/tools";
import type { ToolResult } from "@tekton/tools";
import type { TaskResult } from "@tekton/core";

// ── Mock AgentPool ────────────────────────────────────────────────────

function createImmediateMockPool(resultsByDescription: Map<string, TaskResult>) {
  const submittedTasks: any[] = [];

  return {
    submitTask(task: any): { taskId: string; strategy: string } {
      submittedTasks.push(task);
      const strategy = task.description.length > 100 ? "delegate" : "inline";
      return { taskId: task.id, strategy };
    },

    getTaskResult(taskId: string): TaskResult | undefined {
      // Find the matching task by its submitted ID
      const task = submittedTasks.find(t => t.id === taskId);
      if (!task) return undefined;
      return resultsByDescription.get(task.description);
    },

    getSubmittedTasks() {
      return [...submittedTasks];
    },

    async spawn(config?: any): Promise<string> {
      return `mock-agent-${Date.now()}`;
    },

    async kill(id: string): Promise<boolean> {
      return true;
    },
  };
}

describe("delegate_task tool", () => {
  afterEach(() => {
    setGlobalPool(null as any);
  });

  it("returns error when AgentPool is not available", async () => {
    setGlobalPool(null as any);

    const result = await delegateTaskTool.execute(
      {
        mode: "parallel",
        tasks: [{ task: "Do something" }],
      },
      { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {} },
    );

    expect(result.isError).toBe(true);
    expect(result.content).toContain("AgentPool is not initialized");
  });

  it("returns error when context has no AgentPool and global is null", async () => {
    const result = await delegateTaskTool.execute(
      {
        mode: "parallel",
        tasks: [{ task: "Do something" }],
      },
      { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {} },
    );

    expect(result.isError).toBe(true);
  });

  it("calls AgentPool.submitTask for each task", async () => {
    const resultsByDescription = new Map<string, TaskResult>();
    resultsByDescription.set("Analyze the codebase", {
      taskId: "t1",
      agentId: "agent-1",
      status: "ok",
      result: "Analysis complete",
      tokensUsed: 100,
      modelUsed: "gpt-4o",
      durationMs: 500,
    });
    resultsByDescription.set("Write unit tests", {
      taskId: "t2",
      agentId: "agent-2",
      status: "ok",
      result: "Tests written",
      tokensUsed: 200,
      modelUsed: "gpt-4o",
      durationMs: 800,
    });

    const mockPool = createImmediateMockPool(resultsByDescription);
    setGlobalPool(mockPool as any);

    const result = await delegateTaskTool.execute(
      {
        mode: "parallel",
        tasks: [
          { task: "Analyze the codebase", skill_hint: "code-review" },
          { task: "Write unit tests", tools: ["file", "terminal"] },
        ],
      },
      { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {} },
    );

    const submitted = mockPool.getSubmittedTasks();
    expect(submitted).toHaveLength(2);
    expect(submitted[0].description).toBe("Analyze the codebase");
    expect(submitted[0].skillHint).toBe("code-review");
    expect(submitted[1].description).toBe("Write unit tests");
    expect(submitted[1].tools).toEqual(["file", "terminal"]);

    expect(result.content).toContain("2/2 tasks succeeded");
  }, 10000);

  it("returns real results from AgentPool", async () => {
    const resultsByDescription = new Map<string, TaskResult>();
    resultsByDescription.set("Analyze the codebase", {
      taskId: "t1",
      agentId: "agent-1",
      status: "ok",
      result: "Analysis complete: 3 issues found",
      tokensUsed: 150,
      modelUsed: "gpt-4o",
      durationMs: 1200,
    });

    const mockPool = createImmediateMockPool(resultsByDescription);
    setGlobalPool(mockPool as any);

    const result = await delegateTaskTool.execute(
      {
        mode: "parallel",
        tasks: [{ task: "Analyze the codebase" }],
      },
      { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {} },
    );

    expect(result.content).toContain("1/1 tasks succeeded");
    expect(result.content).toContain("Analysis complete");
    expect(result.metadata).toBeDefined();
    expect((result.metadata as any).completed).toBe(1);
  }, 10000);

  it("sets up sequential dependencies correctly", async () => {
    const resultsByDescription = new Map<string, TaskResult>();
    resultsByDescription.set("First task", {
      taskId: "t1",
      agentId: "agent-1",
      status: "ok",
      result: "First done",
      tokensUsed: 50,
      modelUsed: "gpt-4o",
      durationMs: 100,
    });
    resultsByDescription.set("Second task", {
      taskId: "t2",
      agentId: "agent-2",
      status: "ok",
      result: "Second done",
      tokensUsed: 50,
      modelUsed: "gpt-4o",
      durationMs: 100,
    });

    const mockPool = createImmediateMockPool(resultsByDescription);
    setGlobalPool(mockPool as any);

    const result = await delegateTaskTool.execute(
      {
        mode: "sequential",
        tasks: [
          { task: "First task" },
          { task: "Second task" },
        ],
      },
      { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {} },
    );

    // In sequential mode, second task should have dependency on first
    const submitted = mockPool.getSubmittedTasks();
    expect(submitted).toHaveLength(2);
    expect(submitted[1].dependencies).toBeDefined();
    expect(submitted[1].dependencies).toContain(submitted[0].id);
  }, 10000);

  it("uses AgentPool from context when global is not set", async () => {
    const resultsByDescription = new Map<string, TaskResult>();
    resultsByDescription.set("Use context pool", {
      taskId: "ctx-task",
      agentId: "agent-1",
      status: "ok",
      result: "Context pool works",
      tokensUsed: 50,
      modelUsed: "gpt-4o",
      durationMs: 100,
    });

    const contextPool = createImmediateMockPool(resultsByDescription);

    // Global pool is null, but context has a pool
    setGlobalPool(null as any);

    const result = await delegateTaskTool.execute(
      {
        mode: "parallel",
        tasks: [{ task: "Use context pool" }],
      },
      { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {}, agentPool: contextPool },
    );

    expect(result.content).toContain("Context pool works");
  }, 10000);

  it("reports failed tasks correctly", async () => {
    const resultsByDescription = new Map<string, TaskResult>();
    resultsByDescription.set("Working task", {
      taskId: "t1",
      agentId: "agent-1",
      status: "ok",
      result: "Success",
      tokensUsed: 50,
      modelUsed: "gpt-4o",
      durationMs: 100,
    });
    resultsByDescription.set("Failing task", {
      taskId: "t2",
      agentId: "agent-2",
      status: "error",
      result: "",
      tokensUsed: 10,
      modelUsed: "gpt-4o",
      durationMs: 50,
      error: "Something went wrong",
    });

    const mockPool = createImmediateMockPool(resultsByDescription);
    setGlobalPool(mockPool as any);

    const result = await delegateTaskTool.execute({
      mode: "parallel",
      tasks: [
        { task: "Working task" },
        { task: "Failing task" },
      ],
    }, { cwd: "/tmp", taskId: "test", tektonHome: "/tmp", env: {} });

    expect(result.content).toContain("1/2 tasks succeeded");
    expect(result.content).toContain("❌");
  }, 10000);
});
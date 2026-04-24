import { describe, it, expect } from "vitest";
import { ParallelExecutor } from "../../src/production/parallel-executor.js";

describe("Parallel Executor", () => {
  it("3 tasks with concurrency 3: all run", async () => {
    const executor = new ParallelExecutor(3);
    const order: number[] = [];

    const results = await executor.executeAll([
      () => Promise.resolve().then(() => { order.push(1); return "a"; }),
      () => Promise.resolve().then(() => { order.push(2); return "b"; }),
      () => Promise.resolve().then(() => { order.push(3); return "c"; }),
    ]);

    expect(results).toEqual(["a", "b", "c"]);
    expect(order).toHaveLength(3);
  });

  it("5 tasks with concurrency 2: max 2 at any time", async () => {
    const executor = new ParallelExecutor(2);
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 5 }, (_, i) => {
      return () => new Promise<string>((resolve) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        setTimeout(() => {
          concurrent--;
          resolve(`task-${i}`);
        }, 10);
      });
    });

    const results = await executor.executeAll(tasks);

    expect(results).toEqual(["task-0", "task-1", "task-2", "task-3", "task-4"]);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("one failure doesn't block others", async () => {
    const executor = new ParallelExecutor(3);

    const results = await executor.executeAll([
      () => Promise.resolve("success-1"),
      () => Promise.reject(new Error("task-2 failed")),
      () => Promise.resolve("success-3"),
    ]);

    expect(results[0]).toBe("success-1");
    expect(results[1]).toBeInstanceOf(Error);
    expect(results[2]).toBe("success-3");
  });

  it("returns results in original order", async () => {
    const executor = new ParallelExecutor(2);

    const results = await executor.executeAll([
      () => new Promise<string>((r) => setTimeout(() => r("slow"), 20)),
      () => new Promise<string>((r) => setTimeout(() => r("fast"), 5)),
      () => new Promise<string>((r) => setTimeout(() => r("medium"), 10)),
    ]);

    expect(results).toEqual(["slow", "fast", "medium"]);
  });

  it("empty task list", async () => {
    const executor = new ParallelExecutor(3);
    const results = await executor.executeAll([]);
    expect(results).toEqual([]);
  });
});
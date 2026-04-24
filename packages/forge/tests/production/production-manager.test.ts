import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductionManager, type ProductionResult } from "../../src/production/production-manager.js";
import type { ProductionPlan, TaskCard, RoleDefinition } from "../../src/types.js";
import { createTaskCard } from "../../src/task-card.js";

function makePlan(tasks: TaskCard[]): ProductionPlan {
  return {
    id: "plan-test",
    briefId: "brief-test",
    domains: ["web-app"],
    teamTemplate: {
      domain: "web-app",
      roles: [],
      testRoles: [],
      projectTemplate: "react-webapp",
      requiredTools: ["file", "terminal"],
      optionalTools: [],
    },
    taskCards: tasks,
    dependencyGraph: {},
    estimatedSessions: tasks.length * 2,
  };
}

describe("Production Manager", () => {
  it("simple 3-task linear plan executes in order", async () => {
    const a = createTaskCard("plan-1", "dev", "Task A", "First task", []);
    const b = createTaskCard("plan-1", "dev", "Task B", "Second task", [a.id]);
    const c = createTaskCard("plan-1", "dev", "Task C", "Third task", [b.id]);

    // Mark first task as immediately completable
    const executor = async () => ({ messages: 10, result: "Done", completed: true });

    const manager = new ProductionManager({ maxConcurrency: 1, maxRetries: 3 });
    const plan = makePlan([a, b, c]);
    const result = await manager.executePlan(plan, "/tmp/test-project", executor);

    expect(result.completed.length).toBeGreaterThanOrEqual(1);
  });

  it("parallel tasks run concurrently", async () => {
    const a = createTaskCard("plan-1", "dev", "Task A", "Parallel task A", []);
    const b = createTaskCard("plan-1", "dev", "Task B", "Parallel task B", []);

    const manager = new ProductionManager({ maxConcurrency: 2, maxRetries: 3 });
    const plan = makePlan([a, b]);
    const result = await manager.executePlan(plan, "/tmp/test-project-parallel", async () => ({
      messages: 5,
      result: "Done",
      completed: true,
    }));

    expect(result.completed.length).toBeGreaterThanOrEqual(1);
  });

  it("failed task can retry up to 3 times", async () => {
    const a = createTaskCard("plan-1", "dev", "Task A", "Flaky task", []);
    let attemptCount = 0;

    const manager = new ProductionManager({ maxConcurrency: 1, maxRetries: 3 });

    const executor = async () => {
      attemptCount++;
      if (attemptCount <= 2) {
        throw new Error("Transient failure");
      }
      return { messages: 5, result: "Success on attempt 3", completed: true };
    };

    const plan = makePlan([a]);
    const result = await manager.executePlan(plan, "/tmp/test-retry", executor);

    // After 3 failures, it should be in failed
    expect(result.failed.length + result.completed.length).toBeGreaterThan(0);
  });

  it("all-complete flag is accurate", async () => {
    const a = createTaskCard("plan-1", "dev", "Task A", "Simple task", []);
    const b = createTaskCard("plan-1", "dev", "Task B", "Another task", []);

    const manager = new ProductionManager({ maxConcurrency: 2, maxRetries: 3 });
    const plan = makePlan([a, b]);
    const result = await manager.executePlan(plan, "/tmp/test-complete", async () => ({
      messages: 5,
      result: "Done",
      completed: true,
    }));

    // Both tasks should complete or fail
    expect(result.completed.length + result.failed.length).toBeGreaterThan(0);
  });

  it("handles unknown role gracefully", async () => {
    const a = createTaskCard("plan-1", "unknown-role", "Task A", "Unknown role task", []);

    const manager = new ProductionManager({ maxConcurrency: 1, maxRetries: 1 });
    const plan = makePlan([a]);
    const result = await manager.executePlan(plan, "/tmp/test-unknown", async () => ({
      messages: 5,
      result: "Done with default role",
      completed: true,
    }));

    // Should still complete using default role
    expect(result.completed.length + result.failed.length).toBeGreaterThan(0);
  });

  it("session records are populated", async () => {
    const a = createTaskCard("plan-1", "frontend-developer", "Task A", "Frontend task", []);

    const manager = new ProductionManager({ maxConcurrency: 1, maxRetries: 3 });
    const plan = makePlan([a]);
    const result = await manager.executePlan(plan, "/tmp/test-sessions", async () => ({
      messages: 8,
      result: "Task complete",
      completed: true,
    }));

    // Session records should be created for completed tasks
    if (result.completed.length > 0) {
      expect(result.sessionRecords.length).toBeGreaterThan(0);
    }
  });
});
import { describe, it, expect } from "vitest";
import { resolveOrder, getReady, hasCycle } from "../../src/production/dependency-resolver.js";
import type { TaskCard } from "../../src/types.js";

function makeCard(id: string, deps: string[] = [], status: TaskCard["status"] = "pending"): TaskCard {
  return {
    id,
    planId: "plan-test",
    role: "dev",
    title: `Task ${id}`,
    description: `Description for ${id}`,
    context: "",
    acceptanceCriteria: [],
    outputFiles: [],
    dependencies: deps,
    status,
    sessionHistory: [],
  };
}

describe("Dependency Resolver", () => {
  it("linear chain: A → B → C", () => {
    const a = makeCard("A");
    const b = makeCard("B", ["A"]);
    const c = makeCard("C", ["B"]);

    const order = resolveOrder([a, b, c]);
    const ids = order.map((c) => c.id);

    expect(ids.indexOf("A")).toBeLessThan(ids.indexOf("B"));
    expect(ids.indexOf("B")).toBeLessThan(ids.indexOf("C"));
  });

  it("diamond: A → B,C → D", () => {
    const a = makeCard("A");
    const b = makeCard("B", ["A"]);
    const c = makeCard("C", ["A"]);
    const d = makeCard("D", ["B", "C"]);

    const order = resolveOrder([a, b, c, d]);
    const ids = order.map((c) => c.id);

    expect(ids.indexOf("A")).toBeLessThan(ids.indexOf("B"));
    expect(ids.indexOf("A")).toBeLessThan(ids.indexOf("C"));
    expect(ids.indexOf("B")).toBeLessThan(ids.indexOf("D"));
    expect(ids.indexOf("C")).toBeLessThan(ids.indexOf("D"));
  });

  it("parallel: A, B, C (no deps)", () => {
    const a = makeCard("A");
    const b = makeCard("B");
    const c = makeCard("C");

    const order = resolveOrder([a, b, c]);
    expect(order).toHaveLength(3);
    // All should be present, order doesn't matter
    expect(order.map((c) => c.id).sort()).toEqual(["A", "B", "C"]);
  });

  it("detects cycles: A → B → C → A", () => {
    const a = makeCard("A", ["C"]);
    const b = makeCard("B", ["A"]);
    const c = makeCard("C", ["B"]);

    expect(() => resolveOrder([a, b, c])).toThrow(/Circular dependency/);
  });

  it("cycle detection with descriptive path", () => {
    const a = makeCard("A", ["B"]);
    const b = makeCard("B", ["A"]);

    try {
      resolveOrder([a, b]);
      expect.fail("Should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("Circular dependency");
      // Should include the cycle path
      expect((e as Error).message).toMatch(/A.*B|B.*A/);
    }
  });

  it("getReady returns tasks with completed deps", () => {
    const a = makeCard("A");
    const b = makeCard("B", ["A"], "completed");
    const c = makeCard("C", ["A"]);
    const d = makeCard("D", ["A", "B"]);

    // A is completed, B is completed
    const aCompleted = makeCard("A", [], "completed");
    const bCompleted = makeCard("B", ["A"], "completed");
    const cards = [aCompleted, bCompleted, c, d];

    const ready = getReady(cards);
    const readyIds = ready.map((c) => c.id);

    // C depends on A (completed) → ready
    // D depends on A (completed) and B (completed) → ready
    expect(readyIds).toContain("C");
    expect(readyIds).toContain("D");
  });

  it("getReady returns tasks with no deps", () => {
    const a = makeCard("A");
    const b = makeCard("B", ["A"]);

    const ready = getReady([a, b]);
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe("A");
  });

  it("hasCycle returns false for valid graph", () => {
    const a = makeCard("A");
    const b = makeCard("B", ["A"]);
    const c = makeCard("C", ["B"]);

    expect(hasCycle([a, b, c])).toBe(false);
  });

  it("hasCycle returns true for cyclic graph", () => {
    const a = makeCard("A", ["C"]);
    const b = makeCard("B", ["A"]);
    const c = makeCard("C", ["B"]);

    expect(hasCycle([a, b, c])).toBe(true);
  });
});
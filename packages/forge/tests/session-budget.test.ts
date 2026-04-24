import { describe, it, expect } from "vitest";
import { createBudget, increment, remaining, isWarningZone, isExhausted, getLimit } from "@tekton/forge";

describe("Session Budget", () => {
  it("creates a budget with correct role limit", () => {
    const budget = createBudget("dsp-engineer");
    expect(budget.roleId).toBe("dsp-engineer");
    expect(budget.limit).toBe(25); // Override in config
    expect(budget.used).toBe(0);
  });

  it("uses category default for unknown roles", () => {
    const budget = createBudget("unknown-role");
    expect(budget.limit).toBe(20); // Standard default
  });

  it("increment bumps used count", () => {
    let budget = createBudget("frontend-developer");
    expect(budget.used).toBe(0);
    budget = increment(budget);
    expect(budget.used).toBe(1);
    budget = increment(budget);
    expect(budget.used).toBe(2);
  });

  it("remaining returns correct count", () => {
    let budget = createBudget("frontend-developer"); // limit = 20
    expect(remaining(budget)).toBe(20);
    budget = increment(budget);
    expect(remaining(budget)).toBe(19);
  });

  it("isWarningZone triggers at correct threshold", () => {
    let budget = createBudget("preset-architect"); // limit = 15
    // Warning zone: remaining <= 3
    for (let i = 0; i < 11; i++) budget = increment(budget); // 11 used, remaining = 4
    expect(isWarningZone(budget)).toBe(false);
    budget = increment(budget); // 12 used, remaining = 3 <= firstWarning(3)
    expect(isWarningZone(budget)).toBe(true);
  });

  it("isExhausted triggers at limit", () => {
    let budget = createBudget("audio-build-engineer"); // limit = 15
    for (let i = 0; i < 14; i++) budget = increment(budget);
    expect(isExhausted(budget)).toBe(false);
    budget = increment(budget); // 15 used = limit
    expect(isExhausted(budget)).toBe(true);
  });

  it("getLimit returns role override for known roles", () => {
    expect(getLimit("dsp-engineer")).toBe(25);
    expect(getLimit("frontend-developer")).toBe(20);
    expect(getLimit("devops-agent")).toBe(15);
  });

  it("getLimit returns category heuristic for pattern-matched roles", () => {
    expect(getLimit("integration-tester")).toBe(15); // matches "test"
    expect(getLimit("code-reviewer")).toBe(15); // matches "review"
    expect(getLimit("build-integrator")).toBe(15); // matches "integrat"
  });

  it("getLimit returns standard default for unknown roles", () => {
    expect(getLimit("completely-new-role")).toBe(20);
  });
});
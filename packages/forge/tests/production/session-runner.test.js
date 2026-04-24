import { describe, it, expect } from "vitest";
import { SessionRunner } from "../../src/production/session-runner.js";
import { createBudget, increment } from "../../src/session-budget.js";
function makeTaskCard() {
    return {
        id: "tc-session-test",
        planId: "plan-test",
        role: "frontend-developer",
        title: "Build Feature",
        description: "Implement the feature",
        context: "Context info",
        acceptanceCriteria: ["Feature works"],
        outputFiles: ["src/Feature.beta.ts"],
        dependencies: [],
        status: "pending",
        sessionHistory: [],
    };
}
function makeRole() {
    return {
        id: "frontend-developer",
        name: "Frontend Developer",
        systemPrompt: "You are a developer.",
        tools: ["file", "terminal"],
        model: "deep",
        sessionLimit: 20,
    };
}
function makeTuple() {
    return {
        instruction: "Build the feature",
        context: "Context info",
        tools: ["file", "terminal"],
        model: "deep",
    };
}
describe("Session Runner", () => {
    it("session completes within budget", async () => {
        const runner = new SessionRunner({ agentPool: null });
        const result = await runner.runSession(makeTuple(), makeTaskCard(), makeRole(), async (tuple, budget) => {
            return { messages: 15, result: "Feature built", completed: true };
        });
        expect(result.completed).toBe(true);
        expect(result.sessionRecord.messageCount).toBe(15);
        expect(result.sessionRecord.status).toBe("completed");
    });
    it("warning injected at correct count", () => {
        const runner = new SessionRunner({ agentPool: null });
        const budget = createBudget("frontend-developer");
        // At start, no warning
        expect(runner.getWarningMessage(budget)).toBeNull();
        // Use 17 of 20 messages
        let budgetUsed = budget;
        for (let i = 0; i < 17; i++) {
            budgetUsed = increment(budgetUsed);
        }
        // remaining = 3, firstWarning = 3 → should trigger
        expect(runner.getWarningMessage(budgetUsed)).not.toBeNull();
    });
    it("final warning at last messages", () => {
        const runner = new SessionRunner({ agentPool: null });
        const budget = createBudget("frontend-developer");
        let budgetUsed = budget;
        for (let i = 0; i < 19; i++) {
            budgetUsed = increment(budgetUsed);
        }
        // remaining = 1, finalWarning = 1
        const msg = runner.getWarningMessage(budgetUsed);
        expect(msg).toContain("FINAL WARNING");
    });
    it("session stops at limit", async () => {
        const runner = new SessionRunner({ agentPool: null });
        const result = await runner.runSession(makeTuple(), makeTaskCard(), makeRole(), async (tuple, budget) => {
            return { messages: 20, result: "Partial work", completed: false };
        });
        expect(result.completed).toBe(false);
        expect(result.sessionRecord.status).toBe("limit-reached");
    });
    it("session record populated correctly", async () => {
        const runner = new SessionRunner({ agentPool: null });
        const card = makeTaskCard();
        const role = makeRole();
        const result = await runner.runSession(makeTuple(), card, role, async (tuple, budget) => {
            return { messages: 10, result: "Done", completed: true };
        });
        expect(result.sessionRecord.agentRole).toBe("frontend-developer");
        expect(result.sessionRecord.taskCardId).toBe("tc-session-test");
        expect(result.sessionRecord.startedAt).toBeGreaterThan(0);
        expect(result.sessionRecord.endedAt).toBeGreaterThanOrEqual(result.sessionRecord.startedAt);
    });
    it("handles error in executor", async () => {
        const runner = new SessionRunner({ agentPool: null });
        const result = await runner.runSession(makeTuple(), makeTaskCard(), makeRole(), async (tuple, budget) => {
            throw new Error("Agent crashed");
        });
        expect(result.sessionRecord.status).toBe("error");
        expect(result.result).toContain("Agent crashed");
    });
});
//# sourceMappingURL=session-runner.test.js.map
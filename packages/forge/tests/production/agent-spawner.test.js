import { describe, it, expect } from "vitest";
import { spawnProductionAgent } from "../../src/production/agent-spawner.js";
function makeTaskCard(overrides = {}) {
    return {
        id: "tc-test1",
        planId: "plan-test",
        role: "frontend-developer",
        title: "Build Login Page",
        description: "Implement the login page with form validation",
        context: "This is the first page users see. Should be responsive.",
        acceptanceCriteria: [
            "Login form renders correctly",
            "Form validation works",
            "Responsive on mobile",
        ],
        outputFiles: ["src/pages/Login.beta.tsx", "src/pages/Login.test.beta.ts"],
        dependencies: [],
        status: "pending",
        sessionHistory: [],
        ...overrides,
    };
}
function makeRole(overrides = {}) {
    return {
        id: "frontend-developer",
        name: "Frontend Developer",
        systemPrompt: "You are a React developer. Build components using TypeScript and Tailwind CSS. Save all source files with .beta suffix.",
        tools: ["file", "terminal"],
        model: "deep",
        sessionLimit: 20,
        ...overrides,
    };
}
function makeHandoff(overrides = {}) {
    return {
        sessionId: "session-prev123",
        taskCardId: "tc-test1",
        summary: "Completed login form UI, remaining work: validation logic",
        completedWork: ["Login form component", "CSS styling"],
        remainingWork: ["Form validation", "Error handling"],
        filesModified: [
            { path: "src/pages/Login.beta.tsx", action: "created", status: "beta", hash: "abc123" },
        ],
        importantDecisions: ["Used controlled components pattern"],
        blockers: [],
        cavememObservations: [],
        nextSessionContext: "Focus on adding form validation to the login component",
        ...overrides,
    };
}
describe("Agent Spawner", () => {
    it("produces valid AgentTuple", () => {
        const card = makeTaskCard();
        const role = makeRole();
        const tuple = spawnProductionAgent(card, role);
        expect(tuple.instruction).toBeTruthy();
        expect(tuple.context).toBeTruthy();
        expect(tuple.tools).toEqual(["file", "terminal"]);
        expect(tuple.model).toBe("deep");
    });
    it("instruction includes role system prompt", () => {
        const card = makeTaskCard();
        const role = makeRole();
        const tuple = spawnProductionAgent(card, role);
        expect(tuple.instruction).toContain("React developer");
        expect(tuple.instruction).toContain("Build Login Page");
        expect(tuple.instruction).toContain("Login form renders correctly");
        expect(tuple.instruction).toContain("src/pages/Login.beta.tsx");
    });
    it("context is curated (not full brief)", () => {
        const card = makeTaskCard({ context: "Short relevant context" });
        const role = makeRole();
        const tuple = spawnProductionAgent(card, role);
        expect(tuple.context).toContain("Short relevant context");
        // Should NOT contain the full brief or irrelevant sections
    });
    it("handoff context is included when present", () => {
        const card = makeTaskCard({ context: "Task context" });
        const role = makeRole();
        const handoff = makeHandoff();
        const tuple = spawnProductionAgent(card, role, handoff);
        expect(tuple.context).toContain("Previous Session Handoff");
        expect(tuple.context).toContain("Completed login form UI");
        expect(tuple.context).toContain("Focus on adding form validation");
    });
    it("context respects size limit", () => {
        const veryLongContext = "x".repeat(20000); // Way over 4000 tokens
        const card = makeTaskCard({ context: veryLongContext });
        const role = makeRole();
        const tuple = spawnProductionAgent(card, role);
        // Should be truncated
        expect(tuple.context.length).toBeLessThan(veryLongContext.length);
        expect(tuple.context).toContain("truncated");
    });
    it("without handoff, context only includes task context", () => {
        const card = makeTaskCard({ context: "Just the task context" });
        const role = makeRole();
        const tuple = spawnProductionAgent(card, role);
        expect(tuple.context).toContain("Just the task context");
        expect(tuple.context).not.toContain("Previous Session Handoff");
    });
    it("empty context when card has no context and no handoff", () => {
        const card = makeTaskCard({ context: "" });
        const role = makeRole();
        const tuple = spawnProductionAgent(card, role);
        expect(tuple.context).toBe("");
    });
});
//# sourceMappingURL=agent-spawner.test.js.map
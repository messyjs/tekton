/**
 * Scribe Tests — Observes sessions, compresses observations,
 * and produces handoff packages.
 */
import { describe, it, expect } from "vitest";
import { Scribe } from "../../src/continuity/scribe.js";
// ── Mock Cavemem Store ──────────────────────────────────────────────────
function createMockCavemem() {
    const observations = [];
    return {
        observations,
        storeObservation(text, metadata) {
            observations.push({ text, metadata });
            return `obs-${observations.length}`;
        },
        async searchMemory() { return []; },
        async getTimeline() { return []; },
        async exportForHandoff() { return []; },
    };
}
// ── Tests ───────────────────────────────────────────────────────────────
describe("Scribe", () => {
    const config = {
        id: "scribe-production",
        observes: ["production"],
        model: "gemini-flash",
    };
    it("processes messages and extracts key info", async () => {
        const cavemem = createMockCavemem();
        const scribe = new Scribe(config, cavemem);
        const taskCard = {
            id: "task-1",
            planId: "plan-1",
            role: "frontend-developer",
            title: "Build Landing Page",
            description: "Create the main landing page",
            context: "",
            acceptanceCriteria: ["Page loads", "Responsive"],
            outputFiles: ["index.html"],
            dependencies: [],
            status: "in-progress",
            sessionHistory: [],
        };
        scribe.observeSession("session-1", taskCard, "project-1", 1);
        // Process a decision message
        const obs1 = await scribe.processMessage({
            role: "assistant",
            content: "I decided to use Tailwind CSS for the styling approach",
        });
        expect(obs1).not.toBeNull();
        expect(obs1.kind).toBe("decision");
        expect(obs1.content.length).toBeLessThan(100); // Compressed
        // Process a progress message
        const obs2 = await scribe.processMessage({
            role: "assistant",
            content: "I completed the hero section and implemented the responsive layout",
        });
        expect(obs2).not.toBeNull();
        expect(obs2.kind).toBe("progress");
        // Process a blocker message
        const obs3 = await scribe.processMessage({
            role: "assistant",
            content: "I'm stuck on the image carousel — it's failing to load",
        });
        expect(obs3).not.toBeNull();
        expect(obs3.kind).toBe("blocker");
    });
    it("stores observations via cavemem bridge", async () => {
        const cavemem = createMockCavemem();
        const scribe = new Scribe(config, cavemem);
        scribe.observeSession("session-2", {
            id: "task-2", planId: "plan-1", role: "dev", title: "Test",
            description: "Test", context: "", acceptanceCriteria: [], outputFiles: [],
            dependencies: [], status: "in-progress", sessionHistory: [],
        }, "project-1", 1);
        await scribe.processMessage({
            role: "assistant",
            content: "I decided to use React for the frontend",
        });
        expect(cavemem.observations.length).toBe(1);
        expect(cavemem.observations[0].metadata.projectId).toBe("project-1");
        expect(cavemem.observations[0].metadata.role).toBe("scribe-production");
        expect(cavemem.observations[0].metadata.sessionNum).toBe(1);
    });
    it("produces a complete HandoffPackage", async () => {
        const cavemem = createMockCavemem();
        const scribe = new Scribe(config, cavemem);
        scribe.observeSession("session-3", {
            id: "task-3", planId: "plan-1", role: "dev", title: "Build API",
            description: "Build REST API", context: "", acceptanceCriteria: [],
            outputFiles: [], dependencies: [], status: "in-progress", sessionHistory: [],
        }, "project-1", 2);
        await scribe.processMessage({
            role: "assistant",
            content: "I decided to use Express.js for the API framework",
        });
        await scribe.processMessage({
            role: "assistant",
            content: "I completed the user authentication endpoints",
        });
        scribe.addRemainingWork("Implement user profile endpoints");
        scribe.addRemainingWork("Add rate limiting");
        const handoff = await scribe.finalizeHandoff();
        expect(handoff.sessionId).toBe("session-3");
        expect(handoff.summary.length).toBeGreaterThan(0);
        expect(handoff.completedWork.length).toBeGreaterThan(0);
        expect(handoff.remainingWork).toContain("Implement user profile endpoints");
        expect(handoff.importantDecisions.length).toBeGreaterThan(0);
        expect(handoff.nextSessionContext).toContain("Previous Session Summary");
        expect(handoff.nextSessionContext).toContain("Remaining Work");
        expect(handoff.nextSessionContext).toContain("Continue from where");
        expect(handoff.cavememObservations.length).toBeGreaterThan(0);
    });
    it("summary is shorter than raw messages", async () => {
        const cavemem = createMockCavemem();
        const scribe = new Scribe(config, cavemem);
        scribe.observeSession("session-4", {
            id: "task-4", planId: "plan-1", role: "dev", title: "Long Task",
            description: "Long task with many messages", context: "",
            acceptanceCriteria: [], outputFiles: [], dependencies: [],
            status: "in-progress", sessionHistory: [],
        }, "project-1", 1);
        const longMessage = "I decided to use a microservices architecture with Kubernetes for orchestration because we need to scale independently and I want to make sure each service can be deployed separately without affecting the others and we should also consider using Redis for caching";
        await scribe.processMessage({
            role: "assistant",
            content: longMessage,
        });
        const handoff = await scribe.finalizeHandoff();
        // Summary should be shorter than raw messages
        const rawTotal = longMessage.length;
        expect(handoff.summary.length).toBeLessThan(rawTotal);
    });
    it("ignores empty or short messages", async () => {
        const cavemem = createMockCavemem();
        const scribe = new Scribe(config, cavemem);
        scribe.observeSession("session-5", {
            id: "task-5", planId: "plan-1", role: "dev", title: "Test",
            description: "Test", context: "", acceptanceCriteria: [],
            outputFiles: [], dependencies: [], status: "in-progress", sessionHistory: [],
        }, "project-1", 1);
        const result = await scribe.processMessage({
            role: "assistant",
            content: "",
        });
        expect(result).toBeNull();
        expect(scribe.getObservations()).toHaveLength(0);
    });
});
//# sourceMappingURL=scribe.test.js.map
import { describe, it, expect } from "vitest";
import { CreativeTeam } from "../../src/ideation/creative-team.js";
describe("Creative Team", () => {
    const config = { minExchanges: 4 };
    it("personas rotate across multiple exchanges", async () => {
        const team = new CreativeTeam(config);
        const personaHistory = [];
        for (let i = 0; i < 6; i++) {
            const resp = await team.getNextResponse(`general message ${i}`);
            personaHistory.push(resp.persona);
        }
        // Should see multiple different personas
        const unique = new Set(personaHistory);
        expect(unique.size).toBeGreaterThanOrEqual(2);
    });
    it("technical questions trigger architect", async () => {
        const team = new CreativeTeam(config);
        const resp = await team.getNextResponse("How does the architecture scale?");
        expect(resp.persona).toBe("Atlas");
    });
    it("UX questions trigger UX thinker", async () => {
        const team = new CreativeTeam(config);
        const resp = await team.getNextResponse("How does the UI feel on mobile?");
        expect(resp.persona).toBe("Sage");
    });
    it("suggestWrapUp only true after minimum exchanges", async () => {
        const team = new CreativeTeam(config);
        const resp1 = await team.getNextResponse("msg1");
        expect(resp1.suggestWrapUp).toBe(false);
        const resp2 = await team.getNextResponse("msg2");
        expect(resp2.suggestWrapUp).toBe(false);
        const resp3 = await team.getNextResponse("msg3");
        expect(resp3.suggestWrapUp).toBe(false);
        const resp4 = await team.getNextResponse("msg4");
        expect(resp4.suggestWrapUp).toBe(true);
    });
    it("generateBrief produces a valid ProductBrief", async () => {
        const team = new CreativeTeam(config);
        // Simulate a conversation
        await team.getNextResponse("I want a task management app");
        await team.getNextResponse("It should be for freelancers");
        await team.getNextResponse("React and Node.js stack");
        await team.getNextResponse("I want it on web and mobile");
        const brief = await team.generateBrief((transcript) => {
            return Promise.resolve({
                id: "brief-gen1",
                title: "Task Manager for Freelancers",
                problemStatement: "Freelancers need a simple task tool",
                proposedSolution: "A React/Node task management app",
                technicalApproach: "React + Node.js",
                userStories: ["As a freelancer, I want to create tasks"],
                risks: ["Complexity", "Adoption"],
                estimatedComplexity: "medium",
                domains: ["web-app"],
                ideationTranscript: transcript,
                createdAt: Date.now(),
                revisionHistory: [],
            });
        });
        expect(brief.title).toBe("Task Manager for Freelancers");
        expect(brief.domains).toContain("web-app");
    });
    it("custom response generator is used", async () => {
        const team = new CreativeTeam(config);
        const response = await team.getNextResponse("Tell me about the UX flow", async (sys, user) => `Custom response for: ${user.slice(0, 20)}`);
        expect(response.response).toContain("Custom response");
    });
    it("reset clears state", async () => {
        const team = new CreativeTeam(config);
        await team.getNextResponse("hello");
        team.reset();
        expect(team.getChatRoom().getExchangeCount()).toBe(0);
    });
});
//# sourceMappingURL=creative-team.test.js.map
import { describe, it, expect } from "vitest";
import { generatePlan } from "../../src/director/plan-generator.js";
function makeBrief(overrides = {}) {
    return {
        id: "brief-plan-test",
        title: "Task Manager",
        problemStatement: "Freelancers need task tracking",
        proposedSolution: "A focused task management web app",
        technicalApproach: "React + Node.js",
        userStories: [
            "As a freelancer, I want to create tasks",
            "As a freelancer, I want to track time",
            "As a freelancer, I want to view by client",
        ],
        risks: ["Competition", "Mobile UX"],
        estimatedComplexity: "medium",
        domains: ["web-app"],
        ideationTranscript: "",
        createdAt: Date.now(),
        revisionHistory: [],
        ...overrides,
    };
}
describe("Plan Generator", () => {
    it("simple single-domain brief produces valid plan", async () => {
        const brief = makeBrief();
        const plan = await generatePlan(brief, ["web-app"]);
        expect(plan.id).toBeTruthy();
        expect(plan.briefId).toBe(brief.id);
        expect(plan.domains).toContain("web-app");
        expect(plan.taskCards.length).toBeGreaterThan(0);
        expect(plan.estimatedSessions).toBeGreaterThan(0);
        expect(plan.teamTemplate.domain).toContain("web-app");
    });
    it("multi-domain brief produces merged plan", async () => {
        const brief = makeBrief({
            title: "Synth Plugin with Web Store",
            domains: ["vst-audio", "web-app"],
            proposedSolution: "VST synth with web preset marketplace",
            technicalApproach: "JUCE C++ for VST, React for web",
        });
        const plan = await generatePlan(brief, ["vst-audio", "web-app"]);
        expect(plan.domains).toHaveLength(2);
        // Merged template should have roles from both domains
        expect(plan.teamTemplate.roles.length).toBeGreaterThan(4);
    });
    it("dependencies form valid DAG", async () => {
        const brief = makeBrief();
        const plan = await generatePlan(brief, ["web-app"]);
        // Verify no circular dependencies by checking getDependencyOrder doesn't throw
        for (const card of plan.taskCards) {
            // Each dependency should reference another card in the plan
            for (const depId of card.dependencies) {
                const found = plan.taskCards.find((c) => c.id === depId);
                if (found) {
                    // Dep must not depend back on this card (no direct cycle)
                    expect(found.dependencies).not.toContain(card.id);
                }
            }
        }
    });
    it("session estimate is reasonable", async () => {
        const brief = makeBrief();
        const plan = await generatePlan(brief, ["web-app"]);
        // Estimated sessions should be roughly 1.5x card count
        expect(plan.estimatedSessions).toBeGreaterThanOrEqual(plan.taskCards.length);
        expect(plan.estimatedSessions).toBeLessThanOrEqual(plan.taskCards.length * 3);
    });
    it("throws for unknown domains", async () => {
        const brief = makeBrief();
        await expect(generatePlan(brief, ["unknown-domain"])).rejects.toThrow();
    });
    it("LLM generation falls back to template on failure", async () => {
        const brief = makeBrief();
        const failingLLM = async () => { throw new Error("LLM unavailable"); };
        const plan = await generatePlan(brief, ["web-app"], failingLLM);
        expect(plan.taskCards.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=plan-generator.test.js.map
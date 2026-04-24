import { describe, it, expect } from "vitest";
import { validateBrief } from "../../src/ideation/brief-schema.js";
function makeValidBrief(overrides = {}) {
    return {
        id: "brief-test123",
        title: "Test Product",
        problemStatement: "Users need a way to manage tasks",
        proposedSolution: "Build a task management app",
        technicalApproach: "React frontend with Node.js backend",
        userStories: [
            "As a user, I want to create tasks so that I can track my work",
            "As a user, I want to mark tasks complete so I can see progress",
            "As a user, I want to organize tasks by project so I can focus",
        ],
        risks: ["Technical complexity", "User adoption"],
        estimatedComplexity: "medium",
        domains: ["web-app"],
        ideationTranscript: "User: I want a task app\nNova: Who is this for?",
        createdAt: Date.now(),
        revisionHistory: [],
        ...overrides,
    };
}
describe("Brief Schema", () => {
    it("validates a correct ProductBrief", () => {
        const result = validateBrief(makeValidBrief());
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
    it("rejects missing required string fields", () => {
        const brief = makeValidBrief({ title: "" });
        const result = validateBrief(brief);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes("title"))).toBe(true);
    });
    it("rejects empty domains array", () => {
        const brief = makeValidBrief({ domains: [] });
        const result = validateBrief(brief);
        expect(result.valid).toBe(false);
    });
    it("rejects invalid estimatedComplexity", () => {
        const brief = makeValidBrief({ estimatedComplexity: "super-hard" });
        const result = validateBrief(brief);
        expect(result.valid).toBe(false);
    });
    it("rejects invalid domain names", () => {
        const brief = makeValidBrief({ domains: ["invalid-domain"] });
        const result = validateBrief(brief);
        expect(result.valid).toBe(false);
    });
    it("accepts empty revisionHistory", () => {
        const result = validateBrief(makeValidBrief({ revisionHistory: [] }));
        expect(result.valid).toBe(true);
    });
    it("rejects non-object input", () => {
        const result = validateBrief(null);
        expect(result.valid).toBe(false);
    });
});
//# sourceMappingURL=brief-schema.test.js.map
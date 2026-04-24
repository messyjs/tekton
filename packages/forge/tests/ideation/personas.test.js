import { describe, it, expect } from "vitest";
import { strategist } from "../../src/ideation/personas/strategist.js";
import { architect } from "../../src/ideation/personas/architect.js";
import { uxThinker } from "../../src/ideation/personas/ux-thinker.js";
describe("Ideation Personas", () => {
    const personas = [strategist, architect, uxThinker];
    it("each persona has required fields", () => {
        for (const persona of personas) {
            expect(persona).toHaveProperty("name");
            expect(persona).toHaveProperty("role");
            expect(persona).toHaveProperty("speakingStyle");
            expect(persona).toHaveProperty("questionTypes");
            expect(persona).toHaveProperty("systemPromptSegment");
            expect(typeof persona.name).toBe("string");
            expect(typeof persona.role).toBe("string");
            expect(typeof persona.speakingStyle).toBe("string");
            expect(Array.isArray(persona.questionTypes)).toBe(true);
            expect(typeof persona.systemPromptSegment).toBe("string");
        }
    });
    it("system prompt segments are non-empty strings", () => {
        for (const persona of personas) {
            expect(persona.systemPromptSegment.length).toBeGreaterThan(0);
        }
    });
    it("strategist persona is Nova", () => {
        expect(strategist.name).toBe("Nova");
        expect(strategist.role).toBe("Product Strategist");
        expect(strategist.questionTypes).toHaveLength(4);
        expect(strategist.questionTypes).toContain("Who is this for?");
    });
    it("architect persona is Atlas", () => {
        expect(architect.name).toBe("Atlas");
        expect(architect.role).toBe("Technical Architect");
        expect(architect.questionTypes).toHaveLength(4);
        expect(architect.questionTypes).toContain("What are the performance requirements?");
    });
    it("ux-thinker persona is Sage", () => {
        expect(uxThinker.name).toBe("Sage");
        expect(uxThinker.role).toBe("UX Thinker");
        expect(uxThinker.questionTypes).toHaveLength(4);
        expect(uxThinker.questionTypes).toContain("Walk me through the user's first 60 seconds.");
    });
    it("all personas have unique names", () => {
        const names = personas.map((p) => p.name);
        expect(new Set(names).size).toBe(names.length);
    });
    it("system prompts mention beta file naming", () => {
        for (const persona of personas) {
            expect(persona.systemPromptSegment).toContain(".beta");
        }
    });
});
//# sourceMappingURL=personas.test.js.map
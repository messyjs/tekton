import { describe, it, expect } from "vitest";
import { generateBrief } from "../../src/ideation/brief-generator.js";
describe("Brief Generator", () => {
    const sampleTranscript = `User: I want to build a VST synthesizer plugin
Nova: Who is this for? Are they professional producers or hobbyists?
User: Both — but primarily electronic music producers
Atlas: What DSP framework will you use? JUCE is the standard for VST development.
User: Yes, JUCE with C++
Sage: Walk me through the producer's first 60 seconds — they open the plugin, what do they see?
User: A clean UI with oscillator section, filter, and envelope`;
    it("produces a valid brief from LLM output", async () => {
        const mockLLM = async () => JSON.stringify({
            title: "SynthWave VST Plugin",
            problemStatement: "Electronic producers need a versatile synthesizer",
            proposedSolution: "A JUCE-based VST synthesizer with clean UI",
            technicalApproach: "JUCE C++ with DSP module",
            userStories: [
                "As a producer, I want to shape oscillator tones so I can create unique sounds",
                "As a producer, I want responsive filter controls so I can sculpt timbre",
                "As a producer, I want preset management so I can save and recall patches",
            ],
            risks: ["DSP performance on lower-end machines", "VST3 compatibility across hosts"],
            estimatedComplexity: "high",
            domains: ["vst-audio"],
        });
        const brief = await generateBrief(sampleTranscript, mockLLM);
        expect(brief.title).toBe("SynthWave VST Plugin");
        expect(brief.domains).toContain("vst-audio");
        expect(brief.userStories.length).toBeGreaterThanOrEqual(1);
        expect(brief.risks.length).toBeGreaterThanOrEqual(1);
    });
    it("produces a brief from template when no LLM available", async () => {
        const brief = await generateBrief(sampleTranscript);
        expect(brief.id).toBeTruthy();
        expect(brief.title).toBeTruthy();
        expect(brief.userStories.length).toBeGreaterThanOrEqual(3);
        expect(brief.domains).toContain("vst-audio");
    });
    it("handles LLM returning JSON in markdown code block", async () => {
        const mockLLM = async () => `\`\`\`json
{
  "title": "Test Product",
  "problemStatement": "A problem",
  "proposedSolution": "A solution",
  "technicalApproach": "React",
  "userStories": ["As a user, I want something"],
  "risks": ["Risk one"],
  "estimatedComplexity": "low",
  "domains": ["web-app"]
}
\`\`\``;
        const brief = await generateBrief(sampleTranscript, mockLLM);
        expect(brief.title).toBe("Test Product");
        expect(brief.domains).toContain("web-app");
    });
    it("retries on validation failure", async () => {
        let callCount = 0;
        const mockLLM = async () => {
            callCount++;
            if (callCount === 1) {
                // Invalid: empty userStories
                return JSON.stringify({
                    title: "Bad",
                    problemStatement: "",
                    proposedSolution: "x",
                    technicalApproach: "x",
                    userStories: [],
                    risks: [],
                    estimatedComplexity: "low",
                    domains: ["web-app"],
                });
            }
            // Second call: valid
            return JSON.stringify({
                title: "Fixed Product",
                problemStatement: "A real problem",
                proposedSolution: "A real solution",
                technicalApproach: "React",
                userStories: ["As a user, I want something"],
                risks: ["Some risk"],
                estimatedComplexity: "medium",
                domains: ["web-app"],
            });
        };
        const brief = await generateBrief(sampleTranscript, mockLLM);
        expect(callCount).toBe(2);
        expect(brief.title).toBe("Fixed Product");
    });
    it("template extraction detects domains from transcript", async () => {
        const brief = await generateBrief("I want to build a JUCE VST plugin with React preset store");
        expect(brief.domains).toContain("vst-audio");
        expect(brief.domains).toContain("web-app");
    });
});
//# sourceMappingURL=brief-generator.test.js.map
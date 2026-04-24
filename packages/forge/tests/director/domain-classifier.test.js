import { describe, it, expect } from "vitest";
import { classifyDomains } from "../../src/director/domain-classifier.js";
function makeBrief(overrides = {}) {
    return {
        id: "brief-test",
        title: "Test Product",
        problemStatement: "Need a product",
        proposedSolution: "Build something",
        technicalApproach: "Technology stack",
        userStories: ["As a user, I want something"],
        risks: ["Risk"],
        estimatedComplexity: "medium",
        domains: [],
        ideationTranscript: "",
        createdAt: Date.now(),
        revisionHistory: [],
        ...overrides,
    };
}
describe("Domain Classifier", () => {
    it("classifies VST synthesizer plugin", async () => {
        const brief = makeBrief({
            title: "VST Synthesizer Plugin",
            problemStatement: "Producers need a new synth for electronic music",
            technicalApproach: "JUCE C++ VST plugin with DSP oscillators",
            domains: [],
        });
        const domains = await classifyDomains(brief);
        expect(domains).toContain("vst-audio");
    });
    it("classifies React web app", async () => {
        const brief = makeBrief({
            title: "Task Manager Web App",
            proposedSolution: "React frontend with Node.js backend",
            technicalApproach: "React 18, Express API, PostgreSQL",
            domains: [],
        });
        const domains = await classifyDomains(brief);
        expect(domains).toContain("web-app");
    });
    it("classifies multi-domain product (synth + web store)", async () => {
        const brief = makeBrief({
            title: "Synth Plugin with Web Preset Marketplace",
            proposedSolution: "VST synthesizer plugin with a React web-based preset marketplace",
            technicalApproach: "JUCE for the VST, React web app for the marketplace",
            domains: [],
        });
        const domains = await classifyDomains(brief);
        expect(domains).toContain("vst-audio");
        expect(domains).toContain("web-app");
    });
    it("classifies 3D printable product", async () => {
        const brief = makeBrief({
            title: "3D Printable Phone Stand",
            technicalApproach: "OpenSCAD parametric design exported to STL",
            domains: [],
        });
        const domains = await classifyDomains(brief);
        expect(domains).toContain("cad-physical");
    });
    it("classifies cross-platform desktop app", async () => {
        const brief = makeBrief({
            title: "Cross-platform Desktop App",
            technicalApproach: "Electron with React frontend",
            domains: [],
        });
        const domains = await classifyDomains(brief);
        expect(domains).toContain("cross-platform");
    });
    it("defaults to web-app for ambiguous input", async () => {
        const brief = makeBrief({
            title: "Something Cool",
            problemStatement: "We need a tool",
            technicalApproach: "Build it",
        });
        const domains = await classifyDomains(brief);
        expect(domains).toContain("web-app");
    });
    it("LLM confirmation adjusts domains", async () => {
        const brief = makeBrief({
            title: "Game Engine Plugin",
            proposedSolution: "Plugin for Unreal Engine 5",
            technicalApproach: "UE5 C++ module",
        });
        const mockLLM = async () => JSON.stringify(["unreal-engine"]);
        const domains = await classifyDomains(brief, mockLLM);
        expect(domains).toContain("unreal-engine");
    });
    it("falls back to keyword results when LLM returns invalid data", async () => {
        const brief = makeBrief({
            title: "VST Plugin",
            proposedSolution: "A JUCE synth",
            technicalApproach: "JUCE C++",
            domains: [],
        });
        const mockLLM = async () => "not json at all";
        const domains = await classifyDomains(brief, mockLLM);
        expect(domains).toContain("vst-audio");
    });
});
//# sourceMappingURL=domain-classifier.test.js.map
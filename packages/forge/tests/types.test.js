import { describe, it, expect } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { ProductDomainEnum, ProductBriefSchema, DirectorDecisionSchema, TaskCardSchema, TeamTemplateSchema, AgentTupleSchema, SessionRecordSchema, HandoffPackageSchema, FileChangeSchema, ForgeManifestSchema, QASignoffSchema, PreflightResultSchema, } from "@tekton/forge";
describe("Forge Types", () => {
    it("ProductDomainEnum validates all 9 domains", () => {
        const domains = [
            "vst-audio", "windows-desktop", "web-app", "unreal-engine",
            "android", "ios", "cad-physical", "html-static", "cross-platform",
        ];
        for (const domain of domains) {
            expect(Value.Check(ProductDomainEnum, domain)).toBe(true);
        }
    });
    it("ProductDomainEnum rejects invalid domain", () => {
        expect(Value.Check(ProductDomainEnum, "invalid-domain")).toBe(false);
    });
    it("ProductBriefSchema validates a complete brief", () => {
        const brief = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "VST Synth Plugin",
            problemStatement: "Musicians need affordable synths",
            proposedSolution: "Build a polyphonic synth plugin",
            technicalApproach: "JUCE C++ with custom DSP pipeline",
            userStories: ["As a musician, I want to..."],
            risks: ["Complex DSP", "Plugin compatibility"],
            estimatedComplexity: "high",
            domains: ["vst-audio"],
            ideationTranscript: "Transcript...",
            createdAt: Date.now(),
            revisionHistory: [],
        };
        expect(Value.Check(ProductBriefSchema, brief)).toBe(true);
    });
    it("ProductBriefSchema rejects missing required fields", () => {
        const incomplete = { title: "Missing fields" };
        expect(Value.Check(ProductBriefSchema, incomplete)).toBe(false);
    });
    it("DirectorDecisionSchema validates", () => {
        const decision = {
            verdict: "approved",
            reasoning: "Strong proposal",
            scores: { feasibility: 8, clarity: 9, completeness: 7, originality: 8, scopeAppropriate: 9 },
        };
        expect(Value.Check(DirectorDecisionSchema, decision)).toBe(true);
    });
    it("DirectorDecisionSchema rejects invalid verdict", () => {
        const decision = {
            verdict: "maybe",
            reasoning: "Unsure",
            scores: { feasibility: 8, clarity: 9, completeness: 7, originality: 8, scopeAppropriate: 9 },
        };
        expect(Value.Check(DirectorDecisionSchema, decision)).toBe(false);
    });
    it("TaskCardSchema validates", () => {
        const card = {
            id: "tc-abc123",
            planId: "plan-1",
            role: "dsp-engineer",
            title: "Implement oscillator",
            description: "Create Sine, Saw, Square oscillators",
            context: "Use JUCE dsp module",
            acceptanceCriteria: ["All waveforms produce correct output"],
            outputFiles: ["src/Oscillator.h", "src/Oscillator.cpp"],
            dependencies: [],
            status: "pending",
            sessionHistory: [],
        };
        expect(Value.Check(TaskCardSchema, card)).toBe(true);
    });
    it("TaskCardSchema rejects invalid status", () => {
        const card = {
            id: "tc-1",
            planId: "plan-1",
            role: "dev",
            title: "Task",
            description: "Do stuff",
            context: "",
            acceptanceCriteria: [],
            outputFiles: [],
            dependencies: [],
            status: "in-review",
            sessionHistory: [],
        };
        expect(Value.Check(TaskCardSchema, card)).toBe(false);
    });
    it("TeamTemplateSchema validates a complete template", () => {
        const template = {
            domain: "vst-audio",
            roles: [{
                    id: "dsp-engineer",
                    name: "DSP Engineer",
                    systemPrompt: "You are a DSP engineer",
                    tools: ["file", "terminal"],
                    model: "deep",
                    sessionLimit: 25,
                }],
            testRoles: [{
                    id: "pluginval-tester",
                    name: "Pluginval Tester",
                    systemPrompt: "You test plugins",
                    tools: ["terminal"],
                    model: "fast",
                    sessionLimit: 15,
                    validatorCommand: "pluginval --validate",
                    testPattern: "pluginval",
                }],
            projectTemplate: "juce-vst",
            buildCommand: "cmake --build build",
            testCommand: "ctest",
            requiredTools: ["cmake", "git"],
            optionalTools: ["juce"],
        };
        expect(Value.Check(TeamTemplateSchema, template)).toBe(true);
    });
    it("FileChangeSchema validates all actions and statuses", () => {
        for (const action of ["created", "modified", "deleted"]) {
            for (const status of ["draft", "beta", "testing", "release"]) {
                const change = {
                    path: "src/main.cpp",
                    action,
                    status,
                    hash: "abc123",
                };
                expect(Value.Check(FileChangeSchema, change)).toBe(true);
            }
        }
    });
    it("ForgeManifestSchema validates", () => {
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["vst-audio"],
            artifacts: [{
                    path: "src/main.cpp",
                    status: "draft",
                    producedBy: "dsp-engineer",
                    taskCardId: "tc-1",
                    lastModified: Date.now(),
                    testedBy: [],
                    hash: "def456",
                }],
            qaSignoffs: [],
            currentPhase: "ideation",
        };
        expect(Value.Check(ForgeManifestSchema, manifest)).toBe(true);
    });
    it("ForgeManifestSchema rejects invalid phase", () => {
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["vst-audio"],
            artifacts: [],
            qaSignoffs: [],
            currentPhase: "deployment",
        };
        expect(Value.Check(ForgeManifestSchema, manifest)).toBe(false);
    });
    it("QASignoffSchema validates", () => {
        const signoff = {
            artifactPath: "src/main.cpp",
            testerRole: "pluginval-tester",
            passed: true,
            notes: "All tests pass",
            timestamp: Date.now(),
        };
        expect(Value.Check(QASignoffSchema, signoff)).toBe(true);
    });
    it("PreflightResultSchema validates", () => {
        const result = { ready: true, missing: [], warnings: [] };
        expect(Value.Check(PreflightResultSchema, result)).toBe(true);
    });
    it("PreflightResultSchema validates with missing items", () => {
        const result = { ready: false, missing: ["cmake", "juce"], warnings: ["Large project"] };
        expect(Value.Check(PreflightResultSchema, result)).toBe(true);
    });
    it("HandoffPackageSchema validates", () => {
        const pkg = {
            sessionId: "sess-1",
            taskCardId: "tc-1",
            summary: "Completed oscillator implementation",
            completedWork: ["Sine wave", "Saw wave"],
            remainingWork: ["Square wave needs envelope"],
            filesModified: [{
                    path: "src/Oscillator.cpp",
                    action: "created",
                    status: "draft",
                    hash: "abc",
                }],
            importantDecisions: ["Switched to SIMD implementation"],
            blockers: [],
            cavememObservations: ["Oscillator performance is 2x budget"],
            nextSessionContext: "Finish Square wave and add envelope",
        };
        expect(Value.Check(HandoffPackageSchema, pkg)).toBe(true);
    });
    it("SessionRecordSchema validates", () => {
        const record = {
            id: "sess-1",
            agentRole: "dsp-engineer",
            taskCardId: "tc-1",
            messageCount: 15,
            maxMessages: 25,
            startedAt: Date.now() - 300000,
            endedAt: Date.now(),
            status: "completed",
        };
        expect(Value.Check(SessionRecordSchema, record)).toBe(true);
    });
    it("SessionRecordSchema rejects invalid status", () => {
        const record = {
            id: "sess-1",
            agentRole: "dev",
            taskCardId: "tc-1",
            messageCount: 10,
            maxMessages: 20,
            startedAt: Date.now(),
            status: "pending",
        };
        expect(Value.Check(SessionRecordSchema, record)).toBe(false);
    });
    it("AgentTupleSchema validates", () => {
        const tuple = {
            instruction: "Build the oscillator",
            context: "Using JUCE dsp module",
            tools: ["file", "terminal"],
            model: "deep",
        };
        expect(Value.Check(AgentTupleSchema, tuple)).toBe(true);
    });
});
//# sourceMappingURL=types.test.js.map
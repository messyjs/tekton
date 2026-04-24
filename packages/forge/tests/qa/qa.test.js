/**
 * QA Layer Tests — Verdict aggregation, failure routing, promotion, QA pipeline.
 */
import { describe, it, expect } from "vitest";
import { aggregateResults } from "../../src/qa/verdict.js";
import { createRetryCard } from "../../src/qa/failure-router.js";
import { promoteArtifact, promoteAll } from "../../src/qa/promotion.js";
import { QAManager, UNIT_TESTER_ROLE, INTEGRATION_TESTER_ROLE, REVIEW_AGENT_ROLE } from "../../src/qa/qa-manager.js";
// ── Verdict Tests ───────────────────────────────────────────────────────
describe("aggregateResults", () => {
    it("returns pass when all testers pass", () => {
        const results = [
            { tester: "unit", passed: true, artifact: "a.ts", category: "unit-test", details: "ok" },
            { tester: "integration", passed: true, artifact: "a.ts", category: "integration", details: "ok" },
            { tester: "review", passed: true, artifact: "a.ts", category: "review", details: "ok" },
        ];
        expect(aggregateResults(results)).toBe("pass");
    });
    it("returns fail for unit test failure", () => {
        const results = [
            { tester: "unit", passed: true, artifact: "a.ts", category: "unit-test", details: "ok" },
            { tester: "integration", passed: false, artifact: "b.ts", category: "integration", details: "Build failed" },
        ];
        expect(aggregateResults(results)).toBe("fail");
    });
    it("returns conditional-pass for minor review issues", () => {
        const results = [
            { tester: "unit", passed: true, artifact: "a.ts", category: "unit-test", details: "ok" },
            { tester: "integration", passed: true, artifact: "a.ts", category: "integration", details: "ok" },
            { tester: "review", passed: false, artifact: "a.ts", category: "review", details: "Minor style issue", severity: "minor" },
        ];
        expect(aggregateResults(results)).toBe("conditional-pass");
    });
    it("returns fail for security issues", () => {
        const results = [
            { tester: "unit", passed: true, artifact: "a.ts", category: "unit-test", details: "ok" },
            { tester: "security", passed: false, artifact: "a.ts", category: "security", details: "Hardcoded API key" },
        ];
        expect(aggregateResults(results)).toBe("fail");
    });
    it("returns pass when all results are skipped", () => {
        const results = [
            { tester: "domain", passed: true, skipped: true, artifact: "", category: "domain-validation", details: "skipped" },
        ];
        expect(aggregateResults(results)).toBe("pass");
    });
});
// ── Failure Router Tests ────────────────────────────────────────────────
describe("createRetryCard", () => {
    it("creates retry card with failure details", () => {
        const original = {
            id: "task-1",
            planId: "plan-1",
            role: "frontend-developer",
            title: "Build Landing Page",
            description: "Create the landing page with header and hero section",
            context: "",
            acceptanceCriteria: ["Page loads", "Responsive"],
            outputFiles: ["src/page.tsx"],
            dependencies: [],
            status: "completed",
            sessionHistory: [],
        };
        const failure = {
            tester: "unit-tester",
            passed: false,
            artifact: "src/page.tsx",
            category: "unit-test",
            details: "3 tests failed: missing aria-label on header",
        };
        const retry = createRetryCard(original, failure);
        expect(retry.id).toContain("retry-task-1");
        expect(retry.role).toBe("frontend-developer");
        expect(retry.title).toContain("Fix:");
        expect(retry.description).toContain("3 tests failed");
        expect(retry.acceptanceCriteria).toContain("The specific unit-test failure must be resolved");
        expect(retry.dependencies).toHaveLength(0); // Retry cards have no dependencies
    });
});
// ── Promotion Tests ─────────────────────────────────────────────────────
describe("promoteArtifact", () => {
    it("promotes artifact with QA signoffs", () => {
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["html-static"],
            artifacts: [
                {
                    path: "src/index.html",
                    status: "testing",
                    producedBy: "frontend-developer",
                    taskCardId: "task-1",
                    lastModified: Date.now(),
                    testedBy: ["unit-tester"],
                    hash: "abc123",
                },
            ],
            qaSignoffs: [
                {
                    artifactPath: "src/index.html",
                    testerRole: "unit-tester",
                    passed: true,
                    notes: "All tests pass",
                    timestamp: Date.now(),
                },
            ],
            currentPhase: "qa",
        };
        const result = promoteArtifact("/tmp/test-project", "src/index.html", manifest);
        expect(result.updatedManifest.artifacts[0].status).toBe("release");
    });
    it("throws without QA signoffs", () => {
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["html-static"],
            artifacts: [
                {
                    path: "src/styles.css",
                    status: "beta",
                    producedBy: "frontend-developer",
                    taskCardId: "task-2",
                    lastModified: Date.now(),
                    testedBy: [],
                    hash: "def456",
                },
            ],
            qaSignoffs: [],
            currentPhase: "production",
        };
        expect(() => promoteArtifact("/tmp/test-project", "src/styles.css", manifest)).toThrow("no QA signoffs");
    });
    it("throws when all signoffs are failures", () => {
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["html-static"],
            artifacts: [
                {
                    path: "src/app.tsx",
                    status: "testing",
                    producedBy: "frontend-developer",
                    taskCardId: "task-3",
                    lastModified: Date.now(),
                    testedBy: ["unit-tester"],
                    hash: "ghi789",
                },
            ],
            qaSignoffs: [
                {
                    artifactPath: "src/app.tsx",
                    testerRole: "unit-tester",
                    passed: false,
                    notes: "2 tests failed",
                    timestamp: Date.now(),
                },
            ],
            currentPhase: "qa",
        };
        expect(() => promoteArtifact("/tmp/test-project", "src/app.tsx", manifest)).toThrow("no passing QA signoffs");
    });
});
describe("promoteAll", () => {
    it("promotes all ready artifacts and skips unready ones", () => {
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["html-static"],
            artifacts: [
                {
                    path: "index.html",
                    status: "testing",
                    producedBy: "dev",
                    taskCardId: "task-1",
                    lastModified: Date.now(),
                    testedBy: ["unit-tester"],
                    hash: "a1",
                },
                {
                    path: "styles.css",
                    status: "beta",
                    producedBy: "dev",
                    taskCardId: "task-2",
                    lastModified: Date.now(),
                    testedBy: [],
                    hash: "b2",
                },
            ],
            qaSignoffs: [
                { artifactPath: "index.html", testerRole: "unit-tester", passed: true, notes: "OK", timestamp: Date.now() },
            ],
            currentPhase: "qa",
        };
        const result = promoteAll("/tmp/test-project", manifest);
        // index.html has a signoff, styles.css doesn't
        expect(result.skipped).toContain("styles.css");
    });
});
// ── QA Manager Tests ────────────────────────────────────────────────────
describe("QAManager", () => {
    it("has valid role definitions", () => {
        expect(UNIT_TESTER_ROLE.id).toBe("unit-tester");
        expect(UNIT_TESTER_ROLE.tools).toContain("terminal");
        expect(UNIT_TESTER_ROLE.sessionLimit).toBe(15);
        expect(INTEGRATION_TESTER_ROLE.id).toBe("integration-tester");
        expect(REVIEW_AGENT_ROLE.id).toBe("review-agent");
    });
    it("runs QA pipeline with mock sub-agents", async () => {
        const manager = new QAManager();
        // Mock sub-agent runner
        manager.setSubAgentRunner(async (role, context) => ({
            tester: role.id,
            passed: true,
            artifact: context,
            category: role.id === "unit-tester" ? "unit-test" : role.id === "integration-tester" ? "integration" : "review",
            details: `Mock ${role.id} passed`,
        }));
        const manifest = {
            projectId: "proj-test",
            briefId: "brief-1",
            domains: ["html-static"],
            artifacts: [],
            qaSignoffs: [],
            currentPhase: "qa",
        };
        const result = await manager.runQAPipeline("/tmp/test-project", manifest);
        expect(result.verdict).toBe("pass");
        expect(result.results.length).toBeGreaterThanOrEqual(3); // unit + integration + review
    });
    it("detects QA failures correctly", async () => {
        const manager = new QAManager();
        manager.setSubAgentRunner(async (role) => {
            if (role.id === "unit-tester") {
                return {
                    tester: "unit-tester",
                    passed: false,
                    artifact: "test-file",
                    category: "unit-test",
                    details: "3 tests failed",
                };
            }
            return {
                tester: role.id,
                passed: true,
                artifact: "",
                category: role.id === "integration-tester" ? "integration" : "review",
                details: "passed",
            };
        });
        const manifest = {
            projectId: "proj-fail",
            briefId: "brief-1",
            domains: ["html-static"],
            artifacts: [],
            qaSignoffs: [],
            currentPhase: "qa",
        };
        const result = await manager.runQAPipeline("/tmp/test-project", manifest);
        expect(result.verdict).toBe("fail");
        expect(result.failedArtifacts.length).toBeGreaterThan(0);
    });
    it("skips domain validators gracefully when tools missing", () => {
        const manager = new QAManager({ skipDomainValidators: true });
        // No domain validators registered — should still work
        expect(manager).toBeDefined();
    });
});
//# sourceMappingURL=qa.test.js.map
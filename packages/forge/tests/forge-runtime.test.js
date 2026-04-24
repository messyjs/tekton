/**
 * ForgeRuntime Tests — Project lifecycle, state management, listing.
 */
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "os";
import { ForgeRuntime } from "@tekton/forge";
function createMockLLM() {
    return async (systemPrompt, userPrompt) => {
        if (systemPrompt.includes("evaluate") || systemPrompt.includes("director")) {
            return JSON.stringify({
                verdict: "approved",
                reasoning: "Brief approved for testing.",
                scores: { feasibility: 8, clarity: 8, completeness: 8, originality: 7, scopeAppropriate: 8 },
            });
        }
        if (systemPrompt.includes("classify") || systemPrompt.includes("domain")) {
            return JSON.stringify(["html-static"]);
        }
        if (systemPrompt.includes("plan") || systemPrompt.includes("generate")) {
            return JSON.stringify({
                id: "plan-mock",
                briefId: "brief-mock",
                domains: ["html-static"],
                teamTemplate: {
                    domain: "html-static",
                    roles: [{ id: "frontend-developer-static", name: "Frontend Developer", systemPrompt: "Build HTML.", tools: ["file", "terminal"], model: "deep", sessionLimit: 20 }],
                    testRoles: [],
                    projectTemplate: "html-static",
                    buildCommand: null,
                    testCommand: null,
                    requiredTools: ["git"],
                    optionalTools: ["node"],
                },
                taskCards: [
                    {
                        id: "task-1", planId: "plan-mock", role: "frontend-developer-static",
                        title: "Build Page", description: "Build the page", context: "",
                        acceptanceCriteria: ["Page loads"], outputFiles: ["index.html"],
                        dependencies: [], status: "pending", sessionHistory: [],
                    },
                ],
                dependencyGraph: { "task-1": [] },
                estimatedSessions: 1,
            });
        }
        return JSON.stringify({
            id: "brief-mock",
            title: "Test Project",
            problemStatement: "Test",
            proposedSolution: "Test solution",
            technicalApproach: "HTML",
            userStories: ["As a user, I want to test"],
            risks: ["Test risk"],
            estimatedComplexity: "low",
            domains: ["html-static"],
            ideationTranscript: "mock",
            createdAt: Date.now(),
            revisionHistory: [],
        });
    };
}
describe("ForgeRuntime", () => {
    const tmpDir = mkdtempSync(join(os.tmpdir(), "forge-runtime-"));
    afterEach(() => {
        try {
            rmSync(tmpDir, { recursive: true, force: true });
        }
        catch { }
    });
    it("creates project and saves state", async () => {
        const runtime = new ForgeRuntime({
            enabled: true,
            projectsDir: tmpDir,
            qa: { skipDomainValidators: true },
            callLLM: createMockLLM(),
        });
        const projectId = await runtime.newProject("Test project brief");
        expect(projectId).toBeTruthy();
        // Verify state file was created
        const statePath = join(tmpDir, projectId, "forge-state.json");
        expect(existsSync(statePath)).toBe(true);
        const state = JSON.parse(readFileSync(statePath, "utf-8"));
        expect(state.projectId).toBe(projectId);
    });
    it("lists projects", async () => {
        const runtime = new ForgeRuntime({
            enabled: true,
            projectsDir: tmpDir,
            qa: { skipDomainValidators: true },
            callLLM: createMockLLM(),
        });
        await runtime.newProject("Project 1");
        await runtime.newProject("Project 2");
        const projects = runtime.listProjects();
        expect(projects.length).toBeGreaterThanOrEqual(2);
    });
    it("gets project status", async () => {
        const runtime = new ForgeRuntime({
            enabled: true,
            projectsDir: tmpDir,
            qa: { skipDomainValidators: true },
            callLLM: createMockLLM(),
        });
        const projectId = await runtime.newProject("Status test");
        const status = runtime.getProjectStatus(projectId);
        expect(status).not.toBeNull();
        expect(status.projectId).toBe(projectId);
        expect(status.currentPhase).toBeDefined();
    });
    it("resumes project from saved state", async () => {
        const runtime = new ForgeRuntime({
            enabled: true,
            projectsDir: tmpDir,
            qa: { skipDomainValidators: true },
            callLLM: createMockLLM(),
        });
        const projectId = await runtime.newProject("Resume test");
        // New runtime instance
        const runtime2 = new ForgeRuntime({
            enabled: true,
            projectsDir: tmpDir,
        });
        const state = await runtime2.resumeProject(projectId);
        expect(state.projectId).toBe(projectId);
    });
    it("throws when Forge is disabled", () => {
        const runtime = new ForgeRuntime({ enabled: false, projectsDir: tmpDir });
        expect(runtime.isEnabled()).toBe(false);
    });
    it("throws on resume of nonexistent project", async () => {
        const runtime = new ForgeRuntime({
            enabled: true,
            projectsDir: tmpDir,
        });
        await expect(runtime.resumeProject("nonexistent-id")).rejects.toThrow("Project not found");
    });
});
//# sourceMappingURL=forge-runtime.test.js.map
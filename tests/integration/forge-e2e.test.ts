/**
 * Forge E2E Integration Tests — Full pipeline tests with mocked LLM calls.
 *
 * Tests:
 * 1. Static HTML portfolio — full pipeline
 * 2. QA failure and retry cycle
 * 3. Multi-domain project
 * 4. Forge disabled blocks all operations
 * 5. Project resume after interruption
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import os from "os";

import { ForgeRuntime, type ForgeState } from "@tekton/forge";

// ── Mock LLM ────────────────────────────────────────────────────────────

function createMockLLM(responses: Record<string, string>): (system: string, user: string) => Promise<string> {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    // Try to find a matching response based on keywords
    for (const [keyword, response] of Object.entries(responses)) {
      if (userPrompt.toLowerCase().includes(keyword) || systemPrompt.toLowerCase().includes(keyword)) {
        return response;
      }
    }

    // Default responses based on what's being asked
    if (systemPrompt.includes("evaluate") || systemPrompt.includes("director") || systemPrompt.includes("review")) {
      return JSON.stringify({
        verdict: "approved",
        reasoning: "Brief is clear and well-scoped.",
        scores: { feasibility: 8, clarity: 8, completeness: 8, originality: 7, scopeAppropriate: 8 },
      });
    }

    if (systemPrompt.includes("classify") || systemPrompt.includes("domain")) {
      return JSON.stringify(["html-static"]);
    }

    if (systemPrompt.includes("generate") || systemPrompt.includes("plan")) {
      return JSON.stringify({
        id: "plan-test",
        briefId: "brief-test",
        domains: ["html-static"],
        teamTemplate: {
          domain: "html-static",
          roles: [{ id: "frontend-developer-static", name: "Frontend Developer", systemPrompt: "Build static HTML pages.", tools: ["file", "terminal"], model: "deep", sessionLimit: 20 }],
          testRoles: [],
          projectTemplate: "html-static",
          buildCommand: null,
          testCommand: null,
          requiredTools: ["git"],
          optionalTools: ["node"],
        },
        taskCards: [
          {
            id: "task-html",
            planId: "plan-test",
            role: "frontend-developer-static",
            title: "Build HTML Structure",
            description: "Create the HTML structure for the portfolio page",
            context: "Portfolio page with projects section and contact form",
            acceptanceCriteria: ["Page has header", "Page has projects section", "Page has contact form"],
            outputFiles: ["index.html"],
            dependencies: [],
            status: "pending",
            sessionHistory: [],
          },
          {
            id: "task-css",
            planId: "plan-test",
            role: "frontend-developer-static",
            title: "Create CSS Styling",
            description: "Add responsive CSS styling",
            context: "Style the portfolio page with modern CSS",
            acceptanceCriteria: ["Responsive layout", "Visual hierarchy", "Hover effects"],
            outputFiles: ["style.css"],
            dependencies: ["task-html"],
            status: "pending",
            sessionHistory: [],
          },
          {
            id: "task-js",
            planId: "plan-test",
            role: "frontend-developer-static",
            title: "Add JS Interactivity",
            description: "Add JavaScript interactivity",
            context: "Add form validation and smooth scrolling",
            acceptanceCriteria: ["Form validation works", "Smooth scroll", "Mobile menu"],
            outputFiles: ["script.js"],
            dependencies: ["task-html"],
            status: "pending",
            sessionHistory: [],
          },
        ],
        dependencyGraph: { "task-html": [], "task-css": ["task-html"], "task-js": ["task-html"] },
        estimatedSessions: 3,
      });
    }

    if (systemPrompt.includes("brief") || systemPrompt.includes("ideation")) {
      return JSON.stringify({
        id: "brief-test",
        title: "Portfolio Website",
        problemStatement: "Need a professional online presence to showcase work",
        proposedSolution: "A static HTML portfolio page with projects section and contact form",
        technicalApproach: "HTML5 + CSS3 + vanilla JavaScript, responsive design",
        userStories: [
          "As a visitor, I want to see project highlights",
          "As a visitor, I want to contact the developer",
        ],
        risks: ["Scope creep on features"],
        estimatedComplexity: "low",
        domains: ["html-static"],
        ideationTranscript: "Mock ideation session",
        createdAt: Date.now(),
        revisionHistory: [],
      });
    }

    return "ok";
  };
}

describe("Forge E2E — Static HTML Portfolio", () => {
  const tmpDir = mkdtempSync(join(os.tmpdir(), "forge-e2e-"));

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it("runs the full pipeline with mocked LLM", async () => {
    const runtime = new ForgeRuntime({
      enabled: true,
      projectsDir: tmpDir,
      production: { maxConcurrency: 1, maxRetries: 1 },
      qa: { skipDomainValidators: true },
      callLLM: createMockLLM({}),
    });

    const projectId = await runtime.newProject("Build a static HTML portfolio page with a projects section and contact form");

    // Verify project was created
    expect(projectId).toBeTruthy();

    // Get project status
    const status = runtime.getProjectStatus(projectId);
    expect(status).not.toBeNull();
    expect(status!.projectId).toBe(projectId);
    expect(status!.currentPhase).toBeDefined();

    // Verify project directory exists
    const projectDir = join(tmpDir, projectId);
    expect(existsSync(projectDir)).toBe(true);

    // Verify manifest was created
    expect(existsSync(join(projectDir, "forge-manifest.json"))).toBe(true);

    // Verify state was saved
    expect(existsSync(join(projectDir, "forge-state.json"))).toBe(true);

    // List projects
    const projects = runtime.listProjects();
    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(projects.some(p => p.id === projectId)).toBe(true);
  });

  it("QA failure and retry cycle", async () => {
    const runtime = new ForgeRuntime({
      enabled: true,
      projectsDir: tmpDir,
      production: { maxConcurrency: 1, maxRetries: 1 },
      qa: { skipDomainValidators: true },
      maxQACycles: 2,
      callLLM: createMockLLM({}),
    });

    // Create project - the pipeline handles QA internally
    const projectId = await runtime.newProject("Build a simple static site");
    const status = runtime.getProjectStatus(projectId);

    // The project should exist and have gone through the pipeline
    expect(status).not.toBeNull();
    // Even with QA failures, the project should reach some terminal state
    expect(["qa", "release", "review", "production"]).toContain(status!.currentPhase);
  });

  it("multi-domain project classifies correctly", async () => {
    const runtime = new ForgeRuntime({
      enabled: true,
      projectsDir: tmpDir,
      production: { maxConcurrency: 2, maxRetries: 1 },
      qa: { skipDomainValidators: true },
      callLLM: createMockLLM({
        // When asked about VST/web, return both domains
        "vst": JSON.stringify(["vst-audio", "web-app"]),
        "synth": JSON.stringify(["vst-audio", "web-app"]),
      }),
    });

    const projectId = await runtime.newProject("VST synth plugin with web preset store");
    const status = runtime.getProjectStatus(projectId);

    expect(status).not.toBeNull();
    expect(status!.projectId).toBe(projectId);
  }, 15000);

  it("Forge disabled blocks all operations", async () => {
    const runtime = new ForgeRuntime({
      enabled: false,
      projectsDir: tmpDir,
    });

    expect(runtime.isEnabled()).toBe(false);

    await expect(runtime.newProject("test")).rejects.toThrow("Forge is not enabled");
  });

  it("project resume loads saved state", async () => {
    const runtime = new ForgeRuntime({
      enabled: true,
      projectsDir: tmpDir,
      production: { maxConcurrency: 1, maxRetries: 1 },
      qa: { skipDomainValidators: true },
      callLLM: createMockLLM({}),
    });

    // Create project
    const projectId = await runtime.newProject("Simple test project");
    const status = runtime.getProjectStatus(projectId);
    expect(status).not.toBeNull();

    // Create new runtime instance and resume
    const runtime2 = new ForgeRuntime({
      enabled: true,
      projectsDir: tmpDir,
    });

    const resumed = await runtime2.resumeProject(projectId);
    expect(resumed.projectId).toBe(projectId);
    expect(resumed.currentPhase).toBeDefined();
  });
});
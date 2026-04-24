import { describe, it, expect } from "vitest";
import { finalSignoff } from "../../src/director/final-signoff.js";
import type { ForgeManifest, ProductBrief, ArtifactEntry, QASignoff } from "../../src/types.js";

function makeBrief(): ProductBrief {
  return {
    id: "brief-signoff",
    title: "Test Product",
    problemStatement: "A problem",
    proposedSolution: "A solution",
    technicalApproach: "React",
    userStories: ["As a user, I want something"],
    risks: ["Risk"],
    estimatedComplexity: "medium",
    domains: ["web-app"],
    ideationTranscript: "",
    createdAt: Date.now(),
    revisionHistory: [],
  };
}

function makeManifest(overrides: Partial<ForgeManifest> = {}): ForgeManifest {
  return {
    projectId: "proj-1",
    briefId: "brief-signoff",
    domains: ["web-app"],
    artifacts: [],
    qaSignoffs: [],
    currentPhase: "qa",
    ...overrides,
  };
}

describe("Final Signoff", () => {
  it("all artifacts at testing status with passing QA → approved", async () => {
    const manifest = makeManifest({
      artifacts: [
        { path: "src/App.tsx", status: "testing", producedBy: "frontend", taskCardId: "tc-1", lastModified: Date.now(), testedBy: ["tester"], hash: "abc" },
        { path: "src/server.ts", status: "testing", producedBy: "backend", taskCardId: "tc-2", lastModified: Date.now(), testedBy: ["tester"], hash: "def" },
      ],
      qaSignoffs: [
        { artifactPath: "src/App.tsx", testerRole: "tester", passed: true, notes: "All tests pass", timestamp: Date.now() },
        { artifactPath: "src/server.ts", testerRole: "tester", passed: true, notes: "API tests pass", timestamp: Date.now() },
      ],
    });

    const result = await finalSignoff(manifest, makeBrief());
    expect(result.approved).toBe(true);
  });

  it("missing signoffs → not approved", async () => {
    const manifest = makeManifest({
      artifacts: [
        { path: "src/App.tsx", status: "testing", producedBy: "frontend", taskCardId: "tc-1", lastModified: Date.now(), testedBy: [], hash: "abc" },
      ],
      qaSignoffs: [],
    });

    const result = await finalSignoff(manifest, makeBrief());
    expect(result.approved).toBe(false);
    expect(result.sendBack).toBeTruthy();
    expect(result.sendBack!.length).toBeGreaterThan(0);
  });

  it("failed QA signoffs → not approved", async () => {
    const manifest = makeManifest({
      artifacts: [
        { path: "src/App.tsx", status: "testing", producedBy: "frontend", taskCardId: "tc-1", lastModified: Date.now(), testedBy: ["tester"], hash: "abc" },
      ],
      qaSignoffs: [
        { artifactPath: "src/App.tsx", testerRole: "tester", passed: false, notes: "Login flow broken", timestamp: Date.now() },
      ],
    });

    const result = await finalSignoff(manifest, makeBrief());
    expect(result.approved).toBe(false);
    expect(result.sendBack).toBeTruthy();
  });

  it("artifacts not at testing or release status → not approved", async () => {
    const manifest = makeManifest({
      artifacts: [
        { path: "src/App.tsx", status: "draft", producedBy: "frontend", taskCardId: "tc-1", lastModified: Date.now(), testedBy: [], hash: "abc" },
      ],
      qaSignoffs: [],
    });

    const result = await finalSignoff(manifest, makeBrief());
    expect(result.approved).toBe(false);
  });

  it("release status artifacts also pass signoff", async () => {
    const manifest = makeManifest({
      artifacts: [
        { path: "dist/app.js", status: "release", producedBy: "builder", taskCardId: "tc-3", lastModified: Date.now(), testedBy: ["tester"], hash: "xyz" },
      ],
      qaSignoffs: [
        { artifactPath: "dist/app.js", testerRole: "tester", passed: true, notes: "Production ready", timestamp: Date.now() },
      ],
    });

    const result = await finalSignoff(manifest, makeBrief());
    expect(result.approved).toBe(true);
  });
});
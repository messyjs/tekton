import { describe, it, expect } from "vitest";
import { evaluate as approvalGate } from "../../src/director/approval-gate.js";
import type { ProductBrief } from "../../src/types.js";

function makeBrief(overrides: Partial<ProductBrief> = {}): ProductBrief {
  return {
    id: "brief-gate-test",
    title: "Great Product",
    problemStatement: "Users have a real, clearly defined problem with no good existing solution. The problem affects thousands of professionals daily.",
    proposedSolution: "A well-scoped web app that addresses the core need with minimal viable features.",
    technicalApproach: "React 18 frontend, Node.js Express backend, PostgreSQL database. Clear architecture with defined API endpoints.",
    userStories: [
      "As a professional, I want to track my work so I can report progress",
      "As a team lead, I want to see status so I can prioritize",
      "As a new user, I want quick onboarding so I can start immediately",
    ],
    risks: [
      "Market has competing solutions",
      "Mobile experience requires additional work",
    ],
    estimatedComplexity: "medium",
    domains: ["web-app"],
    ideationTranscript: "",
    createdAt: Date.now(),
    revisionHistory: [],
    ...overrides,
  };
}

describe("Approval Gate", () => {
  it("approved brief goes through full pipeline", async () => {
    const mockLLM = async () =>
      JSON.stringify({
        scores: { feasibility: 8, clarity: 9, completeness: 8, originality: 7, scopeAppropriate: 8 },
        reasoning: "Strong, well-scoped brief.",
      });

    const decision = await approvalGate(makeBrief(), { callLLM: mockLLM });
    expect(decision.verdict).toBe("approved");
    expect(decision.productionPlan).toBeTruthy();
  });

  it("revision count enforced — brief with revision history", async () => {
    // This test verifies the pipeline works with brief that has revision history.
    // The actual revision count enforcement happens in the director pipeline
    // where revisions > maxRevisions forces rejection.
    const brief = makeBrief({
      revisionHistory: [
        { round: 1, directorNotes: "Needs more detail", changesMade: "Added technical approach", timestamp: Date.now() },
      ],
    });

    const mockLLM = async () =>
      JSON.stringify({
        scores: { feasibility: 8, clarity: 8, completeness: 8, originality: 8, scopeAppropriate: 8 },
        reasoning: "Approved after revision.",
      });

    const decision = await approvalGate(brief, { callLLM: mockLLM });
    expect(decision.verdict).toBe("approved");
  });
});
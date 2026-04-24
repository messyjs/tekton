import { describe, it, expect, vi } from "vitest";
import { evaluateBrief } from "../../src/director/evaluator.js";
import type { ProductBrief } from "../../src/types.js";

function makeBrief(overrides: Partial<ProductBrief> = {}): ProductBrief {
  return {
    id: "brief-test",
    title: "Task Manager App",
    problemStatement: "Freelancers struggle to track hours and tasks across multiple clients. Existing tools are either too complex or too simple.",
    proposedSolution: "A focused task management app for freelancers that combines time tracking with task organization.",
    technicalApproach: "React 18 frontend with Node.js Express backend, PostgreSQL database, REST API.",
    userStories: [
      "As a freelancer, I want to create tasks with deadlines so I can track deliverables",
      "As a freelancer, I want to track time per task so I can bill clients accurately",
      "As a freelancer, I want to view tasks by client so I can focus on one project at a time",
    ],
    risks: [
      "Market competition from established tools",
      "Mobile experience needs to match desktop for adoption",
    ],
    estimatedComplexity: "medium",
    domains: ["web-app"],
    ideationTranscript: "User: I need a task app\nNova: For whom?",
    createdAt: Date.now(),
    revisionHistory: [],
    ...overrides,
  };
}

describe("Evaluator", () => {
  it("strong brief (all 8+) → approved", async () => {
    const mockLLM = async () =>
      JSON.stringify({
        scores: {
          feasibility: 9,
          clarity: 8,
          completeness: 8,
          originality: 8,
          scopeAppropriate: 8,
        },
        reasoning: "Strong brief with clear scope and achievable goals.",
      });

    const decision = await evaluateBrief(makeBrief(), mockLLM);
    expect(decision.verdict).toBe("approved");
    expect(decision.scores.feasibility).toBeGreaterThanOrEqual(8);
  });

  it("weak brief (all 2-3) → rejected", async () => {
    const mockLLM = async () =>
      JSON.stringify({
        scores: {
          feasibility: 2,
          clarity: 3,
          completeness: 2,
          originality: 2,
          scopeAppropriate: 2,
        },
        reasoning: "Brief is too vague and the proposed scope is unrealistic.",
      });

    const decision = await evaluateBrief(makeBrief({
      problemStatement: "I want something",
      proposedSolution: "Build it",
      technicalApproach: "",
      userStories: ["As a user, I want stuff"],
      risks: [],
    }), mockLLM);
    expect(decision.verdict).toBe("rejected");
  });

  it("mixed brief (average 5) → revise with notes", async () => {
    const mockLLM = async () =>
      JSON.stringify({
        scores: {
          feasibility: 7,
          clarity: 4,
          completeness: 5,
          originality: 5,
          scopeAppropriate: 6,
        },
        reasoning: "Technical plan is solid but the brief lacks clarity on user needs.",
      });

    const decision = await evaluateBrief(makeBrief({
      problemStatement: "Something needs fixing",
      proposedSolution: "Fix it with tech",
    }), mockLLM);
    expect(decision.verdict).toBe("revise");
    expect(decision.revisionNotes).toBeTruthy();
  });

  it("borderline brief at threshold", async () => {
    const mockLLM = async () =>
      JSON.stringify({
        scores: {
          feasibility: 7,
          clarity: 7,
          completeness: 7,
          originality: 7,
          scopeAppropriate: 7,
        },
        reasoning: "Meets minimum thresholds on all criteria.",
      });

    const decision = await evaluateBrief(makeBrief(), mockLLM);
    expect(decision.verdict).toBe("approved");
  });

  it("heuristic evaluation produces valid scores", async () => {
    const decision = await evaluateBrief(makeBrief());
    expect(decision.scores).toHaveProperty("feasibility");
    expect(decision.scores).toHaveProperty("clarity");
    expect(decision.scores).toHaveProperty("completeness");
    expect(decision.scores).toHaveProperty("originality");
    expect(decision.scores).toHaveProperty("scopeAppropriate");
    expect(decision.reasoning).toBeTruthy();
  });

  it("handles LLM returning markdown-wrapped JSON", async () => {
    const mockLLM = async () =>
      "```json\n{\"scores\":{\"feasibility\":8,\"clarity\":9,\"completeness\":8,\"originality\":7,\"scopeAppropriate\":8},\"reasoning\":\"Good brief.\"}\n```";

    const decision = await evaluateBrief(makeBrief(), mockLLM);
    expect(decision.verdict).toBe("approved");
  });
});
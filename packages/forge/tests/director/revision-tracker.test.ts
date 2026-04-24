import { describe, it, expect } from "vitest";
import { addRevision, getRevisionCount, getLatestRevision, hasExceededMaxRevisions } from "../../src/director/revision-tracker.js";
import type { ProductBrief } from "../../src/types.js";

function makeBrief(overrides: Partial<ProductBrief> = {}): ProductBrief {
  return {
    id: "brief-rev-test",
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
    ...overrides,
  };
}

describe("Revision Tracker", () => {
  it("adds a revision to brief", () => {
    const brief = makeBrief();
    const updated = addRevision(brief, "Needs more detail on architecture", "Added architecture section");
    expect(updated.revisionHistory).toHaveLength(1);
    expect(updated.revisionHistory[0].round).toBe(1);
    expect(updated.revisionHistory[0].directorNotes).toBe("Needs more detail on architecture");
  });

  it("tracks revision count", () => {
    let brief = makeBrief();
    expect(getRevisionCount(brief)).toBe(0);
    brief = addRevision(brief, "Note 1", "Change 1");
    expect(getRevisionCount(brief)).toBe(1);
    brief = addRevision(brief, "Note 2", "Change 2");
    expect(getRevisionCount(brief)).toBe(2);
  });

  it("gets latest revision", () => {
    let brief = makeBrief();
    expect(getLatestRevision(brief)).toBeNull();
    brief = addRevision(brief, "Note 1", "Change 1");
    brief = addRevision(brief, "Note 2", "Change 2");
    const latest = getLatestRevision(brief);
    expect(latest).not.toBeNull();
    expect(latest!.round).toBe(2);
  });

  it("detects max revisions exceeded", () => {
    let brief = makeBrief();
    expect(hasExceededMaxRevisions(brief, 3)).toBe(false);
    brief = addRevision(brief, "1", "1");
    brief = addRevision(brief, "2", "2");
    expect(hasExceededMaxRevisions(brief, 3)).toBe(false);
    brief = addRevision(brief, "3", "3");
    expect(hasExceededMaxRevisions(brief, 3)).toBe(true);
  });
});
/**
 * Revision Tracker — Track brief revision history and enforce limits.
 */
import type { ProductBrief, RevisionNote } from "../types.js";

/**
 * Add a revision note to a brief's history.
 */
export function addRevision(brief: ProductBrief, notes: string, changes: string): ProductBrief {
  const revision: RevisionNote = {
    round: brief.revisionHistory.length + 1,
    directorNotes: notes,
    changesMade: changes,
    timestamp: Date.now(),
  };

  return {
    ...brief,
    revisionHistory: [...brief.revisionHistory, revision],
  };
}

/**
 * Get the number of revisions a brief has been through.
 */
export function getRevisionCount(brief: ProductBrief): number {
  return brief.revisionHistory.length;
}

/**
 * Get the latest revision note, or null if no revisions exist.
 */
export function getLatestRevision(brief: ProductBrief): RevisionNote | null {
  if (brief.revisionHistory.length === 0) return null;
  return brief.revisionHistory[brief.revisionHistory.length - 1];
}

/**
 * Check if a brief has exceeded the maximum number of revisions.
 */
export function hasExceededMaxRevisions(brief: ProductBrief, maxRevisions: number): boolean {
  return brief.revisionHistory.length >= maxRevisions;
}
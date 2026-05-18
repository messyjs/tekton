/**
 * Revision Tracker — Track brief revision history and enforce limits.
 */
import type { ProductBrief, RevisionNote } from "../types.js";
/**
 * Add a revision note to a brief's history.
 */
export declare function addRevision(brief: ProductBrief, notes: string, changes: string): ProductBrief;
/**
 * Get the number of revisions a brief has been through.
 */
export declare function getRevisionCount(brief: ProductBrief): number;
/**
 * Get the latest revision note, or null if no revisions exist.
 */
export declare function getLatestRevision(brief: ProductBrief): RevisionNote | null;
/**
 * Check if a brief has exceeded the maximum number of revisions.
 */
export declare function hasExceededMaxRevisions(brief: ProductBrief, maxRevisions: number): boolean;
//# sourceMappingURL=revision-tracker.d.ts.map
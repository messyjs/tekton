import type { HandoffPackage } from "../types.js";
import type { PrecisionItem } from "@tekton/core";
/**
 * Find and load the latest handoff for a given task card.
 */
export declare function loadLatestHandoff(projectDir: string, taskCardId: string): HandoffPackage | null;
/**
 * Format a handoff package into injectable context for a fresh session.
 */
export declare function formatAsContext(handoff: HandoffPackage): string;
/**
 * Extract precision items from a handoff package for injection into a
 * fresh Context Engineer. This preserves exact values across sessions.
 */
export declare function extractPrecisionItemsFromHandoff(handoff: HandoffPackage): PrecisionItem[];
//# sourceMappingURL=handoff-loader.d.ts.map
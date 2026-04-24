/**
 * Handoff Loader — Finds and loads handoff packages from disk.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HandoffPackage } from "../types.js";
import type { PrecisionItem } from "@tekton/core";

/**
 * Find and load the latest handoff for a given task card.
 */
export function loadLatestHandoff(projectDir: string, taskCardId: string): HandoffPackage | null {
  const handoffDir = join(projectDir, "handoffs");

  if (!existsSync(handoffDir)) {
    return null;
  }

  // Find all handoff files for this task card
  const files = readdirSync(handoffDir)
    .filter(f => f.startsWith(taskCardId) && f.endsWith(".json"))
    .sort(); // Sort by name (which includes timestamp)

  if (files.length === 0) {
    return null;
  }

  // Load the most recent one
  const latestFile = files[files.length - 1];
  const filePath = join(handoffDir, latestFile);

  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as HandoffPackage;
  } catch {
    return null;
  }
}

/**
 * Format a handoff package into injectable context for a fresh session.
 */
export function formatAsContext(handoff: HandoffPackage): string {
  const sections: string[] = [];

  sections.push("## Previous Session Summary");
  sections.push(handoff.summary);

  if (handoff.completedWork.length > 0) {
    sections.push("\n## Completed");
    for (const item of handoff.completedWork) {
      sections.push(`- ${item}`);
    }
  }

  if (handoff.remainingWork.length > 0) {
    sections.push("\n## Remaining Work");
    for (const item of handoff.remainingWork) {
      sections.push(`- ${item}`);
    }
  }

  if (handoff.importantDecisions.length > 0) {
    sections.push("\n## Key Decisions");
    for (const decision of handoff.importantDecisions) {
      sections.push(`- ${decision}`);
    }
  }

  if (handoff.filesModified.length > 0) {
    sections.push("\n## Files Modified");
    for (const fc of handoff.filesModified) {
      sections.push(`- ${fc.action}: ${fc.path}`);
    }
  }

  if (handoff.blockers.length > 0) {
    sections.push("\n## Blockers");
    for (const blocker of handoff.blockers) {
      sections.push(`- ${blocker}`);
    }
  }

  sections.push("\nContinue from where the previous session left off.");

  return sections.join("\n");
}

/**
 * Extract precision items from a handoff package for injection into a
 * fresh Context Engineer. This preserves exact values across sessions.
 */
export function extractPrecisionItemsFromHandoff(handoff: HandoffPackage): PrecisionItem[] {
  const items: PrecisionItem[] = [];
  let index = 0;

  // Extract from important decisions
  for (const decision of handoff.importantDecisions) {
    items.push({
      id: `handoff-decision-${index}`,
      category: "decisions",
      value: decision,
      context: "Carried over from previous session handoff",
      sourceMessageIndex: -1,
      superseded: false,
      pinned: true, // Handoff decisions are always pinned
      timestamp: new Date().toISOString(),
    });
    index++;
  }

  // Extract from file modifications
  for (const fc of handoff.filesModified) {
    items.push({
      id: `handoff-file-${index}`,
      category: "file-changes",
      value: `${fc.action}: ${fc.path}`,
      context: "File modification from previous session",
      sourceMessageIndex: -1,
      superseded: false,
      pinned: false,
      timestamp: new Date().toISOString(),
    });
    index++;
  }

  return items;
}
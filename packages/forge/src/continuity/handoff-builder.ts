/**
 * Handoff Builder — Constructs HandoffPackages from session data.
 */
import type { HandoffPackage, FileChange, SessionRecord } from "../types.js";
import type { Scribe } from "./scribe.js";

export interface SessionRecordExtended {
  id: string;
  agentRole: string;
  taskCardId: string;
  messageCount: number;
  maxMessages: number;
  startedAt: number;
  endedAt?: number;
  status: string;
}

/**
 * Build a HandoffPackage from Scribe state and session data.
 */
export function buildHandoff(
  scribe: Scribe,
  session: SessionRecordExtended,
  fileChanges: FileChange[],
): HandoffPackage {
  const summary = scribe.getSummary();
  const observations = scribe.getObservations();

  // Extract completed/remaining from scribe observations
  const completedWork = observations
    .filter(o => o.kind === "progress")
    .map(o => o.content);

  const importantDecisions = observations
    .filter(o => o.kind === "decision")
    .map(o => o.content);

  const blockers = observations
    .filter(o => o.kind === "blocker")
    .map(o => o.content);

  return {
    sessionId: session.id,
    taskCardId: session.taskCardId,
    summary,
    completedWork,
    remainingWork: [], // Populated externally via addRemainingWork
    filesModified: fileChanges,
    importantDecisions,
    blockers,
    cavememObservations: observations.map(o => o.id),
    nextSessionContext: scribe.finalizeHandoff().then(h => h.nextSessionContext).catch(() => "") as unknown as string,
  };
}
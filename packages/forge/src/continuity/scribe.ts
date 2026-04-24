/**
 * Scribe — Observes agent sessions and compresses key information
 * into caveman-grammar observations for cross-session continuity.
 *
 * The Scribe does NOT participate in conversation — it watches and records.
 */
import { randomUUID } from "node:crypto";
import type { TaskCard, HandoffPackage, FileChange } from "../types.js";
import type { PrecisionItem } from "@tekton/core";

// ── Scribe Config ──────────────────────────────────────────────────────────

export interface ScribeConfig {
  id: string;
  observes: string[];
  model: string;
}

// ── Message observation ────────────────────────────────────────────────────

export interface AgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

export interface Observation {
  id: string;
  taskId: string;
  sessionId: string;
  kind: "decision" | "pattern" | "file-change" | "progress" | "blocker";
  content: string;
  timestamp: number;
}

// ── Cavemem Bridge Interface ───────────────────────────────────────────────

export interface CavememStore {
  storeObservation(text: string, metadata: { projectId: string; taskCardId: string; role: string; sessionNum: number }): string;
  searchMemory(query: string, projectId?: string): Promise<Array<{ id: string; content: string; relevance: number }>>;
  getTimeline(taskCardId: string): Promise<Observation[]>;
  exportForHandoff(sessionId: string): Promise<Observation[]>;
}

// ── File Tracker Interface ─────────────────────────────────────────────────

export interface FileChangeTracker {
  getChanges(): FileChange[];
  recordChange(path: string, action: "created" | "modified" | "deleted", agentRole: string): void;
}

// ── Scribe ─────────────────────────────────────────────────────────────────

export class Scribe {
  readonly config: ScribeConfig;
  private cavemem: CavememStore;
  private observations: Observation[] = [];
  private sessionSummary = "";
  private completedWork: string[] = [];
  private remainingWork: string[] = [];
  private keyDecisions: string[] = [];
  private blockers: string[] = [];
  private fileChanges: FileChange[] = [];
  private fileTracker?: FileChangeTracker;
  private projectId = "";
  private sessionNum = 0;
  private sessionId = "";
  private messageCount = 0;
  private precisionItems: PrecisionItem[] = [];

  constructor(config: ScribeConfig, cavemem: CavememStore) {
    this.config = config;
    this.cavemem = cavemem;
  }

  /** Set the file tracker for this scribe */
  setFileTracker(tracker: FileChangeTracker): void {
    this.fileTracker = tracker;
  }

  /**
   * Start observing a session.
   * Registers callbacks to track messages without participating.
   */
  observeSession(sessionId: string, taskCard: TaskCard, projectId: string, sessionNum: number): void {
    this.sessionId = sessionId;
    this.projectId = projectId;
    this.sessionNum = sessionNum;
    this.observations = [];
    this.sessionSummary = "";
    this.completedWork = [];
    this.remainingWork = [];
    this.keyDecisions = [];
    this.blockers = [];
    this.fileChanges = [];
    this.messageCount = 0;
  }

  /**
   * Process a single agent message.
   * Extracts key decisions, code patterns, file changes, and progress notes.
   * Compresses using caveman grammar (short, stripped language).
   */
  async processMessage(msg: AgentMessage): Promise<Observation | null> {
    this.messageCount++;
    const content = msg.content;
    if (!content || content.trim().length === 0) return null;

    const extracted = this.extractInformation(content);
    if (!extracted) return null;

    const obs: Observation = {
      id: randomUUID().slice(0, 12),
      taskId: this.sessionId ? `${this.sessionId}-task` : "unknown",
      sessionId: this.sessionId,
      kind: extracted.kind,
      content: this.compress(extracted.content),
      timestamp: Date.now(),
    };

    // Track by category
    switch (extracted.kind) {
      case "decision":
        this.keyDecisions.push(extracted.content);
        break;
      case "progress":
        this.completedWork.push(extracted.content);
        break;
      case "blocker":
        this.blockers.push(extracted.content);
        break;
      case "file-change":
        // File changes are tracked separately
        break;
      case "pattern":
        // Code patterns noted but not separately tracked
        break;
    }

    // Store via cavemem bridge
    try {
      const cavememId = this.cavemem.storeObservation(obs.content, {
        projectId: this.projectId,
        taskCardId: this.sessionId,
        role: this.config.id,
        sessionNum: this.sessionNum,
      });
      obs.id = cavememId || obs.id;
    } catch {
      // Cavemem unavailable — continue with local tracking only
    }

    this.observations.push(obs);
    return obs;
  }

  /**
   * Finalize the handoff package when a session ends.
   */
  async finalizeHandoff(): Promise<HandoffPackage> {
    // Build session summary
    this.sessionSummary = this.buildSummary();

    // Collect file changes
    if (this.fileTracker) {
      this.fileChanges = this.fileTracker.getChanges();
    }

    // Build next session context
    const nextContext = this.formatNextSessionContext();

    const handoff: HandoffPackage = {
      sessionId: this.sessionId,
      taskCardId: this.sessionId, // Maps to the task being worked on
      summary: this.sessionSummary,
      completedWork: [...this.completedWork],
      remainingWork: [...this.remainingWork],
      filesModified: [...this.fileChanges],
      importantDecisions: [...this.keyDecisions],
      blockers: [...this.blockers],
      cavememObservations: this.observations.map(o => o.id),
      precisionItems: [...this.precisionItems],
      nextSessionContext: nextContext,
    };

    return handoff;
  }

  /** Get all observations collected so far */
  getObservations(): Observation[] {
    return [...this.observations];
  }

  /** Set precision items from a Context Engineer (for handoff). */
  setPrecisionItems(items: PrecisionItem[]): void {
    this.precisionItems = items;
  }

  /** Get the running session summary */
  getSummary(): string {
    return this.sessionSummary || this.buildSummary();
  }

  /** Add remaining work item (from external source) */
  addRemainingWork(item: string): void {
    this.remainingWork.push(item);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private extractInformation(content: string): { kind: Observation["kind"]; content: string } | null {
    const lower = content.toLowerCase();

    // Detect decisions
    if (lower.includes("decided") || lower.includes("chose") || lower.includes("went with") ||
        lower.includes("let's use") || lower.includes("i'll use") || lower.includes("we'll use")) {
      return { kind: "decision", content: content.slice(0, 500) };
    }

    // Detect progress/completion
    if (lower.includes("completed") || lower.includes("done with") || lower.includes("finished") ||
        lower.includes("implemented") || lower.includes("created") || lower.includes("wrote") ||
        lower.includes("built") || lower.includes("added")) {
      return { kind: "progress", content: content.slice(0, 500) };
    }

    // Detect blockers
    if (lower.includes("blocked") || lower.includes("stuck") || lower.includes("can't") ||
        lower.includes("failed") || lower.includes("error") || lower.includes("issue")) {
      return { kind: "blocker", content: content.slice(0, 500) };
    }

    // Detect file changes
    if (lower.includes("wrote file") || lower.includes("created file") || lower.includes("modified file") ||
        lower.includes("saved to") || (lower.includes("file") && (lower.includes("created") || lower.includes("updated")))) {
      return { kind: "file-change", content: content.slice(0, 500) };
    }

    // Detect code patterns
    if (lower.includes("pattern") || lower.includes("approach") || lower.includes("architecture") ||
        lower.includes("design") || lower.includes("structure")) {
      return { kind: "pattern", content: content.slice(0, 500) };
    }

    // Extract significant content from longer messages
    if (content.length > 200) {
      return { kind: "progress", content: content.slice(0, 500) };
    }

    return null;
  }

  /**
   * Compress text using caveman grammar.
   * Short, stripped language preserving key information.
   */
  private compress(text: string): string {
    // Remove filler words
    let compressed = text
      .replace(/\b(I|we|the|a|an|is|are|was|were|been|being|have|has|had|do|does|did|will|would|could|should|might|shall|can|may)\b/gi, "")
      .replace(/\s+/g, " ")
      .replace(/\b(basically|actually|really|just|quite|very|extremely|significantly|essentially|essentially)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // Truncate to max 300 chars
    if (compressed.length > 300) {
      compressed = compressed.slice(0, 297) + "...";
    }

    return compressed;
  }

  private buildSummary(): string {
    const parts: string[] = [];

    if (this.completedWork.length > 0) {
      parts.push(`Completed: ${this.completedWork.join("; ")}`);
    }
    if (this.keyDecisions.length > 0) {
      parts.push(`Decisions: ${this.keyDecisions.join("; ")}`);
    }
    if (this.blockers.length > 0) {
      parts.push(`Blocked on: ${this.blockers.join("; ")}`);
    }
    if (this.remainingWork.length > 0) {
      parts.push(`Remaining: ${this.remainingWork.join("; ")}`);
    }

    // Compress the summary
    const raw = parts.join(". ") || "Session in progress.";
    return this.compress(raw);
  }

  private formatNextSessionContext(): string {
    const sections: string[] = [];

    sections.push("## Previous Session Summary");
    sections.push(this.sessionSummary || this.buildSummary());

    if (this.completedWork.length > 0) {
      sections.push("\n## Completed");
      for (const item of this.completedWork) {
        sections.push(`- ${item}`);
      }
    }

    if (this.remainingWork.length > 0) {
      sections.push("\n## Remaining Work");
      for (const item of this.remainingWork) {
        sections.push(`- ${item}`);
      }
    }

    if (this.keyDecisions.length > 0) {
      sections.push("\n## Key Decisions");
      for (const decision of this.keyDecisions) {
        sections.push(`- ${decision}`);
      }
    }

    if (this.fileChanges.length > 0) {
      sections.push("\n## Files Modified");
      for (const fc of this.fileChanges) {
        sections.push(`- ${fc.action}: ${fc.path}`);
      }
    }

    sections.push("\nContinue from where the previous session left off.");

    return sections.join("\n");
  }
}
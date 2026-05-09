/**
 * Swarm Memory — Worker profile memory, context carry-over, and skill assignments.
 *
 * Provides persistent memory for workers so they can:
 * - Remember patterns from past briefs (what worked, what didn't)
 * - Carry context over between missions
 * - Track learned skills and capability growth
 * - Store worker-specific preferences and notes
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { randomUUID } from "node:crypto";

// ── Types ───────────────────────────────────────────────────────────────

export interface WorkerMemory {
  /** Worker ID this memory belongs to */
  workerId: string;
  /** Timestamps of past brief completions */
  completions: MemoryEntry[];
  /** Timestamps of past brief failures */
  failures: MemoryEntry[];
  /** Learned patterns: what approaches worked for what task types */
  patterns: LearnedPattern[];
  /** Worker's accumulated skill scores */
  skills: Record<string, SkillScore>;
  /** Worker-specific preferences/notes */
  notes: string;
  /** Total tokens consumed */
  tokensUsed: number;
  /** Total briefs completed */
  totalCompleted: number;
  /** Total briefs failed */
  totalFailed: number;
  /** Average completion time in ms */
  avgCompletionMs: number;
  /** Last active timestamp */
  lastActiveAt: number;
  /** When this memory was created */
  createdAt: number;
  /** When this memory was last updated */
  updatedAt: number;
}

export interface MemoryEntry {
  /** Brief ID */
  briefId: string;
  /** Mission ID */
  missionId?: string;
  /** Brief goal/summary */
  goal: string;
  /** Task type tags */
  taskTypes: string[];
  /** Completion/failed timestamp */
  timestamp: number;
  /** Duration in ms (from assignment to completion) */
  durationMs?: number;
  /** Files changed */
  filesChanged?: string[];
  /** Tokens consumed */
  tokensUsed?: number;
  /** Outcome notes */
  notes?: string;
}

export interface LearnedPattern {
  /** Pattern ID */
  id: string;
  /** Task type this pattern applies to */
  taskType: string;
  /** The approach/strategy description */
  approach: string;
  /** How many times this pattern was used */
  useCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average tokens consumed when using this approach */
  avgTokens: number;
  /** When last used */
  lastUsedAt: number;
}

export interface SkillScore {
  /** Skill name */
  name: string;
  /** Proficiency level 0-100 */
  level: number;
  /** Number of times exercised */
  exercises: number;
  /** Last exercised timestamp */
  lastExercisedAt: number;
}

export type WorkerSkillAssignment = {
  workerId: string;
  assignedSkills: string[];
  skillOverrides?: Record<string, SkillScore>;
};

// ── Defaults ────────────────────────────────────────────────────────────

function createEmptyMemory(workerId: string): WorkerMemory {
  const now = Date.now();
  return {
    workerId,
    completions: [],
    failures: [],
    patterns: [],
    skills: {},
    notes: "",
    tokensUsed: 0,
    totalCompleted: 0,
    totalFailed: 0,
    avgCompletionMs: 0,
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

// ── Swarm Memory Manager ──────────────────────────────────────────────

export class SwarmMemoryManager {
  private memories: Map<string, WorkerMemory> = new Map();
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || resolve(process.cwd(), ".tekton", "swarm-memory");
  }

  private ensureDir(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /** Get or create memory for a worker */
  getMemory(workerId: string): WorkerMemory {
    // Try in-memory first
    let mem = this.memories.get(workerId);
    if (mem) return mem;

    // Try loading from disk
    mem = this.loadFromDisk(workerId) ?? undefined;
    if (mem) {
      this.memories.set(workerId, mem);
      return mem;
    }

    // Create new
    mem = createEmptyMemory(workerId);
    this.memories.set(workerId, mem);
    return mem;
  }

  /** Record a brief completion */
  recordCompletion(workerId: string, entry: Omit<MemoryEntry, "timestamp">): WorkerMemory {
    const mem = this.getMemory(workerId);
    const fullEntry: MemoryEntry = { ...entry, timestamp: Date.now() };
    mem.completions.push(fullEntry);
    mem.totalCompleted++;
    if (entry.durationMs) {
      const total = mem.avgCompletionMs * (mem.totalCompleted - 1) + entry.durationMs;
      mem.avgCompletionMs = total / mem.totalCompleted;
    }
    if (entry.tokensUsed) mem.tokensUsed += entry.tokensUsed;
    mem.lastActiveAt = Date.now();
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** Record a brief failure */
  recordFailure(workerId: string, entry: Omit<MemoryEntry, "timestamp">): WorkerMemory {
    const mem = this.getMemory(workerId);
    const fullEntry: MemoryEntry = { ...entry, timestamp: Date.now() };
    mem.failures.push(fullEntry);
    mem.totalFailed++;
    mem.lastActiveAt = Date.now();
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** Learn a pattern from a successful or failed approach */
  learnPattern(
    workerId: string,
    taskType: string,
    approach: string,
    success: boolean,
    tokensUsed?: number
  ): WorkerMemory {
    const mem = this.getMemory(workerId);
    const existing = mem.patterns.find(
      (p) => p.taskType === taskType && p.approach === approach
    );
    if (existing) {
      existing.useCount++;
      const successes = Math.round(existing.successRate * (existing.useCount - 1)) + (success ? 1 : 0);
      existing.successRate = successes / existing.useCount;
      if (tokensUsed) existing.avgTokens = (existing.avgTokens * (existing.useCount - 1) + tokensUsed) / existing.useCount;
      existing.lastUsedAt = Date.now();
    } else {
      mem.patterns.push({
        id: `pattern-${randomUUID().slice(0, 8)}`,
        taskType,
        approach,
        useCount: 1,
        successRate: success ? 1 : 0,
        avgTokens: tokensUsed || 0,
        lastUsedAt: Date.now(),
      });
    }
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** Get best patterns for a task type */
  getBestPatterns(workerId: string, taskType: string, limit: number = 3): LearnedPattern[] {
    const mem = this.getMemory(workerId);
    return mem.patterns
      .filter((p) => p.taskType === taskType)
      .sort((a, b) => b.successRate - a.successRate || b.useCount - a.useCount)
      .slice(0, limit);
  }

  /** Exercise a skill (increment count, update level) */
  exerciseSkill(workerId: string, skillName: string): WorkerMemory {
    const mem = this.getMemory(workerId);
    if (mem.skills[skillName]) {
      mem.skills[skillName].exercises++;
      // Level formula: 10 base + min(90, exercises * 5) with diminishing returns
      mem.skills[skillName].level = Math.min(100, 10 + Math.floor(Math.sqrt(mem.skills[skillName].exercises) * 15));
      mem.skills[skillName].lastExercisedAt = Date.now();
    } else {
      mem.skills[skillName] = {
        name: skillName,
        level: 15,
        exercises: 1,
        lastExercisedAt: Date.now(),
      };
    }
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** Add or update a skill score */
  setSkill(workerId: string, skillName: string, score: Partial<SkillScore>): WorkerMemory {
    const mem = this.getMemory(workerId);
    if (mem.skills[skillName]) {
      Object.assign(mem.skills[skillName], score);
    } else {
      mem.skills[skillName] = {
        name: skillName,
        level: score.level ?? 10,
        exercises: score.exercises ?? 0,
        lastExercisedAt: Date.now(),
        ...score,
      };
    }
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** Assign skills to a worker */
  assignSkills(workerId: string, skills: string[]): WorkerMemory {
    const mem = this.getMemory(workerId);
    for (const skill of skills) {
      if (!mem.skills[skill]) {
        mem.skills[skill] = {
          name: skill,
          level: 10,
          exercises: 0,
          lastExercisedAt: Date.now(),
        };
      }
    }
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** Remove a skill from a worker */
  removeSkill(workerId: string, skillName: string): boolean {
    const mem = this.getMemory(workerId);
    if (!mem.skills[skillName]) return false;
    delete mem.skills[skillName];
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return true;
  }

  /** Update worker notes */
  setNotes(workerId: string, notes: string): WorkerMemory {
    const mem = this.getMemory(workerId);
    mem.notes = notes;
    mem.updatedAt = Date.now();
    this.saveToDisk(workerId);
    return mem;
  }

  /** List all worker IDs with memory */
  listWorkers(): string[] {
    this.ensureDir();
    try {
      const files = readdirSync(this.dataDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const id = file.replace(".json", "");
          if (!this.memories.has(id)) this.getMemory(id);
        }
      }
    } catch {
      // Directory may not exist yet
    }
    return Array.from(this.memories.keys());
  }

  /** Get a summary of all worker memories */
  getSummary(): Array<{
    workerId: string;
    totalCompleted: number;
    totalFailed: number;
    skillCount: number;
    patternCount: number;
    lastActiveAt: number;
  }> {
    return this.listWorkers().map((id) => {
      const mem = this.getMemory(id);
      return {
        workerId: id,
        totalCompleted: mem.totalCompleted,
        totalFailed: mem.totalFailed,
        skillCount: Object.keys(mem.skills).length,
        patternCount: mem.patterns.length,
        lastActiveAt: mem.lastActiveAt,
      };
    });
  }

  /** Delete a worker's memory */
  deleteMemory(workerId: string): boolean {
    this.memories.delete(workerId);
    const filePath = resolve(this.dataDir, `${workerId}.json`);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return true;
  }

  // ── Persistence ─────────────────────────────────────────────────

  private loadFromDisk(workerId: string): WorkerMemory | null {
    const filePath = resolve(this.dataDir, `${workerId}.json`);
    if (!existsSync(filePath)) return null;
    try {
      const raw = readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as WorkerMemory;
    } catch {
      return null;
    }
  }

  private saveToDisk(workerId: string): void {
    this.ensureDir();
    const mem = this.memories.get(workerId);
    if (!mem) return;
    const filePath = resolve(this.dataDir, `${workerId}.json`);
    try {
      writeFileSync(filePath, JSON.stringify(mem, null, 2), "utf-8");
    } catch {
      // Silently fail — memory is still in-memory
    }
  }
}
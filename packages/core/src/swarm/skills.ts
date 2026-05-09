/**
 * Swarm Skills — Worker skill assignments, discovery, and recommendations.
 *
 * Manages the skill registry, per-worker skill assignments,
 * and provides recommendations for which worker should handle
 * a given task based on skill matching.
 */
import type { WorkerConfig, WorkerRole } from "./types.js";
import { SwarmMemoryManager } from "./memory.js";
import type { SkillScore } from "./memory.js";

// ── Types ───────────────────────────────────────────────────────────────

export interface SkillDefinition {
  /** Unique skill ID (e.g., "swarm-orchestrator", "code-review") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Short description */
  description: string;
  /** Which roles typically have this skill */
  roles: WorkerRole[];
  /** Categories this skill belongs to */
  categories: string[];
  /** Prerequisites (skill IDs) */
  prerequisites?: string[];
  /** Whether this skill is available by default */
  builtIn: boolean;
}

export interface SkillRecommendation {
  /** Worker ID */
  workerId: string;
  /** Worker name */
  workerName: string;
  /** Skill match score (0-1) */
  score: number;
  /** Matched skills */
  matchedSkills: string[];
  /** Missing skills */
  missingSkills: string[];
}

// ── Built-in Skills ────────────────────────────────────────────────────

const BUILT_IN_SKILLS: SkillDefinition[] = [
  { id: "swarm-orchestrator", name: "Orchestrator", description: "Task decomposition and worker coordination", roles: ["orchestrator"], categories: ["coordination", "management"], builtIn: true },
  { id: "swarm-worker-core", name: "Worker Core", description: "Core worker protocol: accept briefs, send checkpoints", roles: ["builder", "reviewer", "researcher", "scribe", "ops", "lab", "triage", "qa"], categories: ["protocol"], builtIn: true },
  { id: "swarm-pr-worker", name: "PR Worker", description: "Pull request processing and review", roles: ["reviewer"], categories: ["review", "git"], builtIn: true },
  { id: "code-editing", name: "Code Editing", description: "Read, write, and modify code files", roles: ["builder", "reviewer"], categories: ["code"], builtIn: true },
  { id: "code-review", name: "Code Review", description: "Review code for quality, bugs, and style", roles: ["reviewer", "qa"], categories: ["code", "quality"], builtIn: true },
  { id: "research", name: "Research", description: "Web search, documentation lookup, synthesis", roles: ["researcher"], categories: ["research", "information"], builtIn: true },
  { id: "documentation", name: "Documentation", description: "Write and maintain documentation", roles: ["scribe"], categories: ["writing", "docs"], builtIn: true },
  { id: "testing", name: "Testing", description: "Write and run tests, verify behavior", roles: ["qa", "builder", "reviewer"], categories: ["quality", "verification"], builtIn: true },
  { id: "devops", name: "DevOps", description: "Deploy, monitor, and maintain infrastructure", roles: ["ops"], categories: ["infrastructure", "deployment"], builtIn: true },
  { id: "triage", name: "Triage", description: "Classify, prioritize, and route issues", roles: ["triage"], categories: ["management", "routing"], builtIn: true },
  { id: "experimentation", name: "Experimentation", description: "Run benchmarks, A/B tests, explorations", roles: ["lab"], categories: ["research", "validation"], builtIn: true },
];

// ── Skill Manager ───────────────────────────────────────────────────────

export class SwarmSkillManager {
  private skills: Map<string, SkillDefinition> = new Map();
  private memory: SwarmMemoryManager;

  constructor(memory?: SwarmMemoryManager) {
    this.memory = memory || new SwarmMemoryManager();

    // Load built-in skills
    for (const skill of BUILT_IN_SKILLS) {
      this.skills.set(skill.id, skill);
    }
  }

  /** Register a new skill */
  registerSkill(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  /** Get a skill definition */
  getSkill(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  /** List all registered skills */
  listSkills(category?: string): SkillDefinition[] {
    const all = Array.from(this.skills.values());
    if (category) return all.filter((s) => s.categories.includes(category));
    return all;
  }

  /** Get skills suitable for a role */
  getSkillsForRole(role: WorkerRole): SkillDefinition[] {
    return Array.from(this.skills.values()).filter((s) => s.roles.includes(role));
  }

  /** Assign skills to a worker, also updating memory */
  assignSkillsToWorker(workerId: string, skillIds: string[]): void {
    const validSkills = skillIds.filter((id) => this.skills.has(id));
    this.memory.assignSkills(workerId, validSkills);
  }

  /** Remove a skill from a worker */
  removeSkillFromWorker(workerId: string, skillId: string): boolean {
    return this.memory.removeSkill(workerId, skillId);
  }

  /** Get worker's skills with scores */
  getWorkerSkills(workerId: string): Record<string, SkillScore> {
    return this.memory.getMemory(workerId).skills;
  }

  /** Recommend the best worker for a task */
  recommendWorkers(
    taskTypes: string[],
    workers: WorkerConfig[],
    limit: number = 3
  ): SkillRecommendation[] {
    const scored: SkillRecommendation[] = [];

    for (const worker of workers) {
      const mem = this.memory.getMemory(worker.id);
      const workerSkillIds = new Set(Object.keys(mem.skills));

      // Calculate match score
      let matchedSkills: string[] = [];
      let missingSkills: string[] = [];

      // Check against task type categories
      for (const taskType of taskTypes) {
        const relevantSkills = Array.from(this.skills.values()).filter(
          (s) => s.categories.includes(taskType) || s.id.includes(taskType)
        );

        for (const skill of relevantSkills) {
          if (workerSkillIds.has(skill.id) || worker.skills.includes(skill.id)) {
            matchedSkills.push(skill.id);
          } else if (skill.roles.includes(worker.role)) {
            // Role match but not explicitly skilled — partial score
            missingSkills.push(skill.id);
          }
        }
      }

      // Remove duplicates
      matchedSkills = [...new Set(matchedSkills)];
      missingSkills = [...new Set(missingSkills)];

      // Score: matched skills / total relevant + role bonus + experience bonus
      const totalRelevant = matchedSkills.length + missingSkills.length;
      const matchRatio = totalRelevant > 0 ? matchedSkills.length / totalRelevant : 0;
      const roleBonus = matchedSkills.length > 0 ? 0.1 : 0;
      const experienceBonus = mem.totalCompleted > 0 ? Math.min(0.2, mem.totalCompleted * 0.01) : 0;
      const score = Math.min(1, matchRatio + roleBonus + experienceBonus);

      scored.push({
        workerId: worker.id,
        workerName: worker.name,
        score,
        matchedSkills,
        missingSkills,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /** Get prerequisite chain for a skill */
  getPrerequisiteChain(skillId: string): SkillDefinition[] {
    const chain: SkillDefinition[] = [];
    let current = this.skills.get(skillId);
    while (current?.prerequisites?.length) {
      for (const prereq of current.prerequisites) {
        const prereqSkill = this.skills.get(prereq);
        if (prereqSkill && !chain.find((s) => s.id === prereqSkill.id)) {
          chain.push(prereqSkill);
        }
      }
      // Only follow first depth for simplicity
      if (current.prerequisites[0]) {
        current = this.skills.get(current.prerequisites[0]);
      } else {
        break;
      }
    }
    return chain.reverse();
  }

  /** Check if a worker has all prerequisites for a skill */
  hasPrerequisites(workerId: string, skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill?.prerequisites?.length) return true;

    const mem = this.memory.getMemory(workerId);
    const workerSkills = new Set(Object.keys(mem.skills));

    return skill.prerequisites.every((prereq) => workerSkills.has(prereq));
  }
}

// ── Singleton ──────────────────────────────────────────────────────────

let _skillManager: SwarmSkillManager | null = null;

export function getSwarmSkillManager(): SwarmSkillManager {
  if (!_skillManager) {
    _skillManager = new SwarmSkillManager();
  }
  return _skillManager;
}
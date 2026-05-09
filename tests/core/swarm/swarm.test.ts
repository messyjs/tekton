/**
 * Unit tests for Swarm module — Roster, Dispatcher, Checkpoints.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SwarmRosterManager,
  SwarmDispatcher,
  SwarmCheckpointValidator,
  RequireProof,
  RequireBlockerDetail,
  requiresApproval,
  createApprovalCheckpoint,
} from "@tekton/core";
import { SwarmMemoryManager } from "@tekton/core/swarm/memory";
import { SwarmSkillManager, getSwarmSkillManager } from "@tekton/core/swarm/skills";
import type {
  WorkerConfig,
  SwarmCheckpoint,
  SwarmRoster,
  SkillDefinition,
} from "@tekton/core";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const TEST_WORKERS: WorkerConfig[] = [
  {
    id: "swarm1", name: "Orchestrator", role: "orchestrator",
    specialty: "task decomposition", mission: "Coordinate the swarm.",
    skills: ["swarm-orchestrator"], capabilities: { orchestration: true },
    preferredTaskTypes: ["orchestration"], maxConcurrentTasks: 4,
    acceptsBroadcast: true, reviewRequired: false,
  },
  {
    id: "swarm2", name: "Builder", role: "builder",
    specialty: "full-stack implementation", mission: "Ship focused product slices.",
    skills: ["swarm-worker-core"], capabilities: { codeEditing: true },
    preferredTaskTypes: ["implementation", "feature"], maxConcurrentTasks: 1,
    acceptsBroadcast: true, reviewRequired: false,
  },
  {
    id: "swarm3", name: "Reviewer", role: "reviewer",
    specialty: "code review", mission: "Catch breakage before it ships.",
    skills: ["swarm-pr-worker"], capabilities: { codeReview: true },
    preferredTaskTypes: ["review", "qa"], maxConcurrentTasks: 1,
    acceptsBroadcast: true, reviewRequired: false,
  },
];

const TEST_ROSTER: SwarmRoster = { version: 1, workers: TEST_WORKERS };

describe("SwarmRosterManager", () => {
  let roster: SwarmRosterManager;

  beforeEach(() => {
    roster = new SwarmRosterManager(TEST_ROSTER);
  });

  it("loads worker configs", () => {
    const workers = roster.getWorkers();
    expect(workers).toHaveLength(3);
    expect(workers[0].id).toBe("swarm1");
    expect(workers[0].role).toBe("orchestrator");
  });

  it("initializes runtimes as offline", () => {
    const runtimes = roster.getRuntimes();
    expect(runtimes).toHaveLength(3);
    expect(runtimes.every(r => r.state === "offline")).toBe(true);
  });

  it("finds workers by role", () => {
    const builders = roster.getByRole("builder");
    expect(builders).toHaveLength(1);
    expect(builders[0].id).toBe("swarm2");
  });

  it("marks workers as idle", () => {
    roster.markIdle("swarm2");
    const rt = roster.getRuntime("swarm2");
    expect(rt?.state).toBe("idle");
    expect(rt?.lastCheckIn).toBeGreaterThan(0);
  });

  it("finds idle workers", () => {
    roster.markIdle("swarm2");
    roster.markIdle("swarm3");
    const idle = roster.getIdleWorkers();
    expect(idle).toHaveLength(2);
  });

  it("finds best worker for a role", () => {
    roster.markIdle("swarm2");
    const worker = roster.findBestWorker("builder");
    expect(worker?.id).toBe("swarm2");
  });

  it("finds best worker by task type", () => {
    roster.markIdle("swarm3");
    const worker = roster.findBestWorker(undefined, "review");
    expect(worker?.id).toBe("swarm3");
  });

  it("creates briefs", () => {
    const brief = roster.createBrief({
      workerId: "swarm2",
      project: "test-project",
      goal: "Build the auth feature",
    });
    expect(brief.id).toMatch(/^brief-/);
    expect(brief.workerId).toBe("swarm2");
    expect(brief.goal).toBe("Build the auth feature");
    expect(brief.state).toBe("pending");
  });

  it("updates brief state", () => {
    const brief = roster.createBrief({
      workerId: "swarm2",
      project: "test",
      goal: "test goal",
    });
    roster.updateBriefState(brief.id, "completed");
    expect(roster.getBrief(brief.id)?.state).toBe("completed");
  });

  it("adds and removes workers", () => {
    const newWorker: WorkerConfig = {
      id: "swarm99", name: "New", role: "lab",
      specialty: "experiments", mission: "Explore fast.",
      skills: [], capabilities: {}, preferredTaskTypes: [],
      maxConcurrentTasks: 1, acceptsBroadcast: false, reviewRequired: false,
    };
    roster.addWorker(newWorker);
    expect(roster.getWorkers()).toHaveLength(4);

    roster.removeWorker("swarm99");
    expect(roster.getWorkers()).toHaveLength(3);
  });

  it("reports health", () => {
    roster.markIdle("swarm1");
    roster.markIdle("swarm2");
    roster.markBusy("swarm3", "brief-1", "Code review");

    const health = roster.getHealth();
    expect(health.totalWorkers).toBe(3);
    expect(health.onlineWorkers).toBe(3);
    expect(health.idleWorkers).toBe(2);
    expect(health.busyWorkers).toBe(1);
  });

  it("emits events on worker lifecycle", () => {
    const events: any[] = [];
    roster.onEvent(e => events.push(e));

    roster.spawnWorker("swarm1");
    roster.markIdle("swarm1");
    roster.killWorker("swarm1", "test");

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("worker_spawned");
    expect(events[1].type).toBe("worker_state_changed");
    expect(events[2].type).toBe("worker_killed");
  });
});

describe("SwarmDispatcher", () => {
  let roster: SwarmRosterManager;
  let dispatcher: SwarmDispatcher;

  beforeEach(() => {
    roster = new SwarmRosterManager(TEST_ROSTER);
    dispatcher = new SwarmDispatcher(roster);
    // Mark all workers as idle so they can accept work
    for (const w of TEST_WORKERS) {
      roster.markIdle(w.id);
    }
  });

  it("creates a mission from intent", () => {
    const mission = dispatcher.createMission("Build authentication feature");
    expect(mission.id).toMatch(/^mission-/);
    expect(mission.intent).toBe("Build authentication feature");
    expect(mission.state).not.toBe("decomposing");
    expect(mission.briefs.length).toBeGreaterThanOrEqual(1);
  });

  it("dispatches work to specific worker", () => {
    const result = dispatcher.dispatch({
      intent: "Fix the login bug",
      workerId: "swarm2",
    });
    expect(result.missionId).toBeDefined();
    expect(result.dispatchedTo).toContain("swarm2");
    expect(result.autoAssigned).toBe(false);
  });

  it("dispatches work by role", () => {
    const result = dispatcher.dispatch({
      intent: "Review PR #42",
      role: "reviewer",
    });
    expect(result.missionId).toBeDefined();
    expect(result.autoAssigned).toBe(true);
  });

  it("receives DONE checkpoint and completes brief", () => {
    const mission = dispatcher.dispatch({
      intent: "Build feature",
      workerId: "swarm2",
    });
    const briefId = mission.briefs[0].id;

    const checkpoint: SwarmCheckpoint = {
      workerId: "swarm2",
      briefId,
      state: "DONE",
      filesChanged: ["src/auth.ts", "tests/auth.test.ts"],
      commandsRun: ["npm test", "npm run build"],
      proof: "All 15 tests pass. Build succeeds. Feature complete.",
      blocker: null,
      nextAction: "Ready for review.",
      timestamp: Date.now(),
    };

    const updated = dispatcher.receiveCheckpoint(checkpoint);
    expect(updated).toBeDefined();
    expect(roster.getBrief(briefId)?.state).toBe("completed");
    expect(roster.getRuntime("swarm2")?.state).toBe("idle");
  });

  it("receives BLOCKED checkpoint with validation failure", () => {
    const mission = dispatcher.dispatch({
      intent: "Build feature",
      workerId: "swarm2",
    });
    const briefId = mission.briefs[0].id;

    const checkpoint: SwarmCheckpoint = {
      workerId: "swarm2",
      briefId,
      state: "BLOCKED",
      filesChanged: [],
      commandsRun: [],
      proof: "",
      blocker: "unknown",
      nextAction: null,
      timestamp: Date.now(),
    };

    // The validator should catch vague blocker
    const validator = new SwarmCheckpointValidator(roster);
    const result = validator.validate(checkpoint);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("receives NEEDS_INPUT checkpoint and escalates", () => {
    const mission = dispatcher.dispatch({
      intent: "Build feature",
      workerId: "swarm2",
    });
    const briefId = mission.briefs[0].id;

    const events: any[] = [];
    dispatcher.onEvent(e => events.push(e));

    const checkpoint: SwarmCheckpoint = {
      workerId: "swarm2",
      briefId,
      state: "NEEDS_INPUT",
      filesChanged: [],
      commandsRun: [],
      proof: "Need clarification on auth scope.",
      blocker: "User must specify which OAuth providers to support.",
      nextAction: "Wait for user input on OAuth provider list.",
      timestamp: Date.now(),
    };

    dispatcher.receiveCheckpoint(checkpoint);
    expect(events.some(e => e.type === "escalation")).toBe(true);
  });

  it("requires approval for dangerous actions", () => {
    expect(requiresApproval("git_push_force")).toBe(true);
    expect(requiresApproval("npm_publish")).toBe(true);
    expect(requiresApproval("npm_install")).toBe(false);
    expect(requiresApproval("write_file")).toBe(false);
  });

  it("creates approval checkpoint for gatekept action", () => {
    const cp = createApprovalCheckpoint("swarm2", "brief-1", "git_push_force", "Force push to main branch");
    expect(cp.state).toBe("NEEDS_INPUT");
    expect(cp.blocker).toContain("git_push_force");
    expect(cp.blocker).toContain("human approval");
  });
});

describe("SwarmCheckpointValidator", () => {
  let validator: SwarmCheckpointValidator;
  let roster: SwarmRosterManager;

  beforeEach(() => {
    roster = new SwarmRosterManager(TEST_ROSTER);
    validator = new SwarmCheckpointValidator(roster);
  });

  it("accepts valid DONE checkpoint", () => {
    const cp: SwarmCheckpoint = {
      workerId: "swarm2",
      briefId: "brief-1",
      state: "DONE",
      filesChanged: ["src/feature.ts"],
      commandsRun: ["npm test"],
      proof: "All tests pass. Build succeeds.",
      blocker: null,
      nextAction: null,
      timestamp: Date.now(),
    };
    const result = validator.validate(cp);
    expect(result.valid).toBe(true);
  });

  it("rejects DONE checkpoint without proof", () => {
    const cp: SwarmCheckpoint = {
      workerId: "swarm2", briefId: "brief-1", state: "DONE",
      filesChanged: [], commandsRun: [], proof: "",
      blocker: null, nextAction: null, timestamp: Date.now(),
    };
    const result = validator.validate(cp);
    expect(result.valid).toBe(false);
  });

  it("rejects vague blocker descriptions", () => {
    const cp: SwarmCheckpoint = {
      workerId: "swarm2", briefId: "brief-1", state: "BLOCKED",
      filesChanged: [], commandsRun: [], proof: "stuck",
      blocker: "not working", nextAction: null, timestamp: Date.now(),
    };
    const result = validator.validate(cp);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes("vague") || i.includes("exact"))).toBe(true);
  });

  it("accepts specific blocker descriptions", () => {
    const cp: SwarmCheckpoint = {
      workerId: "swarm2", briefId: "brief-1", state: "BLOCKED",
      filesChanged: [], commandsRun: [],
      proof: "Cannot proceed — npm auth token missing for registry.npmjs.org",
      blocker: "npm auth token is missing; cannot publish package. Run npm login to fix.",
      nextAction: "Provide npm auth token or run npm login",
      timestamp: Date.now(),
    };
    const result = validator.validate(cp);
    expect(result.valid).toBe(true);
  });

  it("allows custom rules", () => {
    const noSwearingRule = {
      name: "no-swearing",
      states: ["DONE" as const],
      validate: (cp: SwarmCheckpoint) => cp.proof.includes("damn") ? ["No swearing in checkpoints"] : [],
    };
    validator.addRule(noSwearingRule);

    const badCp: SwarmCheckpoint = {
      workerId: "swarm2", briefId: "brief-1", state: "DONE",
      filesChanged: ["a.ts"], commandsRun: ["npm test"],
      proof: "This damn thing works.",
      blocker: null, nextAction: null, timestamp: Date.now(),
    };
    const result = validator.validate(badCp);
    expect(result.issues.some(i => i.includes("swearing"))).toBe(true);

    // Remove rule
    validator.removeRule("no-swearing");
    const result2 = validator.validate(badCp);
    expect(result2.issues.some(i => i.includes("swearing"))).toBe(false);
  });
});


describe("SwarmMemoryManager", () => {
  let mem: InstanceType<typeof SwarmMemoryManager>;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `swarm-mem-test-${Date.now()}`);
    mem = new SwarmMemoryManager(tmpDir);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
  });

  it("creates memory for a worker", () => {
    const m = mem.getMemory("swarm1");
    expect(m).toBeDefined();
    expect(m.workerId).toBe("swarm1");
    expect(m.completions).toHaveLength(0);
    expect(m.skills).toEqual({});
  });

  it("records a completion", () => {
    const m = mem.recordCompletion("swarm1", { briefId: "b1", goal: "Fix bug", taskTypes: ["bugfix"], durationMs: 5000 });
    expect(m.completions).toHaveLength(1);
    expect(m.totalCompleted).toBe(1);
    expect(m.completions[0].briefId).toBe("b1");
  });

  it("records a failure", () => {
    const m = mem.recordFailure("swarm1", { briefId: "b2", goal: "Broken task", taskTypes: ["feature"] });
    expect(m.failures).toHaveLength(1);
    expect(m.totalFailed).toBe(1);
  });

  it("learns a pattern", () => {
    mem.learnPattern("swarm1", "bugfix", "search-and-replace", true);
    const patterns = mem.getBestPatterns("swarm1", "bugfix");
    expect(patterns).toHaveLength(1);
    expect(patterns[0].approach).toBe("search-and-replace");
  });

  it("exercises a skill", () => {
    const m = mem.exerciseSkill("swarm1", "code-editing");
    expect(m.skills["code-editing"]).toBeDefined();
    expect(m.skills["code-editing"].exercises).toBe(1);
    mem.exerciseSkill("swarm1", "code-editing");
    expect(m.skills["code-editing"].exercises).toBe(2);
  });

  it("assigns skills", () => {
    const m = mem.assignSkills("swarm1", ["code-editing", "testing"]);
    expect(Object.keys(m.skills)).toHaveLength(2);
  });

  it("removes a skill", () => {
    mem.assignSkills("swarm1", ["code-editing"]);
    const removed = mem.removeSkill("swarm1", "code-editing");
    expect(removed).toBe(true);
    const m = mem.getMemory("swarm1");
    expect(Object.keys(m.skills)).toHaveLength(0);
  });

  it("sets notes", () => {
    const m = mem.setNotes("swarm1", "Prefers TypeScript");
    expect(m.notes).toBe("Prefers TypeScript");
  });

  it("persists to disk", () => {
    mem.recordCompletion("swarm1", { briefId: "b1", goal: "test", taskTypes: ["test"] });
    // Create a new manager to read from disk
    const mem2 = new SwarmMemoryManager(tmpDir);
    const m = mem2.getMemory("swarm1");
    expect(m.completions).toHaveLength(1);
  });

  it("lists workers", () => {
    mem.getMemory("swarm1");
    mem.getMemory("swarm2");
    const workers = mem.listWorkers();
    expect(workers).toContain("swarm1");
    expect(workers).toContain("swarm2");
  });

  it("deletes memory", () => {
    mem.getMemory("swarm1");
    const deleted = mem.deleteMemory("swarm1");
    expect(deleted).toBe(true);
  });

  it("gets summary", () => {
    mem.recordCompletion("swarm1", { briefId: "b1", goal: "test", taskTypes: ["test"] });
    const summary = mem.getSummary();
    expect(summary).toHaveLength(1);
    expect(summary[0].totalCompleted).toBe(1);
  });
});

// ── SwarmSkillManager Tests ────────────────────────────────────────────

describe("SwarmSkillManager", () => {
  let sm: InstanceType<typeof SwarmSkillManager>;

  beforeEach(() => {
    const memDir = path.join(os.tmpdir(), `swarm-skill-test-${Date.now()}`);
    const memory = new SwarmMemoryManager(memDir);
    sm = new SwarmSkillManager(memory);
  });

  it("has built-in skills", () => {
    const skills = sm.listSkills();
    expect(skills.length).toBeGreaterThan(5);
    expect(skills.find(s => s.id === "code-editing")).toBeDefined();
  });

  it("gets a skill by id", () => {
    const skill = sm.getSkill("code-editing");
    expect(skill).toBeDefined();
    expect(skill!.name).toBe("Code Editing");
  });

  it("filters skills by category", () => {
    const codeSkills = sm.listSkills("code");
    expect(codeSkills.length).toBeGreaterThan(0);
    codeSkills.forEach(s => expect(s.categories).toContain("code"));
  });

  it("gets skills for a role", () => {
    const builderSkills = sm.getSkillsForRole("builder");
    expect(builderSkills.length).toBeGreaterThan(0);
  });

  it("assigns skills to a worker", () => {
    sm.assignSkillsToWorker("swarm1", ["code-editing", "testing"]);
    const skills = sm.getWorkerSkills("swarm1");
    expect(skills["code-editing"]).toBeDefined();
    expect(skills["testing"]).toBeDefined();
  });

  it("removes a skill from a worker", () => {
    sm.assignSkillsToWorker("swarm1", ["code-editing"]);
    const removed = sm.removeSkillFromWorker("swarm1", "code-editing");
    expect(removed).toBe(true);
  });

  it("recommends workers for task types", () => {
    const workers = [
      { id: "swarm1", name: "Builder", role: "builder", specialty: "implementation", mission: "", skills: [], capabilities: {}, preferredTaskTypes: [], maxConcurrentTasks: 1, acceptsBroadcast: true, reviewRequired: false },
      { id: "swarm2", name: "Reviewer", role: "reviewer", specialty: "code review", mission: "", skills: [], capabilities: {}, preferredTaskTypes: [], maxConcurrentTasks: 1, acceptsBroadcast: true, reviewRequired: false },
    ];
    const recs = sm.recommendWorkers(["code"], workers, 2);
    expect(recs).toHaveLength(2);
    expect(recs[0].workerId).toBeDefined();
  });

  it("registers a custom skill", () => {
    const customSkill: SkillDefinition = {
      id: "custom-skill",
      name: "Custom Skill",
      description: "A custom skill",
      roles: ["builder"],
      categories: ["custom"],
      builtIn: false,
    };
    sm.registerSkill(customSkill);
    const skill = sm.getSkill("custom-skill");
    expect(skill).toBeDefined();
    expect(skill!.name).toBe("Custom Skill");
    expect(skill!.builtIn).toBe(false);
  });

  it("gets singleton via getSwarmSkillManager", () => {
    const manager = getSwarmSkillManager();
    expect(manager).toBeDefined();
    expect(manager.listSkills().length).toBeGreaterThan(0);
  });
});

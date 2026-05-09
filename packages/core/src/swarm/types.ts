/**
 * Swarm Types — Worker roles, missions, checkpoints, and dispatch.
 *
 * This is the data model layer. The swarm orchestrator in Hermes Workspace
 * uses a YAML-based roster with roles, missions, and persistent workers.
 * We adapt that model into TypeScript-native types for Tekton Agent.
 */

// ── Worker Identity ──────────────────────────────────────────────────

export type WorkerRole =
  | "orchestrator" | "builder" | "reviewer" | "researcher"
  | "scribe" | "ops" | "lab" | "triage" | "qa" | "overflow";

export type WorkerState = "offline" | "spawning" | "idle" | "busy" | "blocked" | "reviewing" | "error";

export interface WorkerCapabilities {
  codeEditing?: boolean;
  codeReview?: boolean;
  research?: boolean;
  documentation?: boolean;
  ops?: boolean;
  experiment?: boolean;
  triage?: boolean;
  testing?: boolean;
  orchestration?: boolean;
  [key: string]: boolean | undefined;
}

export interface WorkerConfig {
  /** Unique worker ID (e.g., "swarm1") */
  id: string;
  /** Display name (e.g., "Nova", "Pixel") */
  name: string;
  /** Worker role */
  role: WorkerRole;
  /** What this worker specializes in */
  specialty: string;
  /** One-line mission statement */
  mission: string;
  /** Model to use for this worker */
  model?: string;
  /** Skills this worker has */
  skills: string[];
  /** Capability flags */
  capabilities: WorkerCapabilities;
  /** Types of tasks this worker prefers */
  preferredTaskTypes: string[];
  /** Max concurrent tasks (default 1) */
  maxConcurrentTasks: number;
  /** Whether this worker accepts broadcast messages */
  acceptsBroadcast: boolean;
  /** Whether human review is required before this worker can ship */
  reviewRequired: boolean;
  /** Working directory */
  cwd?: string;
}

export interface WorkerRuntime {
  /** Worker ID */
  id: string;
  /** Current state */
  state: WorkerState;
  /** Worker role */
  role: WorkerRole;
  /** Current task brief, if any */
  currentTaskId: string | null;
  /** Current task description */
  currentTaskBrief: string | null;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Last check-in timestamp */
  lastCheckIn: number;
  /** Working directory */
  cwd: string;
  /** Task stats */
  tasksCompleted: number;
  tasksFailed: number;
  /** Token usage */
  tokensUsed: number;
  /** Process ID if running */
  pid?: number;
}

// ── SwarmBrief (mission definition) ──────────────────────────────────

export type BriefState = "pending" | "assigned" | "in_progress" | "checkpoint" | "completed" | "failed" | "cancelled";

export interface SwarmBrief {
  /** Unique brief ID */
  id: string;
  /** Worker this brief is assigned to */
  workerId: string;
  /** Project/context */
  project: string;
  /** One-line goal */
  goal: string;
  /** Why this task matters now */
  whyNow: string;
  /** Bounded scope items */
  scope: string[];
  /** Expected deliverables (file paths, URLs, etc.) */
  deliverables: string[];
  /** How to verify completion */
  testOrProof: string[];
  /** Hard constraints */
  constraints: string[];
  /** Budget in hours */
  budgetHours: number;
  /** When brief was created */
  createdAt: number;
  /** Brief state */
  state: BriefState;
  /** Priority */
  priority: "low" | "normal" | "high" | "critical";
}

// ── Checkpoint ────────────────────────────────────────────────────────

export type CheckpointState = "DONE" | "IN_PROGRESS" | "BLOCKED" | "NEEDS_INPUT" | "NEEDS_REVIEW" | "HANDOFF";

export interface SwarmCheckpoint {
  /** Worker ID that produced this checkpoint */
  workerId: string;
  /** Brief ID this checkpoint relates to */
  briefId: string;
  /** Checkpoint state */
  state: CheckpointState;
  /** Files changed (exact paths) */
  filesChanged: string[];
  /** Commands run (exact commands) */
  commandsRun: string[];
  /** Concrete result or proof */
  proof: string;
  /** Blocker description (if blocked) */
  blocker: string | null;
  /** Recommended next action */
  nextAction: string | null;
  /** Timestamp */
  timestamp: number;
}

// ── Mission ───────────────────────────────────────────────────────────

export type MissionState = "decomposing" | "assigned" | "running" | "reviewing" | "completed" | "failed";

export interface SwarmMission {
  /** Mission ID */
  id: string;
  /** User's original intent */
  intent: string;
  /** Mission state */
  state: MissionState;
  /** Decomposed briefs */
  briefs: SwarmBrief[];
  /** Checkpoints received */
  checkpoints: SwarmCheckpoint[];
  /** Created at */
  createdAt: number;
  /** Updated at */
  updatedAt: number;
  /** Created by orchestrator? */
  autoAssigned: boolean;
}

// ── Dispatch ──────────────────────────────────────────────────────────

export interface DispatchRequest {
  /** Mission intent */
  intent: string;
  /** Target worker (or "auto" for orchestrator to decide) */
  workerId?: string;
  /** Role to target */
  role?: WorkerRole;
  /** Priority */
  priority?: "low" | "normal" | "high" | "critical";
  /** Scope constraints */
  scope?: string[];
  /** Context */
  context?: string;
}

export interface DispatchResult {
  /** Mission ID */
  missionId: string;
  /** Briefs created */
  briefs: SwarmBrief[];
  /** Workers dispatched */
  dispatchedTo: string[];
  /** Whether auto-assignment was used */
  autoAssigned: boolean;
}

// ── Roster ────────────────────────────────────────────────────────────

export interface SwarmRoster {
  /** Roster version */
  version: number;
  /** Worker configs */
  workers: WorkerConfig[];
}

// ── Health ────────────────────────────────────────────────────────────

export interface SwarmHealth {
  totalWorkers: number;
  onlineWorkers: number;
  busyWorkers: number;
  idleWorkers: number;
  blockedWorkers: number;
  activeMissions: number;
  pendingBriefs: number;
  completedMissions: number;
}

// ── Events ────────────────────────────────────────────────────────────

export type SwarmEvent =
  | { type: "worker_spawned"; workerId: string; role: WorkerRole }
  | { type: "worker_killed"; workerId: string; reason: string }
  | { type: "worker_state_changed"; workerId: string; from: WorkerState; to: WorkerState }
  | { type: "brief_assigned"; briefId: string; workerId: string }
  | { type: "brief_completed"; briefId: string; workerId: string }
  | { type: "brief_blocked"; briefId: string; workerId: string; blocker: string }
  | { type: "checkpoint_received"; workerId: string; briefId: string; state: CheckpointState }
  | { type: "mission_created"; missionId: string; briefCount: number }
  | { type: "mission_completed"; missionId: string }
  | { type: "mission_failed"; missionId: string; error: string }
  | { type: "escalation"; workerId: string; briefId: string; reason: string }
  | { type: "broadcast"; from: string; message: string };

// ── Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_WORKER_CONFIG: Partial<WorkerConfig> = {
  maxConcurrentTasks: 1,
  acceptsBroadcast: true,
  reviewRequired: false,
  skills: [],
  capabilities: {},
  preferredTaskTypes: [],
};

export const DEFAULT_SWARM_ROSTER: SwarmRoster = {
  version: 1,
  workers: [
    {
      id: "swarm1",
      name: "Orchestrator",
      role: "orchestrator",
      specialty: "task decomposition and routing",
      mission: "Decompose user intent into SwarmBriefs and route to the right workers.",
      skills: ["swarm-orchestrator"],
      capabilities: { orchestration: true, codeEditing: true, research: true },
      preferredTaskTypes: ["orchestration", "coordination", "decomposition"],
      maxConcurrentTasks: 4,
      acceptsBroadcast: true,
      reviewRequired: false,
    },
    {
      id: "swarm2",
      name: "Builder",
      role: "builder",
      specialty: "full-stack implementation",
      mission: "Ship focused product slices with tests and clean diffs.",
      skills: ["swarm-worker-core"],
      capabilities: { codeEditing: true, testing: true, documentation: true },
      preferredTaskTypes: ["implementation", "feature", "bugfix", "refactor"],
      maxConcurrentTasks: 1,
      acceptsBroadcast: true,
      reviewRequired: false,
    },
    {
      id: "swarm3",
      name: "Reviewer",
      role: "reviewer",
      specialty: "code review, regression detection, quality gate",
      mission: "Catch breakage before it ships. Be the final quality gate.",
      skills: ["swarm-pr-worker", "swarm-worker-core"],
      capabilities: { codeReview: true, testing: true },
      preferredTaskTypes: ["review", "qa", "verification", "regression"],
      maxConcurrentTasks: 1,
      acceptsBroadcast: true,
      reviewRequired: false,
    },
    {
      id: "swarm4",
      name: "Researcher",
      role: "researcher",
      specialty: "AI/model research, technical synthesis",
      mission: "Produce decision-grade research so builders stay unblocked.",
      skills: ["swarm-worker-core"],
      capabilities: { research: true, documentation: true },
      preferredTaskTypes: ["research", "analysis", "benchmark", "options"],
      maxConcurrentTasks: 1,
      acceptsBroadcast: true,
      reviewRequired: false,
    },
  ],
};
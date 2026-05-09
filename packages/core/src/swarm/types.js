/**
 * Swarm Types — Worker roles, missions, checkpoints, and dispatch.
 *
 * This is the data model layer. The swarm orchestrator in Hermes Workspace
 * uses a YAML-based roster with roles, missions, and persistent workers.
 * We adapt that model into TypeScript-native types for Tekton Agent.
 */
// ── Defaults ─────────────────────────────────────────────────────────
export const DEFAULT_WORKER_CONFIG = {
    maxConcurrentTasks: 1,
    acceptsBroadcast: true,
    reviewRequired: false,
    skills: [],
    capabilities: {},
    preferredTaskTypes: [],
};
export const DEFAULT_SWARM_ROSTER = {
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
//# sourceMappingURL=types.js.map
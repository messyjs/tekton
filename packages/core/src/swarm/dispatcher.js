/**
 * Swarm Dispatcher — Decomposes missions into SwarmBriefs and routes to workers.
 *
 * The orchestrator pattern from Hermes Workspace:
 *   User intent → Dispatcher decomposes → SwarmBrief per worker → Workers execute → Checkpoints
 */
import { randomUUID } from "node:crypto";
import { getSwarmRoster } from "./roster.js";
// ── Swarm Dispatcher ──────────────────────────────────────────────────
export class SwarmDispatcher {
    roster;
    missions = new Map();
    checkpoints = new Map();
    strategy;
    roundRobinIndex = 0;
    eventListeners = [];
    constructor(roster, strategy = "auto") {
        this.roster = roster;
        this.strategy = strategy;
    }
    // ── Mission Management ──────────────────────────────────────────e
    /** Create a new mission from user intent */
    createMission(intent, autoAssign = true) {
        const mission = {
            id: `mission-${Date.now()}-${randomUUID().slice(0, 8)}`,
            intent,
            state: "decomposing",
            briefs: [],
            checkpoints: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            autoAssigned: autoAssign,
        };
        // Decompose the intent into briefs
        const briefs = this.decompose(mission.id, intent);
        mission.briefs = briefs;
        mission.state = briefs.length > 0 ? "assigned" : "decomposing";
        mission.updatedAt = Date.now();
        this.missions.set(mission.id, mission);
        this.emit({ type: "mission_created", missionId: mission.id, briefCount: briefs.length });
        return mission;
    }
    /** Get a mission by ID */
    getMission(id) {
        return this.missions.get(id) ?? null;
    }
    /** Get all missions */
    getMissions() {
        return [...this.missions.values()];
    }
    /** Get active missions */
    getActiveMissions() {
        return [...this.missions.values()].filter(m => m.state === "assigned" || m.state === "running" || m.state === "reviewing");
    }
    // ── Dispatch ─────────────────────────────────────────────────────
    /** Dispatch work to a worker or auto-assign */
    dispatch(request) {
        // Find or create mission
        const mission = this.createMission(request.intent, !request.workerId);
        // If specific worker requested, assign to them
        if (request.workerId) {
            const worker = this.roster.getWorker(request.workerId);
            if (worker) {
                mission.briefs = this.assignToWorker(mission, worker, request);
            }
        }
        // Update mission state
        mission.state = "running";
        mission.updatedAt = Date.now();
        return {
            missionId: mission.id,
            briefs: mission.briefs,
            dispatchedTo: mission.briefs.map(b => b.workerId),
            autoAssigned: mission.autoAssigned,
        };
    }
    /** Broadcast a message to all idle workers */
    broadcast(message, from) {
        const idleWorkers = this.roster.getIdleWorkers();
        for (const worker of idleWorkers) {
            this.emit({ type: "broadcast", from, message });
        }
    }
    // ── Checkpoints ──────────────────────────────────────────────────
    /** Receive a checkpoint from a worker */
    receiveCheckpoint(checkpoint) {
        // Store the checkpoint
        const existing = this.checkpoints.get(checkpoint.briefId) ?? [];
        existing.push(checkpoint);
        this.checkpoints.set(checkpoint.briefId, existing);
        // Emit event
        this.emit({
            type: "checkpoint_received",
            workerId: checkpoint.workerId,
            briefId: checkpoint.briefId,
            state: checkpoint.state,
        });
        // Update the brief
        const brief = this.roster.getBrief(checkpoint.briefId);
        if (brief) {
            switch (checkpoint.state) {
                case "DONE":
                    brief.state = "completed";
                    this.emit({ type: "brief_completed", briefId: brief.id, workerId: checkpoint.workerId });
                    this.roster.updateStats(checkpoint.workerId, { tasksCompleted: 1 });
                    this.roster.markIdle(checkpoint.workerId);
                    break;
                case "BLOCKED":
                    brief.state = "assigned"; // stays assigned but blocked
                    this.roster.markBlocked(checkpoint.workerId, checkpoint.blocker ?? "unknown");
                    this.emit({ type: "brief_blocked", briefId: brief.id, workerId: checkpoint.workerId, blocker: checkpoint.blocker ?? "unknown" });
                    break;
                case "NEEDS_INPUT":
                    // Escalate to human
                    this.emit({ type: "escalation", workerId: checkpoint.workerId, briefId: brief.id, reason: "Needs human input" });
                    break;
                case "NEEDS_REVIEW":
                    // Route to reviewer
                    this.routeToReviewer(checkpoint);
                    break;
                case "HANDOFF":
                    // Route to another worker
                    this.routeHandoff(checkpoint);
                    break;
                case "IN_PROGRESS":
                    // Worker is still working, just update stats
                    this.roster.updateStats(checkpoint.workerId, {});
                    break;
            }
        }
        // Update the mission
        const mission = this.findMissionForBrief(checkpoint.briefId);
        if (mission) {
            mission.checkpoints.push(checkpoint);
            mission.updatedAt = Date.now();
            // Check if all briefs are complete
            const allDone = mission.briefs.every(b => b.state === "completed");
            if (allDone) {
                mission.state = "completed";
                this.emit({ type: "mission_completed", missionId: mission.id });
            }
            // Check if any brief failed
            const anyBlocked = mission.briefs.some(b => b.state === "pending" || b.state === "assigned");
            if (!allDone && !anyBlocked && mission.state === "running") {
                mission.state = "reviewing";
            }
        }
        return mission;
    }
    /** Get checkpoints for a brief */
    getCheckpoints(briefId) {
        return this.checkpoints.get(briefId) ?? [];
    }
    // ── Internal Methods ────────────────────────────────────────────
    /** Decompose an intent into briefs */
    decompose(missionId, intent) {
        // Simple decomposition based on intent keywords
        // In a real system, this would use an LLM to decompose
        const briefs = [];
        const intentLower = intent.toLowerCase();
        // Determine what roles are needed
        const roles = [];
        if (intentLower.includes("build") || intentLower.includes("implement") || intentLower.includes("create") || intentLower.includes("fix")) {
            roles.push("builder");
        }
        if (intentLower.includes("review") || intentLower.includes("check") || intentLower.includes("verify") || intentLower.includes("test")) {
            roles.push("reviewer");
        }
        if (intentLower.includes("research") || intentLower.includes("investigate") || intentLower.includes("analyze") || intentLower.includes("explore")) {
            roles.push("researcher");
        }
        if (intentLower.includes("document") || intentLower.includes("docs") || intentLower.includes("readme") || intentLower.includes("write up")) {
            roles.push("scribe");
        }
        if (intentLower.includes("deploy") || intentLower.includes("ops") || intentLower.includes("monitor") || intentLower.includes("health")) {
            roles.push("ops");
        }
        if (intentLower.includes("experiment") || intentLower.includes("benchmark") || intentLower.includes("test model")) {
            roles.push("lab");
        }
        // If no roles identified, use builder as default
        if (roles.length === 0) {
            roles.push("builder");
        }
        // Create a brief for each role
        for (const role of roles) {
            const worker = this.findWorkerForRole(role);
            if (worker) {
                const brief = this.roster.createBrief({
                    workerId: worker.id,
                    project: missionId,
                    goal: this.generateGoalForRole(intent, role),
                    whyNow: `Part of mission: ${intent}`,
                    scope: [intent],
                    deliverables: this.generateDeliverables(role),
                    testOrProof: this.generateProof(role),
                    priority: "normal",
                });
                briefs.push(brief);
                this.roster.markBusy(worker.id, brief.id, brief.goal);
            }
        }
        return briefs;
    }
    /** Assign a mission to a specific worker */
    assignToWorker(mission, worker, request) {
        const brief = this.roster.createBrief({
            workerId: worker.id,
            project: mission.id,
            goal: request.intent,
            whyNow: "Direct dispatch",
            scope: request.scope ?? [],
            priority: request.priority ?? "normal",
        });
        this.roster.markBusy(worker.id, brief.id, brief.goal);
        return [brief];
    }
    /** Find a worker for a role */
    findWorkerForRole(role) {
        // Try idle workers with the right role first
        const roleMatch = this.roster.getByRole(role).find(w => {
            const rt = this.roster.getRuntime(w.id);
            return rt?.state === "idle" || rt?.state === "offline";
        });
        if (roleMatch)
            return roleMatch;
        // Try any idle worker
        const anyIdle = this.roster.getIdleWorkers();
        if (anyIdle.length > 0)
            return anyIdle[0];
        // Use the orchestrator as fallback
        return this.roster.getByRole("orchestrator")[0] ?? this.roster.getWorkers()[0] ?? null;
    }
    /** Route a checkpoint that needs review to a reviewer */
    routeToReviewer(checkpoint) {
        const reviewer = this.roster.getByRole("reviewer")[0] ?? this.findWorkerForRole("reviewer");
        if (reviewer) {
            const brief = this.roster.createBrief({
                workerId: reviewer.id,
                project: checkpoint.briefId,
                goal: `Review: ${checkpoint.proof}`,
                whyNow: "Review requested by " + checkpoint.workerId,
                scope: ["code review", "regression check"],
                priority: "high",
            });
            this.roster.markBusy(reviewer.id, brief.id, brief.goal);
        }
    }
    /** Route a handoff to another worker */
    routeHandoff(checkpoint) {
        // Just mark the current worker as idle and let the next assignment happen
        this.roster.markIdle(checkpoint.workerId);
    }
    /** Generate goal description for a role */
    generateGoalForRole(intent, role) {
        switch (role) {
            case "builder": return `Implement: ${intent}`;
            case "reviewer": return `Review implementation of: ${intent}`;
            case "researcher": return `Research context for: ${intent}`;
            case "scribe": return `Document: ${intent}`;
            case "ops": return `Operational support for: ${intent}`;
            case "lab": return `Experiment with: ${intent}`;
            case "triage": return `Triage issues related to: ${intent}`;
            case "qa": return `Test and verify: ${intent}`;
            case "orchestrator": return `Coordinate: ${intent}`;
            default: return intent;
        }
    }
    /** Generate expected deliverables for a role */
    generateDeliverables(role) {
        switch (role) {
            case "builder": return ["Implementation files", "Test files"];
            case "reviewer": return ["Review verdict", "Issue list"];
            case "researcher": return ["Research summary", "Recommendations"];
            case "scribe": return ["Updated documentation"];
            case "ops": return ["Deployment plan", "Health check results"];
            default: return ["Deliverable"];
        }
    }
    /** Generate proof requirements for a role */
    generateProof(role) {
        return ["Build passes", "Tests pass"];
    }
    /** Find the mission containing a brief */
    findMissionForBrief(briefId) {
        return [...this.missions.values()].find(m => m.briefs.some(b => b.id === briefId)) ?? null;
    }
    // ── Events ──────────────────────────────────────────────────────
    onEvent(listener) {
        this.eventListeners.push(listener);
        return () => {
            this.eventListeners = this.eventListeners.filter(l => l !== listener);
        };
    }
    emit(event) {
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch { }
        }
    }
}
// ── Singleton ─────────────────────────────────────────────────────
let _dispatcher = null;
export function getSwarmDispatcher() {
    if (!_dispatcher) {
        _dispatcher = new SwarmDispatcher(getSwarmRoster());
    }
    return _dispatcher;
}
//# sourceMappingURL=dispatcher.js.map
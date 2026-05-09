/**
 * Swarm Roster — Manages worker configurations and runtime state.
 *
 * Loads from swarm.yaml or in-memory config. Tracks which workers are
 * online, what they're doing, and routes work to the right agent.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DEFAULT_SWARM_ROSTER } from "./types.js";
// ── Roster Manager ────────────────────────────────────────────────────
export class SwarmRosterManager {
    config;
    runtimes = new Map();
    briefs = new Map();
    eventListeners = [];
    constructor(config) {
        this.config = config ?? { ...DEFAULT_SWARM_ROSTER };
        // Initialize runtimes for all configured workers
        for (const worker of this.config.workers) {
            this.runtimes.set(worker.id, {
                id: worker.id,
                state: "offline",
                role: worker.role,
                currentTaskId: null,
                currentTaskBrief: null,
                lastActivityAt: 0,
                lastCheckIn: 0,
                cwd: worker.cwd ?? process.cwd(),
                tokensUsed: 0,
                tasksCompleted: 0,
                tasksFailed: 0,
            });
        }
    }
    /** Load roster from a YAML or JSON file */
    static fromFile(path) {
        if (!existsSync(path)) {
            return new SwarmRosterManager();
        }
        const raw = readFileSync(path, "utf-8");
        // Simple YAML parsing for swarm.yaml (no external deps)
        // For production, use a proper YAML parser
        let config;
        if (path.endsWith(".json")) {
            config = JSON.parse(raw);
        }
        else {
            // Basic YAML-ish parsing for our roster format
            config = parseSwarmYaml(raw);
        }
        return new SwarmRosterManager(config);
    }
    /** Save roster to JSON file */
    saveToFile(path) {
        writeFileSync(path, JSON.stringify(this.config, null, 2));
    }
    // ── Worker Queries ──────────────────────────────────────────────e
    /** Get all worker configs */
    getWorkers() {
        return [...this.config.workers];
    }
    /** Get a specific worker config */
    getWorker(id) {
        return this.config.workers.find(w => w.id === id);
    }
    /** Get worker runtime state */
    getRuntime(id) {
        return this.runtimes.get(id);
    }
    /** Get all worker runtimes */
    getRuntimes() {
        return [...this.runtimes.values()];
    }
    /** Find workers that match a role */
    getByRole(role) {
        return this.config.workers.filter(w => w.role === role);
    }
    /** Find idle workers */
    getIdleWorkers() {
        return this.config.workers.filter(w => {
            const rt = this.runtimes.get(w.id);
            return rt?.state === "idle";
        });
    }
    /** Find workers that can handle a task type */
    getByTaskType(taskType) {
        return this.config.workers.filter(w => w.preferredTaskTypes.includes(taskType) ||
            w.capabilities[taskType] === true);
    }
    /** Find the best worker for a dispatch request */
    findBestWorker(role, taskType) {
        // 1. Try idle workers matching role
        if (role) {
            const match = this.getIdleWorkers().find(w => w.role === role);
            if (match)
                return match;
        }
        // 2. Try idle workers matching task type
        if (taskType) {
            const match = this.getIdleWorkers().find(w => w.preferredTaskTypes.includes(taskType));
            if (match)
                return match;
        }
        // 3. Any idle worker
        const anyIdle = this.getIdleWorkers();
        if (anyIdle.length > 0)
            return anyIdle[0];
        // 4. No idle workers
        return null;
    }
    // ── Worker Lifecycle ─────────────────────────────────────────────
    /** Mark a worker as spawning */
    spawnWorker(id, pid) {
        const rt = this.runtimes.get(id);
        if (!rt)
            return;
        const from = rt.state;
        rt.state = "spawning";
        rt.pid = pid;
        rt.lastActivityAt = Date.now();
        this.emit({ type: "worker_spawned", workerId: id, role: rt.role });
    }
    /** Mark a worker as idle (ready for work) */
    markIdle(id) {
        const rt = this.runtimes.get(id);
        if (!rt)
            return;
        const from = rt.state;
        rt.state = "idle";
        rt.currentTaskId = null;
        rt.currentTaskBrief = null;
        rt.lastActivityAt = Date.now();
        rt.lastCheckIn = Date.now();
        this.emit({ type: "worker_state_changed", workerId: id, from, to: "idle" });
    }
    /** Mark a worker as busy (executing a task) */
    markBusy(id, briefId, brief) {
        const rt = this.runtimes.get(id);
        if (!rt)
            return;
        const from = rt.state;
        rt.state = "busy";
        rt.currentTaskId = briefId;
        rt.currentTaskBrief = brief;
        rt.lastActivityAt = Date.now();
        this.emit({ type: "brief_assigned", briefId, workerId: id });
    }
    /** Mark a worker as blocked */
    markBlocked(id, reason) {
        const rt = this.runtimes.get(id);
        if (!rt)
            return;
        const from = rt.state;
        rt.state = "blocked";
        rt.lastActivityAt = Date.now();
        this.emit({ type: "worker_state_changed", workerId: id, from, to: "blocked" });
    }
    /** Kill a worker */
    killWorker(id, reason) {
        const rt = this.runtimes.get(id);
        if (!rt)
            return;
        const from = rt.state;
        rt.state = "offline";
        rt.currentTaskId = null;
        rt.currentTaskBrief = null;
        rt.pid = undefined;
        this.emit({ type: "worker_killed", workerId: id, reason });
    }
    /** Update worker stats */
    updateStats(id, stats) {
        const rt = this.runtimes.get(id);
        if (!rt)
            return;
        if (stats.tokensUsed)
            rt.tokensUsed += stats.tokensUsed;
        if (stats.tasksCompleted)
            rt.tasksCompleted += stats.tasksCompleted;
        if (stats.tasksFailed)
            rt.tasksFailed += stats.tasksFailed;
        rt.lastCheckIn = Date.now();
    }
    // ── Brief Management ────────────────────────────────────────────
    /** Create a brief */
    createBrief(params) {
        const brief = {
            id: `brief-${Date.now()}-${randomUUID().slice(0, 8)}`,
            workerId: params.workerId,
            project: params.project,
            goal: params.goal,
            whyNow: params.whyNow ?? "User requested",
            scope: params.scope ?? [],
            deliverables: params.deliverables ?? [],
            testOrProof: params.testOrProof ?? [],
            constraints: params.constraints ?? [],
            budgetHours: params.budgetHours ?? 2,
            createdAt: Date.now(),
            state: "pending",
            priority: params.priority ?? "normal",
        };
        this.briefs.set(brief.id, brief);
        return brief;
    }
    /** Get a brief */
    getBrief(id) {
        return this.briefs.get(id);
    }
    /** Get all briefs */
    getBriefs() {
        return [...this.briefs.values()];
    }
    /** Get briefs for a worker */
    getBriefsForWorker(workerId) {
        return [...this.briefs.values()].filter(b => b.workerId === workerId);
    }
    /** Update brief state */
    updateBriefState(id, state) {
        const brief = this.briefs.get(id);
        if (!brief)
            return;
        brief.state = state;
    }
    // ── Add/Remove Workers ──────────────────────────────────────────
    /** Add a worker to the roster */
    addWorker(config) {
        this.config.workers.push(config);
        this.runtimes.set(config.id, {
            id: config.id,
            state: "offline",
            role: config.role,
            currentTaskId: null,
            currentTaskBrief: null,
            lastActivityAt: 0,
            lastCheckIn: 0,
            cwd: config.cwd ?? process.cwd(),
            tokensUsed: 0,
            tasksCompleted: 0,
            tasksFailed: 0,
        });
    }
    /** Remove a worker from the roster */
    removeWorker(id) {
        this.config.workers = this.config.workers.filter(w => w.id !== id);
        this.runtimes.delete(id);
    }
    // ── Health ──────────────────────────────────────────────────────
    /** Get swarm health summary */
    getHealth() {
        const runtimes = [...this.runtimes.values()];
        const briefs = [...this.briefs.values()];
        return {
            totalWorkers: runtimes.length,
            onlineWorkers: runtimes.filter(r => r.state !== "offline").length,
            busyWorkers: runtimes.filter(r => r.state === "busy").length,
            idleWorkers: runtimes.filter(r => r.state === "idle").length,
            blockedWorkers: runtimes.filter(r => r.state === "blocked").length,
            activeMissions: briefs.filter(b => b.state === "assigned" || b.state === "in_progress").length,
            pendingBriefs: briefs.filter(b => b.state === "pending").length,
            completedMissions: briefs.filter(b => b.state === "completed").length,
        };
    }
    // ── Events ──────────────────────────────────────────────────────
    /** Subscribe to swarm events */
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
// ── Simple YAML Parser ─────────────────────────────────────────────
// Handles the flat structure of swarm.yaml — not a full YAML parser.
function parseSwarmYaml(raw) {
    // For now, fall back to JSON if we can't parse YAML
    // A real implementation would use js-yaml or similar
    try {
        return JSON.parse(raw);
    }
    catch {
        // If it's real YAML, we need a proper parser.
        // For now, use the default roster.
        return { ...DEFAULT_SWARM_ROSTER };
    }
}
// ── Singleton ─────────────────────────────────────────────────────
let _roster = null;
export function getSwarmRoster() {
    if (!_roster) {
        _roster = new SwarmRosterManager();
    }
    return _roster;
}
export function initSwarmRoster(config) {
    _roster = new SwarmRosterManager(config);
    return _roster;
}
//# sourceMappingURL=roster.js.map
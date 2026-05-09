import type { WorkerConfig, WorkerRuntime, WorkerRole, SwarmRoster, SwarmBrief, BriefState, SwarmEvent, SwarmHealth } from "./types.js";
export declare class SwarmRosterManager {
    private config;
    private runtimes;
    private briefs;
    private eventListeners;
    constructor(config?: SwarmRoster);
    /** Load roster from a YAML or JSON file */
    static fromFile(path: string): SwarmRosterManager;
    /** Save roster to JSON file */
    saveToFile(path: string): void;
    /** Get all worker configs */
    getWorkers(): WorkerConfig[];
    /** Get a specific worker config */
    getWorker(id: string): WorkerConfig | undefined;
    /** Get worker runtime state */
    getRuntime(id: string): WorkerRuntime | undefined;
    /** Get all worker runtimes */
    getRuntimes(): WorkerRuntime[];
    /** Find workers that match a role */
    getByRole(role: WorkerRole): WorkerConfig[];
    /** Find idle workers */
    getIdleWorkers(): WorkerConfig[];
    /** Find workers that can handle a task type */
    getByTaskType(taskType: string): WorkerConfig[];
    /** Find the best worker for a dispatch request */
    findBestWorker(role?: WorkerRole, taskType?: string): WorkerConfig | null;
    /** Mark a worker as spawning */
    spawnWorker(id: string, pid?: number): void;
    /** Mark a worker as idle (ready for work) */
    markIdle(id: string): void;
    /** Mark a worker as busy (executing a task) */
    markBusy(id: string, briefId: string, brief: string): void;
    /** Mark a worker as blocked */
    markBlocked(id: string, reason: string): void;
    /** Kill a worker */
    killWorker(id: string, reason: string): void;
    /** Update worker stats */
    updateStats(id: string, stats: {
        tokensUsed?: number;
        tasksCompleted?: number;
        tasksFailed?: number;
    }): void;
    /** Create a brief */
    createBrief(params: {
        workerId: string;
        project: string;
        goal: string;
        whyNow?: string;
        scope?: string[];
        deliverables?: string[];
        testOrProof?: string[];
        constraints?: string[];
        budgetHours?: number;
        priority?: "low" | "normal" | "high" | "critical";
    }): SwarmBrief;
    /** Get a brief */
    getBrief(id: string): SwarmBrief | undefined;
    /** Get all briefs */
    getBriefs(): SwarmBrief[];
    /** Get briefs for a worker */
    getBriefsForWorker(workerId: string): SwarmBrief[];
    /** Update brief state */
    updateBriefState(id: string, state: BriefState): void;
    /** Add a worker to the roster */
    addWorker(config: WorkerConfig): void;
    /** Remove a worker from the roster */
    removeWorker(id: string): void;
    /** Get swarm health summary */
    getHealth(): SwarmHealth;
    /** Subscribe to swarm events */
    onEvent(listener: (event: SwarmEvent) => void): () => void;
    private emit;
}
export declare function getSwarmRoster(): SwarmRosterManager;
export declare function initSwarmRoster(config?: SwarmRoster): SwarmRosterManager;
//# sourceMappingURL=roster.d.ts.map
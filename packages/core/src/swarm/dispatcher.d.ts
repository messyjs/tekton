import type { SwarmMission, SwarmCheckpoint, DispatchRequest, DispatchResult, SwarmEvent } from "./types.js";
import { SwarmRosterManager } from "./roster.js";
export type DispatchStrategy = "round-robin" | "role-based" | "capability-based" | "auto";
export declare class SwarmDispatcher {
    private roster;
    private missions;
    private checkpoints;
    private strategy;
    private roundRobinIndex;
    private eventListeners;
    constructor(roster: SwarmRosterManager, strategy?: DispatchStrategy);
    /** Create a new mission from user intent */
    createMission(intent: string, autoAssign?: boolean): SwarmMission;
    /** Get a mission by ID */
    getMission(id: string): SwarmMission | null;
    /** Get all missions */
    getMissions(): SwarmMission[];
    /** Get active missions */
    getActiveMissions(): SwarmMission[];
    /** Dispatch work to a worker or auto-assign */
    dispatch(request: DispatchRequest): DispatchResult;
    /** Broadcast a message to all idle workers */
    broadcast(message: string, from: string): void;
    /** Receive a checkpoint from a worker */
    receiveCheckpoint(checkpoint: SwarmCheckpoint): SwarmMission | null;
    /** Get checkpoints for a brief */
    getCheckpoints(briefId: string): SwarmCheckpoint[];
    /** Decompose an intent into briefs */
    private decompose;
    /** Assign a mission to a specific worker */
    private assignToWorker;
    /** Find a worker for a role */
    private findWorkerForRole;
    /** Route a checkpoint that needs review to a reviewer */
    private routeToReviewer;
    /** Route a handoff to another worker */
    private routeHandoff;
    /** Generate goal description for a role */
    private generateGoalForRole;
    /** Generate expected deliverables for a role */
    private generateDeliverables;
    /** Generate proof requirements for a role */
    private generateProof;
    /** Find the mission containing a brief */
    private findMissionForBrief;
    onEvent(listener: (event: SwarmEvent) => void): () => void;
    private emit;
}
export declare function getSwarmDispatcher(): SwarmDispatcher;
//# sourceMappingURL=dispatcher.d.ts.map
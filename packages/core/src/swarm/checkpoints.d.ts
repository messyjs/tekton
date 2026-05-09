/**
 * Swarm Checkpoints — Proof-bearing worker output with validation and escalation.
 *
 * Workers return checkpoints with evidence, not vibes.
 * Good checkpoints contain concrete results. Bad checkpoints contain adjectives.
 */
import type { SwarmCheckpoint, CheckpointState } from "./types.js";
import { SwarmRosterManager } from "./roster.js";
export interface ValidationRule {
    /** Rule name */
    name: string;
    /** States this rule applies to */
    states: CheckpointState[];
    /** Validate the checkpoint — return list of issues, empty = pass */
    validate(checkpoint: SwarmCheckpoint): string[];
}
export declare const RequireProof: ValidationRule;
export declare const RequireFilesChanged: ValidationRule;
export declare const RequireBlockerDetail: ValidationRule;
export declare const NotAdjectives: ValidationRule;
export declare class SwarmCheckpointValidator {
    private rules;
    private roster;
    private eventListeners;
    constructor(roster: SwarmRosterManager, rules?: ValidationRule[]);
    /** Validate a checkpoint against all rules */
    validate(checkpoint: SwarmCheckpoint): {
        valid: boolean;
        issues: string[];
    };
    /** Check if a checkpoint should escalate to human */
    shouldEscalate(checkpoint: SwarmCheckpoint): boolean;
    /** Check if a checkpoint should route to reviewer */
    shouldReview(checkpoint: SwarmCheckpoint): boolean;
    /** Add a custom validation rule */
    addRule(rule: ValidationRule): void;
    /** Remove a validation rule by name */
    removeRule(name: string): void;
}
export declare const GATEKEEPER_ACTIONS: readonly ["git_push_force", "pr_merge", "pr_close", "release_create", "npm_publish", "public_post", "financial_transaction", "destructive_file_op", "service_restart"];
export type GatekeeperAction = typeof GATEKEEPER_ACTIONS[number];
export declare function requiresApproval(action: string): boolean;
export declare function createApprovalCheckpoint(workerId: string, briefId: string, action: string, details: string): SwarmCheckpoint;
//# sourceMappingURL=checkpoints.d.ts.map
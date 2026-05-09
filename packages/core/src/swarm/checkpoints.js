// ── Built-in Validation Rules ──────────────────────────────────────────
export const RequireProof = {
    name: "require-proof",
    states: ["DONE", "NEEDS_REVIEW", "HANDOFF"],
    validate(cp) {
        const issues = [];
        if (!cp.proof || cp.proof.trim().length === 0) {
            issues.push("Checkpoint must include proof — concrete evidence, not adjectives.");
        }
        if (cp.proof && cp.proof.split(/\s+/).length < 3) {
            issues.push("Proof is too short — describe what was done, what was verified, and what the result was.");
        }
        return issues;
    },
};
export const RequireFilesChanged = {
    name: "require-files-changed",
    states: ["DONE"],
    validate(cp) {
        const issues = [];
        if (cp.state === "DONE" && cp.filesChanged.length === 0 && !cp.proof.includes("test") && !cp.proof.includes("benchmark")) {
            issues.push("DONE checkpoint should list files changed or explain why none were modified.");
        }
        return issues;
    },
};
export const RequireBlockerDetail = {
    name: "require-blocker-detail",
    states: ["BLOCKED", "NEEDS_INPUT"],
    validate(cp) {
        const issues = [];
        if (cp.state === "BLOCKED" && (!cp.blocker || cp.blocker === "unknown")) {
            issues.push("BLOCKED checkpoint must specify the exact blocker — name the missing piece.");
        }
        if (cp.state === "BLOCKED" && cp.blocker && cp.blocker.split(/\s+/).length < 5) {
            issues.push("Blocker description too vague — include the exact error, missing token, or failed command.");
        }
        if (cp.state === "NEEDS_INPUT" && !cp.nextAction) {
            issues.push("NEEDS_INPUT checkpoint must specify what input is needed from the human.");
        }
        return issues;
    },
};
export const NotAdjectives = {
    name: "not-just-adjectives",
    states: ["DONE", "BLOCKED", "NEEDS_REVIEW"],
    validate(cp) {
        const issues = [];
        // Word-boundary check avoids false positives like "ok" inside "auth"
        const vagueWords = ["\\bgood\\b", "\\bbad\\b", "\\bfine\\b", "\\bnice\\b", "\\bokay\\b", "\\bseems\\b", "\\bprobably\\b", "\\bmaybe\\b", "\\bunclear\\b", "\\bbroken\\b"];
        const proofLower = cp.proof.toLowerCase();
        if (cp.proof.split(/\s+/).length < 8) {
            for (const pattern of vagueWords) {
                if (new RegExp(pattern, "i").test(proofLower)) {
                    issues.push("Proof is too vague — use specific evidence, not adjectives.");
                    break;
                }
            }
        }
        return issues;
    },
};
// ── Checkpoint Validator ──────────────────────────────────────────────
export class SwarmCheckpointValidator {
    rules;
    roster;
    eventListeners = [];
    constructor(roster, rules) {
        this.roster = roster;
        this.rules = rules ?? [RequireProof, RequireFilesChanged, RequireBlockerDetail, NotAdjectives];
    }
    /** Validate a checkpoint against all rules */
    validate(checkpoint) {
        const allIssues = [];
        for (const rule of this.rules) {
            if (rule.states.includes(checkpoint.state)) {
                const issues = rule.validate(checkpoint);
                allIssues.push(...issues);
            }
        }
        return {
            valid: allIssues.length === 0,
            issues: allIssues,
        };
    }
    /** Check if a checkpoint should escalate to human */
    shouldEscalate(checkpoint) {
        return checkpoint.state === "NEEDS_INPUT" || checkpoint.state === "BLOCKED";
    }
    /** Check if a checkpoint should route to reviewer */
    shouldReview(checkpoint) {
        return checkpoint.state === "NEEDS_REVIEW" || checkpoint.state === "DONE";
    }
    /** Add a custom validation rule */
    addRule(rule) {
        this.rules.push(rule);
    }
    /** Remove a validation rule by name */
    removeRule(name) {
        this.rules = this.rules.filter(r => r.name !== name);
    }
}
// ── Greenlight Gate ──────────────────────────────────────────────────
// The swarm can prepare risky actions. It cannot silently take them.
export const GATEKEEPER_ACTIONS = [
    "git_push_force",
    "pr_merge",
    "pr_close",
    "release_create",
    "npm_publish",
    "public_post",
    "financial_transaction",
    "destructive_file_op",
    "service_restart",
];
export function requiresApproval(action) {
    return GATEKEEPER_ACTIONS.includes(action);
}
export function createApprovalCheckpoint(workerId, briefId, action, details) {
    return {
        workerId,
        briefId,
        state: "NEEDS_INPUT",
        filesChanged: [],
        commandsRun: [],
        proof: `Proposed action: ${action}. ${details}. Requires human approval.`,
        blocker: `Action "${action}" requires human approval before execution.`,
        nextAction: `Approve or reject the proposed action: ${action}`,
        timestamp: Date.now(),
    };
}
//# sourceMappingURL=checkpoints.js.map
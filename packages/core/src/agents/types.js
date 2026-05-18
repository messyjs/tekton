/**
 * Agent orchestration types — shared across pool, session, router, queue.
 */
export const DEFAULT_POOL_CONFIG = {
    maxAgents: 4,
    idleTimeoutMs: 60000,
    taskTimeoutMs: 120000,
    maxRetries: 2,
    concurrencyLimit: 4,
};
export const DEFAULT_ROUTER_CONFIG = {
    complexityThreshold: 0.6,
    dependencyThreshold: 2,
    alwaysInlineSkills: [],
    alwaysDelegateSkills: [],
};
//# sourceMappingURL=types.js.map
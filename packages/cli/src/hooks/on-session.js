import { createFullCommandRegistry } from "../commands/index.js";
// ── on-session hook ─────────────────────────────────────────────────
export function createOnSessionHook(config) {
    return (pi) => {
        pi.on("session_start", async (_event) => {
            // Track session lifecycle events
            config.telemetry.record({
                type: "session_start",
                model: config.modelRouter.getRecentDecisions()[0]?.model ?? "unknown",
                provider: config.modelRouter.getRecentDecisions()[0]?.provider ?? "unknown",
                inputTokens: 0,
                outputTokens: 0,
                latencyMs: 0,
                costEstimate: 0,
            });
        });
        // Register all /tekton:* commands via the command registry
        const cmdCtx = {
            hermesBridge: config.hermesBridge,
            modelRouter: config.modelRouter,
            soul: config.soul,
            personality: config.personality,
            memory: config.memory,
            telemetry: config.telemetry,
            config: config.config,
            tektonHome: config.tektonHome,
        };
        const registry = createFullCommandRegistry();
        registry.registerAll(pi, cmdCtx);
    };
}
//# sourceMappingURL=on-session.js.map
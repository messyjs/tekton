// ── on-tool-call hook ───────────────────────────────────────────────
export function createOnToolCallHook(config) {
    return (pi) => {
        pi.on("tool_call", async (event) => {
            // Log tool execution to telemetry
            const toolName = event.toolName ?? event.name ?? "unknown";
            config.telemetry.record({
                type: "tool_call",
                model: config.modelRouter.getRecentDecisions()[0]?.model ?? "unknown",
                provider: config.modelRouter.getRecentDecisions()[0]?.provider ?? "unknown",
                inputTokens: 0,
                outputTokens: 0,
                latencyMs: 0,
                skillUsed: toolName,
                costEstimate: 0,
            });
            // Check for SCP delegation intercepts
            if (toolName === "delegate") {
                // SCP delegation is handled by the delegate tool itself
                // This hook is for logging/telemetry only
            }
        });
    };
}
//# sourceMappingURL=on-tool-call.js.map
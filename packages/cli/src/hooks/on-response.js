// ── on-response hook ────────────────────────────────────────────────
export function createOnResponseHook(config) {
    return (pi) => {
        pi.on("agent_end", async (event) => {
            const bridge = config.hermesBridge;
            // Compute basic metrics from the event
            const messages = event.messages ?? [];
            // Extract last user message as task description
            let taskDescription = "unknown task";
            for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                if (msg.role === "user") {
                    // Handle different message content shapes
                    const content = msg.content;
                    if (typeof content === "string") {
                        taskDescription = content.slice(0, 200);
                    }
                    break;
                }
            }
            // 1. Track in telemetry
            config.telemetry.record({
                type: "agent_end",
                model: config.modelRouter.getRecentDecisions()[0]?.model ?? "unknown",
                provider: config.modelRouter.getRecentDecisions()[0]?.provider ?? "unknown",
                inputTokens: 0,
                outputTokens: 0,
                latencyMs: Date.now(),
                costEstimate: 0,
            });
            // 2. Evaluate task via hermes bridge (learning loop)
            try {
                await bridge.onTaskComplete({
                    messages: messages.map((msg) => {
                        let contentStr;
                        if (typeof msg.content === "string") {
                            contentStr = msg.content;
                        }
                        else if (Array.isArray(msg.content)) {
                            contentStr = "[multimodal message]";
                        }
                        else {
                            contentStr = "";
                        }
                        return {
                            role: msg.role,
                            content: contentStr,
                            timestamp: new Date().toISOString(),
                        };
                    }),
                    toolResults: [],
                    routingDecision: config.modelRouter.getRecentDecisions()[0],
                    userCorrections: [],
                    startTime: Date.now(),
                    endTime: Date.now(),
                    taskDescription,
                });
            }
            catch {
                // Learning loop failures should not crash the session
            }
        });
    };
}
//# sourceMappingURL=on-response.js.map
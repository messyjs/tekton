import type { ExtensionFactory, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HookConfig } from "./on-prompt.js";

// ── on-tool-call hook ───────────────────────────────────────────────

export function createOnToolCallHook(config: HookConfig): ExtensionFactory {
  return (pi: ExtensionAPI) => {
    pi.on("tool_call", async (event: any) => {
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
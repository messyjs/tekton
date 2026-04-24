import type { ExtensionFactory, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import type { ModelRouter, SoulManager, PersonalityManager, MemoryManager, TelemetryTracker, TektonConfig } from "@tekton/core";

export interface HookConfig {
  hermesBridge: HermesBridge;
  modelRouter: ModelRouter;
  soul: SoulManager;
  personality: PersonalityManager;
  memory: MemoryManager;
  telemetry: TelemetryTracker;
  config: TektonConfig;
  tektonHome: string;
}

// ── on-prompt hook ──────────────────────────────────────────────────

export function createOnPromptHook(config: HookConfig): ExtensionFactory {
  return (pi: ExtensionAPI) => {
    pi.on("agent_start", async () => {
      const bridge = config.hermesBridge;

      // 1. Check context hygiene — recommend compaction if needed
      const hygiene = bridge.hygiene;
      // (Context compaction is handled by Pi's built-in mechanism,
      //  but we track hygiene state for telemetry)

      // 2. Search skill library for relevant skills
      // (Skill hints are injected via system prompt, not hooks)

      // 3. Route to appropriate model (in auto mode)
      if (config.modelRouter.getMode() === "auto") {
        // Model routing is handled at session creation time for now.
        // Future: intercept provider requests and adjust model dynamically.
      }

      // 4. Record session start in telemetry
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
  };
}
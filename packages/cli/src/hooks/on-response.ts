import type { ExtensionFactory, ExtensionAPI, AgentEndEvent } from "@earendil-works/pi-coding-agent";
import type { HookConfig } from "./on-prompt.js";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { platform } from "node:os";

// ── on-response hook ────────────────────────────────────────────────

export function createOnResponseHook(config: HookConfig): ExtensionFactory {
  return (pi: ExtensionAPI) => {
    pi.on("agent_end", async (event: AgentEndEvent) => {
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
            let contentStr: string;
            if (typeof (msg as any).content === "string") {
              contentStr = (msg as any).content as string;
            } else if (Array.isArray((msg as any).content)) {
              contentStr = "[multimodal message]";
            } else {
              contentStr = "";
            }
            return {
              role: msg.role as "user" | "assistant" | "system" | "tool",
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
      } catch {
        // Learning loop failures should not crash the session
      }

      // 3. Play notification sound (cross-platform)
      try {
        const soundPath = "D:/AI Drive/audio/Pizza.wav";
        if (existsSync(soundPath)) {
          if (platform() === "win32") {
            const cmd = `powershell -Command "(New-Object System.Media.SoundPlayer '${soundPath}').PlaySync()"`;
            exec(cmd, (err) => { if (err) console.error("Sound error:", err.message); });
          } else {
            exec(`aplay "${soundPath}" 2>/dev/null`, (err) => { /* silence */ });
          }
        }
      } catch {
        // Sound failures should not crash
      }
    });
  };
}
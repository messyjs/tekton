/**
 * Context Engineer + Forge Integration Tests
 * Tests the CE integration with Forge production, Scribe, and Handoff.
 */
import { describe, it, expect } from "vitest";
import { ContextEngineer } from "../../packages/core/src/agents/context-engineer";
import type { PrecisionItem, Message } from "../../packages/core/src/agents/types";
import { loadLatestHandoff } from "../../packages/forge/src/continuity/handoff-loader.ts";
import { extractPrecisionItemsFromHandoff } from "../../packages/forge/src/continuity/handoff-loader.ts";
import type { HandoffPackage } from "../../packages/forge/src/types";

// ── Helpers ──────────────────────────────────────────────────────

function makeMessage(role: "user" | "assistant" | "tool", content: string, index: number): Message {
  return { role, content, messageIndex: index };
}

describe("Context Engineer + Forge Integration", () => {
  describe("production session has Context Engineer active", () => {
    it("creates ContextEngineer for production sessions", () => {
      const ce = new ContextEngineer({ enabled: true, model: "gemini-flash", rawWindowSize: 12 });
      expect(ce).toBeDefined();
      expect(ce.getConfig().enabled).toBe(true);
    });

    it("production agent uses optimized context via ContextEngineer", async () => {
      const ce = new ContextEngineer({ enabled: true, rawWindowSize: 3, rewriteInterval: 10 });

      // Simulate a production session
      await ce.processMessage(makeMessage("user", "Build a VST3 plugin using JUCE 8 with CMake", 0));
      await ce.processMessage(makeMessage("assistant", "I'll create the plugin structure with JUCE 8", 1));
      await ce.processMessage(makeMessage("user", "Set FFT size to 2048 and gain to -60dB", 2));

      const ctx = ce.getOptimizedContext();
      expect(ctx.rawMessages.length).toBe(3);
      expect(ctx.tokenEstimate).toBeGreaterThan(0);
      expect(ctx.precisionLog.length).toBeGreaterThan(0);
    });
  });

  describe("Scribe includes precision log in handoff", () => {
    it("precision items are included in handoff package", () => {
      const precisionItems: PrecisionItem[] = [
        {
          id: "pi-1",
          category: "decisions",
          value: "Using JUCE 8 with CMake build system",
          context: "Architecture decision for VST plugin",
          sourceMessageIndex: 0,
          superseded: false,
          pinned: true,
          timestamp: new Date().toISOString(),
        },
        {
          id: "pi-2",
          category: "audio-params",
          value: "Gain: -60dB to +6dB, FFT: 2048 samples",
          context: "Audio parameters",
          sourceMessageIndex: 1,
          superseded: false,
          pinned: false,
          timestamp: new Date().toISOString(),
        },
      ];

      const handoff: HandoffPackage = {
        sessionId: "session-1",
        taskCardId: "task-1",
        summary: "Built VST3 plugin structure with JUCE 8",
        completedWork: ["Created PluginProcessor.cpp", "Set up CMakeLists.txt"],
        remainingWork: ["Implement FFT processing"],
        filesModified: [
          { path: "src/PluginProcessor.cpp", action: "created", hash: "abc123", modifiedAt: Date.now(), role: "dsp-engineer" } as any,
        ],
        importantDecisions: ["Using JUCE 8 with CMake"],
        blockers: [],
        cavememObservations: ["obs-1"],
        precisionItems,
        nextSessionContext: "Continue FFT implementation",
      };

      expect(handoff.precisionItems).toBeDefined();
      expect(handoff.precisionItems!.length).toBe(2);
      expect(handoff.precisionItems![0].pinned).toBe(true);
    });
  });

  describe("Handoff loader injects precision items into fresh Context Engineer", () => {
    it("extracts precision items from handoff", () => {
      const handoff: HandoffPackage = {
        sessionId: "session-1",
        taskCardId: "task-1",
        summary: "Built VST3 plugin",
        completedWork: ["Created PluginProcessor.cpp"],
        remainingWork: ["Implement FFT"],
        filesModified: [
          { path: "src/PluginProcessor.cpp", action: "created", hash: "abc123", modifiedAt: Date.now(), role: "dsp-engineer" } as any,
        ],
        importantDecisions: ["Using JUCE 8 with CMake", "VST3 target only"],
        blockers: [],
        cavememObservations: [],
        nextSessionContext: "Continue",
      };

      const items = extractPrecisionItemsFromHandoff(handoff);
      expect(items.length).toBe(3); // 2 decisions + 1 file change
      expect(items.filter(i => i.category === "decisions").length).toBe(2);
      expect(items.filter(i => i.category === "file-changes").length).toBe(1);
      // Decisions from handoff are always pinned
      expect(items.filter(i => i.category === "decisions").every(i => i.pinned)).toBe(true);
    });

    it("precision values survive across session boundary", async () => {
      // Session 1: Create CE and process messages
      const ce1 = new ContextEngineer({ enabled: true, rewriteInterval: 10 });
      await ce1.processMessage(makeMessage("user", "Use JUCE 8 with CMake for the build system", 0));
      await ce1.processMessage(makeMessage("user", "Set gain range to -60dB to +6dB", 1));

      const precisionItems = ce1.getPrecisionItems();

      // Simulate handoff: extract and inject into fresh session
      const handoff: HandoffPackage = {
        sessionId: "session-1",
        taskCardId: "task-1",
        summary: "Configured JUCE plugin",
        completedWork: ["Set up build system"],
        remainingWork: ["Implement gain processing"],
        filesModified: [],
        importantDecisions: ["Using JUCE 8 with CMake"],
        blockers: [],
        cavememObservations: [],
        nextSessionContext: "Continue implementation",
      };

      const handoffItems = extractPrecisionItemsFromHandoff(handoff);

      // Session 2: Create new CE and inject handoff items
      const ce2 = new ContextEngineer({ enabled: true, rewriteInterval: 10 });
      ce2.injectPrecisionItems(handoffItems);

      // Verify precision values carry across
      const log = ce2.getPrecisionLog();
      expect(log).toContain("JUCE 8 with CMake");
      // Category header is title-cased
      expect(log).toMatch(/Decisions/i);
    });
  });
});
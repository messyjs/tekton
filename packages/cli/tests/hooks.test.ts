import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOnPromptHook, type HookConfig } from "../src/hooks/on-prompt.js";
import { createOnResponseHook } from "../src/hooks/on-response.js";
import { createOnToolCallHook } from "../src/hooks/on-tool-call.js";
import { createOnSessionHook } from "../src/hooks/on-session.js";
import { HermesBridge } from "@tekton/hermes-bridge";
import { ModelRouter, SoulManager, PersonalityManager, MemoryManager, TelemetryTracker } from "@tekton/core";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ── Mock factories ───────────────────────────────────────────────────

function createTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tekton-hooks-"));
}

function createMockHookConfig(): HookConfig {
  const tmpDir = createTmpDir();
  const bridge = new HermesBridge({ tektonHome: tmpDir });
  const router = new ModelRouter({
    fastModel: "test-fast",
    fastProvider: "test",
    deepModel: "test-deep",
    deepProvider: "test",
    fallbackChain: [],
    complexityThreshold: 0.6,
    simpleThreshold: 0.3,
  });

  return {
    hermesBridge: bridge,
    modelRouter: router,
    soul: new SoulManager(tmpDir),
    personality: new PersonalityManager(new SoulManager(tmpDir)),
    memory: new MemoryManager(tmpDir),
    telemetry: new TelemetryTracker(path.join(tmpDir, "telemetry.db")),
    config: {
      identity: { name: "tekton" } as any,
      models: { fast: { model: "test-fast", provider: "test" }, deep: { model: "test-deep", provider: "test" }, fallbackChain: [] } as any,
      routing: { mode: "auto" as const, complexityThreshold: 0.6, simpleThreshold: 0.3, escalationKeywords: [], simpleKeywords: [] },
      compression: { enabled: true, defaultTier: "full" as const },
      learning: { enabled: true, autoExtract: true, complexityThreshold: 0.7 },
      contextHygiene: { maxTurns: 50, compactPercent: 0.75, pruneAfter: 30 },
      telemetry: { enabled: true, dbPath: path.join(tmpDir, "telemetry.db") },
      budget: { dailyLimit: null, sessionLimit: null, warnPercent: 80 },
      dashboard: { port: 7890, autoStart: false },
      gateway: { platforms: [], tokens: {} },
      voice: { stt: "", tts: "", providers: {} },
      terminal: { backend: "local", cwd: "", timeout: 30000 },
      skills: { dirs: [], externalDirs: [] },
      memory: { provider: "sqlite", path: path.join(tmpDir, "memory.db") },
    },
    tektonHome: tmpDir,
  };
}

describe("Hooks", () => {
  describe("on-prompt hook", () => {
    it("creates an extension factory that registers agent_start listener", () => {
      const config = createMockHookConfig();
      const factory = createOnPromptHook(config);
      expect(typeof factory).toBe("function");

      // Simulate Pi calling the factory
      const mockPi = {
        on: vi.fn(),
      };
      factory(mockPi as any);
      expect(mockPi.on).toHaveBeenCalledWith("agent_start", expect.any(Function));
    });
  });

  describe("on-response hook", () => {
    it("creates an extension factory that registers agent_end listener", () => {
      const config = createMockHookConfig();
      const factory = createOnResponseHook(config);
      expect(typeof factory).toBe("function");

      const mockPi = {
        on: vi.fn(),
      };
      factory(mockPi as any);
      expect(mockPi.on).toHaveBeenCalledWith("agent_end", expect.any(Function));
    });
  });

  describe("on-tool-call hook", () => {
    it("creates an extension factory that registers tool_call listener", () => {
      const config = createMockHookConfig();
      const factory = createOnToolCallHook(config);
      expect(typeof factory).toBe("function");

      const mockPi = {
        on: vi.fn(),
      };
      factory(mockPi as any);
      expect(mockPi.on).toHaveBeenCalledWith("tool_call", expect.any(Function));
    });
  });

  describe("on-session hook", () => {
    it("creates an extension factory that registers listeners and commands", () => {
      const config = createMockHookConfig();
      const factory = createOnSessionHook(config);
      expect(typeof factory).toBe("function");

      const mockPi = {
        on: vi.fn(),
        registerCommand: vi.fn(),
      };
      factory(mockPi as any);

      // Should register session_start listener
      expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));

      // Should register all /tekton:* commands (21 total)
      const commandNames = (mockPi.registerCommand as ReturnType<typeof vi.fn>).mock.calls.map(
        (call: [string, unknown]) => call[0]
      );
      expect(commandNames.length).toBeGreaterThanOrEqual(21);
      expect(commandNames).toContain("tekton");
      expect(commandNames).toContain("tekton:status");
      expect(commandNames).toContain("tekton:skills");
      expect(commandNames).toContain("tekton:route");
      expect(commandNames).toContain("tekton:learn");
      expect(commandNames).toContain("tekton:help");
      expect(commandNames).toContain("tekton:compress");
      expect(commandNames).toContain("tekton:memory");
      expect(commandNames).toContain("tekton:personality");
      expect(commandNames).toContain("tekton:soul");
      expect(commandNames).toContain("tekton:config");
    });
  });
});
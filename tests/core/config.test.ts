import { describe, it, expect } from "vitest";
import { loadConfig } from "../../packages/core/src/config/loader.ts";
import { DEFAULT_CONFIG } from "../../packages/core/src/config/defaults.ts";

describe("Config Loader", () => {
  it("returns defaults when no config files exist", () => {
    const config = loadConfig("/nonexistent/path");
    expect(config.identity.name).toBe("tekton");
    // Model may vary based on local config — just verify it's a string
    expect(typeof config.models.fast.model).toBe("string");
    expect(config.models.fast.model.length).toBeGreaterThan(0);
    expect(config.routing.mode).toBe("auto");
  });

  it("has sensible defaults", () => {
    const config = loadConfig();
    expect(config.identity.soul).toBe("Tekton Agent — adaptive coding agent that learns");
    expect(config.compression.enabled).toBe(true);
    expect(config.compression.defaultTier).toBe("full");
    expect(config.telemetry.enabled).toBe(true);
    expect(config.contextHygiene.maxTurns).toBe(50);
    expect(config.dashboard.port).toBe(7890);
  });

  it("validates config schema", () => {
    const config = loadConfig();
    const keys = Object.keys(config);
    expect(keys).toContain("identity");
    expect(keys).toContain("models");
    expect(keys).toContain("routing");
    expect(keys).toContain("compression");
    expect(keys).toContain("learning");
    expect(keys).toContain("contextHygiene");
    expect(keys).toContain("telemetry");
    expect(keys).toContain("budget");
    expect(keys).toContain("dashboard");
    expect(keys).toContain("gateway");
    expect(keys).toContain("voice");
    expect(keys).toContain("terminal");
    expect(keys).toContain("skills");
    expect(keys).toContain("memory");
  });
});
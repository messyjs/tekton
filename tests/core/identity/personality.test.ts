import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PersonalityManager, PERSONALITY_PRESETS } from "../../../packages/core/src/identity/personality.ts";
import { SoulManager } from "../../../packages/core/src/identity/soul.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function tempDir(): string {
  const dir = path.join(os.tmpdir(), `tekton-personality-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

describe("PersonalityManager", () => {
  let dir: string;
  let soulManager: SoulManager;
  let personality: PersonalityManager;

  beforeEach(() => {
    dir = tempDir();
    soulManager = new SoulManager(dir);
    soulManager.seedDefault();
    personality = new PersonalityManager(soulManager);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns SOUL.md when no overlay is set", () => {
    const effective = personality.getEffectivePersonality();
    expect(effective).toContain("Tekton");
    expect(effective).toContain("self-improving");
  });

  it("applies preset overlay by name", () => {
    personality.setOverlay("teacher");
    const effective = personality.getEffectivePersonality();
    expect(effective).toContain("Teacher Mode");
    expect(effective).toContain("Tekton"); // Soul is still included
  });

  it("applies custom overlay text", () => {
    personality.setOverlay("Be extremely verbose and explain everything in great detail.");
    const effective = personality.getEffectivePersonality();
    expect(effective).toContain("Custom Personality");
    expect(effective).toContain("verbose");
  });

  it("clears overlay", () => {
    personality.setOverlay("teacher");
    expect(personality.hasOverlay()).toBe(true);
    personality.clearOverlay();
    expect(personality.hasOverlay()).toBe(false);
    const effective = personality.getEffectivePersonality();
    expect(effective).not.toContain("Teacher Mode");
  });

  it("hasOverlay returns false initially", () => {
    expect(personality.hasOverlay()).toBe(false);
  });

  it("all presets are available", () => {
    const presetNames = Object.keys(PERSONALITY_PRESETS);
    expect(presetNames).toContain("teacher");
    expect(presetNames).toContain("reviewer");
    expect(presetNames).toContain("researcher");
    expect(presetNames).toContain("pragmatic");
    expect(presetNames).toContain("creative");
    expect(presetNames.length).toBe(5);
  });

  it("each preset has meaningful content", () => {
    for (const [name, content] of Object.entries(PERSONALITY_PRESETS)) {
      expect(content.length).toBeGreaterThan(50);
      expect(content).toContain("Overlay:");
      expect(content.length).toBeLessThan(500);
    }
  });

  it("overlay is case-insensitive for preset names", () => {
    personality.setOverlay("TEACHER");
    const effective = personality.getEffectivePersonality();
    expect(effective).toContain("Teacher Mode");
  });
});
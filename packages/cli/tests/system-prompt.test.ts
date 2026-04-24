import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generateSystemPrompt, type SystemPromptConfig } from "../src/system-prompt.js";
import { SoulManager, PersonalityManager, MemoryManager, DEFAULT_SOUL } from "@tekton/core";

// ── Mock helpers ─────────────────────────────────────────────────────

function createMockSoul(content: string): SoulManager {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tekton-test-"));
  const soul = new SoulManager(tmpDir);
  soul.setSoul(content);
  return soul;
}

function createMockPersonality(soul: SoulManager): PersonalityManager {
  return new PersonalityManager(soul);
}

function createMockMemory(tmpDir: string): MemoryManager {
  return new MemoryManager(tmpDir);
}

function defaultConfig(overrides?: Partial<SystemPromptConfig>): SystemPromptConfig {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tekton-test-"));
  const soul = createMockSoul("You are a test agent.");
  const personality = createMockPersonality(soul);
  const memory = createMockMemory(tmpDir);

  return {
    soul,
    personality,
    memory,
    activeModel: "test-model",
    routingMode: "auto",
    skillCount: 0,
    compressionLevel: "full",
    learningEnabled: true,
    memoryContent: "",
    userContext: "",
    toolSummary: "All available tools",
    skillsSummary: "",
    ...overrides,
  };
}

describe("generateSystemPrompt", () => {
  it("includes core identity section", () => {
    const config = defaultConfig();
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("self-improving coding agent");
    expect(prompt).toContain("test-model");
    expect(prompt).toContain("auto");
    expect(prompt).toContain("full");
  });

  it("includes SOUL content", () => {
    const config = defaultConfig();
    const prompt = generateSystemPrompt(config);
    // The soul content should be in the prompt (personality.getEffectivePersonality())
    expect(prompt).toContain("test agent");
  });

  it("includes memory when provided", () => {
    const config = defaultConfig({ memoryContent: "I prefer concise responses." });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Your Memory");
    expect(prompt).toContain("I prefer concise responses");
  });

  it("excludes memory when empty", () => {
    const config = defaultConfig({ memoryContent: "" });
    const prompt = generateSystemPrompt(config);
    expect(prompt).not.toContain("Your Memory");
  });

  it("includes user context when provided", () => {
    const config = defaultConfig({ userContext: "User is a Python developer." });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("About the User");
    expect(prompt).toContain("Python developer");
  });

  it("excludes user context when empty", () => {
    const config = defaultConfig({ userContext: "" });
    const prompt = generateSystemPrompt(config);
    expect(prompt).not.toContain("About the User");
  });

  it("includes tool summary", () => {
    const config = defaultConfig({ toolSummary: "Active toolsets: terminal, file, web" });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Available Tools");
    expect(prompt).toContain("Active toolsets: terminal, file, web");
  });

  it("includes skills summary when provided", () => {
    const config = defaultConfig({
      skillsSummary: "- code-review: Automated code review\n- deploy: Deploy to production",
    });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Skills Library");
    expect(prompt).toContain("code-review");
  });

  it("excludes skills summary when empty", () => {
    const config = defaultConfig({ skillsSummary: "" });
    const prompt = generateSystemPrompt(config);
    expect(prompt).not.toContain("Skills Library");
  });

  it("includes communication rules", () => {
    const config = defaultConfig();
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Communication Rules");
    expect(prompt).toContain("caveman compression");
  });

  it("includes self-improvement when learning enabled", () => {
    const config = defaultConfig({ learningEnabled: true });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Self-Improvement");
  });

  it("excludes self-improvement when learning disabled", () => {
    const config = defaultConfig({ learningEnabled: false });
    const prompt = generateSystemPrompt(config);
    expect(prompt).not.toContain("Self-Improvement");
  });

  it("includes SCP delegation format", () => {
    const config = defaultConfig();
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Sub-Agent Delegation");
    expect(prompt).toContain("delegate");
  });

  it("includes token budget when provided", () => {
    const config = defaultConfig({ budgetContext: "Remaining: 50,000 tokens" });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Token Budget");
    expect(prompt).toContain("50,000");
  });

  it("excludes token budget when not provided", () => {
    const config = defaultConfig();
    const prompt = generateSystemPrompt(config);
    expect(prompt).not.toContain("Token Budget");
  });

  it("includes personality overlay", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tekton-test-"));
    const soul = createMockSoul("Base personality");
    const personality = createMockPersonality(soul);
    personality.setOverlay("teacher");
    const memory = createMockMemory(tmpDir);

    const config = defaultConfig({ soul, personality, memory });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("Teacher Mode");
  });

  it("learning paused shows in identity", () => {
    const config = defaultConfig({ learningEnabled: false });
    const prompt = generateSystemPrompt(config);
    expect(prompt).toContain("paused");
  });
});
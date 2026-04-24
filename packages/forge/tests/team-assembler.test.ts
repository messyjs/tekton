import { describe, it, expect } from "vitest";
import { mergeTemplates } from "@tekton/forge";
import type { TeamTemplate } from "@tekton/forge";

const vstTemplate: TeamTemplate = {
  domain: "vst-audio",
  roles: [
    { id: "dsp-engineer", name: "DSP Engineer", systemPrompt: "DSP", tools: ["file", "terminal"], model: "deep", sessionLimit: 25 },
    { id: "audio-ui-designer", name: "Audio UI Designer", systemPrompt: "UI", tools: ["file", "terminal"], model: "deep", sessionLimit: 20 },
  ],
  testRoles: [
    { id: "pluginval-tester", name: "Pluginval Tester", systemPrompt: "Test", tools: ["terminal"], model: "fast", sessionLimit: 15 },
  ],
  projectTemplate: "juce-vst",
  buildCommand: "cmake --build build --config Release",
  testCommand: "ctest",
  requiredTools: ["cmake", "git"],
  optionalTools: ["juce", "pluginval"],
};

const webTemplate: TeamTemplate = {
  domain: "web-app",
  roles: [
    { id: "frontend-developer", name: "Frontend Developer", systemPrompt: "Frontend", tools: ["file", "terminal", "browser"], model: "deep", sessionLimit: 20 },
    { id: "backend-developer", name: "Backend Developer", systemPrompt: "Backend", tools: ["file", "terminal", "web"], model: "deep", sessionLimit: 20 },
  ],
  testRoles: [
    { id: "web-unit-tester", name: "Web Unit Tester", systemPrompt: "Test", tools: ["terminal"], model: "fast", sessionLimit: 15 },
  ],
  projectTemplate: "react-webapp",
  buildCommand: "npm run build",
  testCommand: "npm test",
  requiredTools: ["node", "npm", "git"],
  optionalTools: ["docker"],
};

describe("Team Assembler", () => {
  it("single domain passes through unchanged", () => {
    const result = mergeTemplates([vstTemplate]);
    expect(result.domain).toBe("vst-audio");
    expect(result.roles).toHaveLength(2);
    expect(result.buildCommand).toBe("cmake --build build --config Release");
  });

  it("two domains merge correctly", () => {
    const result = mergeTemplates([vstTemplate, webTemplate]);
    expect(result.domain).toBe("vst-audio+web-app");
    expect(result.roles).toHaveLength(4);
    expect(result.testRoles).toHaveLength(2);
  });

  it("duplicate roles are removed (keeps first)", () => {
    const withDupe: TeamTemplate = {
      ...webTemplate,
      roles: [
        ...webTemplate.roles,
        { id: "frontend-developer", name: "Frontend Dev 2", systemPrompt: "Frontend2", tools: ["file"], model: "fast", sessionLimit: 10 },
      ],
    };
    const result = mergeTemplates([webTemplate, withDupe]);
    // frontend-developer appears in both, should de-duplicate
    const roleIds = result.roles.map(r => r.id);
    expect(roleIds).toHaveLength(2);
  });

  it("build commands are combined with &&", () => {
    const result = mergeTemplates([vstTemplate, webTemplate]);
    expect(result.buildCommand).toBe("cmake --build build --config Release && npm run build");
  });

  it("required tools are unioned", () => {
    const result = mergeTemplates([vstTemplate, webTemplate]);
    expect(result.requiredTools).toContain("cmake");
    expect(result.requiredTools).toContain("node");
    expect(result.requiredTools).toContain("git");
    // git appears in both but should not be duplicated
    const gitCount = result.requiredTools.filter(t => t === "git").length;
    expect(gitCount).toBe(1);
  });

  it("throws on empty templates array", () => {
    expect(() => mergeTemplates([])).toThrow("Cannot merge zero templates");
  });

  it("project template uses first domain", () => {
    const result = mergeTemplates([vstTemplate, webTemplate]);
    expect(result.projectTemplate).toBe("juce-vst");
  });
});
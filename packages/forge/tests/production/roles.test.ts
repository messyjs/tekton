import { describe, it, expect } from "vitest";
import { roleRegistry, getRoleDefinition, listRoleIds, validateRole, buildSystemPrompt } from "../../src/production/roles/index.js";
import type { RoleDefinition } from "../../src/types.js";

describe("Role Definitions", () => {
  const ALL_ROLE_IDS = [
    // Audio (4)
    "dsp-engineer", "audio-ui-designer", "preset-architect", "audio-build-engineer",
    // Web (3)
    "frontend-developer", "backend-developer", "devops-agent",
    // Desktop (4)
    "systems-architect", "core-developer", "ui-builder", "installer-engineer",
    // Unreal (4)
    "gameplay-programmer", "blueprint-designer", "level-builder", "shader-author",
    // Mobile (2)
    "mobile-architect", "platform-integrator",
    // CAD (4)
    "parametric-designer", "mechanical-engineer", "render-agent", "dfm-reviewer",
    // Shared (2)
    "documentation-writer", "config-manager",
  ];

  it("all roles load and have required fields", () => {
    for (const roleId of ALL_ROLE_IDS) {
      const role = roleRegistry[roleId];
      expect(role).toBeDefined();
      expect(role.id).toBe(roleId);
      expect(role.name).toBeTruthy();
      expect(role.systemPrompt.length).toBeGreaterThan(50);
      expect(Array.isArray(role.tools)).toBe(true);
      expect(role.tools.length).toBeGreaterThan(0);
      expect(role.model).toBeTruthy();
      expect(role.sessionLimit).toBeGreaterThan(0);
    }
  });

  it("roleRegistry contains all expected role IDs", () => {
    expect(Object.keys(roleRegistry).length).toBe(23);
    for (const roleId of ALL_ROLE_IDS) {
      expect(roleRegistry[roleId]).toBeDefined();
    }
  });

  it("system prompts mention beta file naming", () => {
    for (const roleId of ALL_ROLE_IDS) {
      const role = roleRegistry[roleId];
      expect(role.systemPrompt).toContain(".beta");
    }
  });

  it("audio roles mention JUCE-specific terms", () => {
    const audioRoles = ["dsp-engineer", "audio-ui-designer", "preset-architect", "audio-build-engineer"];
    for (const roleId of audioRoles) {
      const role = roleRegistry[roleId];
      const prompt = role.systemPrompt.toLowerCase();
      expect(prompt).toMatch(/juce|audio|plugin|vst/);
    }
  });

  it("web roles mention web technologies", () => {
    const webRoles = ["frontend-developer", "backend-developer", "devops-agent"];
    for (const roleId of webRoles) {
      const role = roleRegistry[roleId];
      const prompt = role.systemPrompt.toLowerCase();
      expect(prompt).toMatch(/react|node|docker|api|typescript|css/);
    }
  });

  it("desktop roles mention desktop technologies", () => {
    const desktopRoles = ["systems-architect", "ui-builder", "installer-engineer"];
    for (const roleId of desktopRoles) {
      const role = roleRegistry[roleId];
      const prompt = role.systemPrompt.toLowerCase();
      expect(prompt).toMatch(/\.net|wpf|winui|xaml|qt|msix|wix|desktop/);
    }
  });

  it("unreal roles mention UE5 terms", () => {
    const unrealRoles = ["gameplay-programmer", "blueprint-designer", "level-builder", "shader-author"];
    for (const roleId of unrealRoles) {
      const role = roleRegistry[roleId];
      const prompt = role.systemPrompt.toLowerCase();
      expect(prompt).toMatch(/unreal|ue5|blueprint|material|niagara|actor/);
    }
  });

  it("mobile roles mention mobile technologies", () => {
    const mobileRoles = ["mobile-architect", "platform-integrator"];
    for (const roleId of mobileRoles) {
      const role = roleRegistry[roleId];
      const prompt = role.systemPrompt.toLowerCase();
      expect(prompt).toMatch(/kotlin|swift|jetpack|swiftui|gradle|xcode|android|ios/);
    }
  });

  it("cad roles mention CAD/3D print terms", () => {
    const cadRoles = ["parametric-designer", "mechanical-engineer", "render-agent", "dfm-reviewer"];
    for (const roleId of cadRoles) {
      const role = roleRegistry[roleId];
      const prompt = role.systemPrompt.toLowerCase();
      expect(prompt).toMatch(/openscad|stl|print|cad|material|design/);
    }
  });

  it("getRoleDefinition returns correct role", () => {
    const role = getRoleDefinition("dsp-engineer");
    expect(role).toBeDefined();
    expect(role!.name).toBe("DSP Engineer");
  });

  it("getRoleDefinition returns undefined for unknown role", () => {
    expect(getRoleDefinition("unknown-role")).toBeUndefined();
  });

  it("listRoleIds returns all 23 role IDs", () => {
    const ids = listRoleIds();
    expect(ids).toHaveLength(23);
  });

  it("validateRole passes for valid roles", () => {
    for (const roleId of listRoleIds()) {
      const role = roleRegistry[roleId];
      const errors = validateRole(role);
      expect(errors).toHaveLength(0);
    }
  });

  it("validateRole catches missing fields", () => {
    const badRole = { id: "", name: "", systemPrompt: "", tools: [], model: "", sessionLimit: 0 };
    const errors = validateRole(badRole as RoleDefinition);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("buildSystemPrompt includes task info", () => {
    const role = roleRegistry["frontend-developer"];
    const prompt = buildSystemPrompt(role, "Build Login Page", "Implement login form with validation");
    expect(prompt).toContain("Build Login Page");
    expect(prompt).toContain("Implement login form with validation");
    expect(prompt).toContain("Frontend Developer");
  });
});
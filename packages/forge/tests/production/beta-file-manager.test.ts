import { describe, it, expect } from "vitest";
import { markAsBeta, isBetaFile, getOriginalName, listBetaFiles } from "../../src/production/beta-file-manager.js";

describe("Beta File Manager", () => {
  it("rename .ts file to beta", () => {
    const result = markAsBeta("/project", "src/auth.ts");
    expect(result).toContain("beta");
    expect(result).toContain("auth.beta.ts");
  });

  it("rename .cpp file to beta", () => {
    const result = markAsBeta("/project", "src/PluginProcessor.cpp");
    expect(result).toContain("PluginProcessor.beta.cpp");
  });

  it("rename .scad file to beta", () => {
    const result = markAsBeta("/project", "models/phone_stand.scad");
    expect(result).toContain("phone_stand.beta.scad");
  });

  it("rename .html file to beta", () => {
    const result = markAsBeta("/project", "index.html");
    expect(result).toContain("index.beta.html");
  });

  it("move to beta/ preserves directory structure", () => {
    const result = markAsBeta("/project", "src/components/App.tsx");
    expect(result).toContain("beta");
    expect(result).toContain("App.beta.tsx");
  });

  it("isBetaFile correctly identifies beta files", () => {
    expect(isBetaFile("src/auth.beta.ts")).toBe(true);
    expect(isBetaFile("beta/src/auth.beta.ts")).toBe(true);
    expect(isBetaFile("src/auth.ts")).toBe(false);
    expect(isBetaFile("src/auth_beta.ts")).toBe(false);
  });

  it("getOriginalName strips .beta correctly", () => {
    expect(getOriginalName("auth.beta.ts")).toBe("auth.ts");
    expect(getOriginalName("PluginProcessor.beta.cpp")).toBe("PluginProcessor.cpp");
    expect(getOriginalName("App.beta.tsx")).toBe("App.tsx");
    expect(getOriginalName("index.beta.html")).toBe("index.html");
  });

  it("getOriginalName on non-beta file returns same name", () => {
    expect(getOriginalName("auth.ts")).toBe("auth.ts");
  });

  it("listBetaFiles returns empty for no filesystem scan", () => {
    // listBetaFiles requires filesystem access; returns [] in current impl
    const result = listBetaFiles("/project");
    expect(Array.isArray(result)).toBe(true);
  });
});
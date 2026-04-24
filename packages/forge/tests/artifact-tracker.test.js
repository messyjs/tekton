import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { markBeta, markTesting, promote, getStatus } from "@tekton/forge";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
describe("Artifact Tracker", () => {
    let projectDir;
    beforeEach(() => {
        projectDir = mkdtempSync(join(tmpdir(), "forge-artifact-test-"));
        mkdirSync(join(projectDir, "src"), { recursive: true });
        mkdirSync(join(projectDir, "beta"), { recursive: true });
        mkdirSync(join(projectDir, "testing"), { recursive: true });
        mkdirSync(join(projectDir, "release"), { recursive: true });
    });
    afterEach(() => {
        rmSync(projectDir, { recursive: true, force: true });
    });
    it("markBeta moves file to beta directory", () => {
        const srcFile = join(projectDir, "src", "main.cpp");
        writeFileSync(srcFile, "int main() {}");
        const result = markBeta(projectDir, srcFile);
        expect(result).toContain("beta");
        expect(existsSync(join(projectDir, "beta", "main.cpp"))).toBe(true);
        expect(existsSync(srcFile)).toBe(false);
    });
    it("markTesting moves file to testing directory", () => {
        const betaFile = join(projectDir, "beta", "main.cpp");
        writeFileSync(betaFile, "int main() {}");
        const result = markTesting(projectDir, betaFile);
        expect(result).toContain("testing");
        expect(existsSync(join(projectDir, "testing", "main.cpp"))).toBe(true);
    });
    it("promote works with signoffs present", () => {
        const testingFile = join(projectDir, "testing", "main.cpp");
        writeFileSync(testingFile, "int main() {}");
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: ["vst-audio"],
            artifacts: [],
            qaSignoffs: [{
                    artifactPath: "main.cpp",
                    testerRole: "pluginval-tester",
                    passed: true,
                    notes: "All tests pass",
                    timestamp: Date.now(),
                }],
            currentPhase: "production",
        };
        const result = promote(projectDir, testingFile, manifest);
        expect(result).toContain("release");
        expect(existsSync(join(projectDir, "release", "main.cpp"))).toBe(true);
    });
    it("promote throws without signoffs", () => {
        const testingFile = join(projectDir, "testing", "main.cpp");
        writeFileSync(testingFile, "int main() {}");
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: [],
            artifacts: [],
            qaSignoffs: [],
            currentPhase: "production",
        };
        expect(() => promote(projectDir, testingFile, manifest)).toThrow("no QA signoffs");
    });
    it("promote throws when all signoffs failed", () => {
        const testingFile = join(projectDir, "testing", "main.cpp");
        writeFileSync(testingFile, "int main() {}");
        const manifest = {
            projectId: "proj-1",
            briefId: "brief-1",
            domains: [],
            artifacts: [],
            qaSignoffs: [{
                    artifactPath: "main.cpp",
                    testerRole: "tester",
                    passed: false,
                    notes: "Failed",
                    timestamp: Date.now(),
                }],
            currentPhase: "production",
        };
        expect(() => promote(projectDir, testingFile, manifest)).toThrow("no passing QA signoffs");
    });
    it("getStatus returns correct status based on location", () => {
        const srcFile = join(projectDir, "src", "main.cpp");
        writeFileSync(srcFile, "code");
        expect(getStatus(projectDir, srcFile)).toBe("draft");
        expect(getStatus(projectDir, join(projectDir, "beta", "main.cpp"))).toBe("beta");
        expect(getStatus(projectDir, join(projectDir, "testing", "main.cpp"))).toBe("testing");
        expect(getStatus(projectDir, join(projectDir, "release", "main.cpp"))).toBe("release");
    });
    it("getStatus returns null for non-existent file", () => {
        expect(getStatus(projectDir, join(projectDir, "nonexistent.txt"))).toBeNull();
    });
});
//# sourceMappingURL=artifact-tracker.test.js.map
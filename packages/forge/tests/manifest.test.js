import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadManifest, saveManifest, addArtifact, updateArtifactStatus, getArtifactsByStatus, addQASignoff, getSignoffs } from "@tekton/forge";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
describe("Forge Manifest", () => {
    let testDir;
    beforeEach(() => {
        testDir = mkdtempSync(join(tmpdir(), "forge-manifest-test-"));
    });
    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });
    it("creates a minimal manifest if none exists", () => {
        const manifest = loadManifest(testDir, "test-project");
        expect(manifest.projectId).toBe("test-project");
        expect(manifest.domains).toEqual([]);
        expect(manifest.artifacts).toEqual([]);
        expect(manifest.qaSignoffs).toEqual([]);
        expect(manifest.currentPhase).toBe("ideation");
    });
    it("saves and reloads manifest", () => {
        const manifest = loadManifest(testDir, "test-project");
        manifest.briefId = "brief-123";
        manifest.domains = ["web-app"];
        saveManifest(testDir, manifest);
        const reloaded = loadManifest(testDir);
        expect(reloaded.briefId).toBe("brief-123");
        expect(reloaded.domains).toEqual(["web-app"]);
    });
    it("adds artifacts", () => {
        let manifest = loadManifest(testDir, "test-project");
        const artifact = {
            path: "src/index.ts",
            status: "draft",
            producedBy: "frontend-developer",
            taskCardId: "tc-1",
            lastModified: Date.now(),
            testedBy: [],
            hash: "abc123",
        };
        manifest = addArtifact(manifest, artifact);
        expect(manifest.artifacts).toHaveLength(1);
        expect(manifest.artifacts[0].path).toBe("src/index.ts");
    });
    it("updates artifact status", () => {
        let manifest = loadManifest(testDir, "test-project");
        manifest = addArtifact(manifest, {
            path: "src/main.ts",
            status: "draft",
            producedBy: "dev",
            taskCardId: "tc-1",
            lastModified: 1000,
            testedBy: [],
            hash: "abc",
        });
        manifest = updateArtifactStatus(manifest, "src/main.ts", "beta");
        expect(manifest.artifacts[0].status).toBe("beta");
    });
    it("filters artifacts by status", () => {
        let manifest = loadManifest(testDir, "test-project");
        manifest = addArtifact(manifest, { path: "a.ts", status: "draft", producedBy: "dev", taskCardId: "tc-1", lastModified: 1000, testedBy: [], hash: "a1" });
        manifest = addArtifact(manifest, { path: "b.ts", status: "beta", producedBy: "dev", taskCardId: "tc-2", lastModified: 2000, testedBy: [], hash: "b2" });
        manifest = addArtifact(manifest, { path: "c.ts", status: "release", producedBy: "dev", taskCardId: "tc-3", lastModified: 3000, testedBy: [], hash: "c3" });
        const beta = getArtifactsByStatus(manifest, "beta");
        expect(beta).toHaveLength(1);
        expect(beta[0].path).toBe("b.ts");
    });
    it("tracks QA signoffs", () => {
        let manifest = loadManifest(testDir, "test-project");
        const signoff = {
            artifactPath: "src/main.ts",
            testerRole: "pluginval-tester",
            passed: true,
            notes: "All tests pass",
            timestamp: Date.now(),
        };
        manifest = addQASignoff(manifest, signoff);
        expect(manifest.qaSignoffs).toHaveLength(1);
    });
    it("gets signoffs for a specific artifact", () => {
        let manifest = loadManifest(testDir, "test-project");
        manifest = addQASignoff(manifest, { artifactPath: "a.ts", testerRole: "t1", passed: true, notes: "", timestamp: 1 });
        manifest = addQASignoff(manifest, { artifactPath: "b.ts", testerRole: "t2", passed: false, notes: "Failed", timestamp: 2 });
        manifest = addQASignoff(manifest, { artifactPath: "a.ts", testerRole: "t3", passed: true, notes: "Good", timestamp: 3 });
        const signoffsA = getSignoffs(manifest, "a.ts");
        expect(signoffsA).toHaveLength(2);
        const signoffsB = getSignoffs(manifest, "b.ts");
        expect(signoffsB).toHaveLength(1);
    });
});
//# sourceMappingURL=manifest.test.js.map
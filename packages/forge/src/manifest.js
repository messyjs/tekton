/**
 * Forge Manifest — CRUD operations for project manifest files.
 *
 * The manifest tracks project state: domains, artifacts, QA signoffs, phase.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
const MANIFEST_FILE = "forge-manifest.json";
/**
 * Load a manifest from a project directory.
 * Creates a minimal manifest if none exists.
 */
export function loadManifest(projectDir, projectId) {
    const filePath = join(projectDir, MANIFEST_FILE);
    if (existsSync(filePath)) {
        const content = readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
    // Create minimal manifest
    const manifest = {
        projectId: projectId ?? `project-${randomUUID().slice(0, 8)}`,
        briefId: "",
        domains: [],
        artifacts: [],
        qaSignoffs: [],
        currentPhase: "ideation",
    };
    // Ensure directory exists
    if (!existsSync(projectDir)) {
        mkdirSync(projectDir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");
    return manifest;
}
/**
 * Save a manifest to a project directory.
 */
export function saveManifest(projectDir, manifest) {
    const filePath = join(projectDir, MANIFEST_FILE);
    writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}
/**
 * Add an artifact to the manifest.
 */
export function addArtifact(manifest, artifact) {
    return {
        ...manifest,
        artifacts: [...manifest.artifacts, artifact],
    };
}
/**
 * Update the status of an artifact by path.
 */
export function updateArtifactStatus(manifest, path, newStatus) {
    return {
        ...manifest,
        artifacts: manifest.artifacts.map(a => a.path === path ? { ...a, status: newStatus, lastModified: Date.now() } : a),
    };
}
/**
 * Get artifacts filtered by status.
 */
export function getArtifactsByStatus(manifest, status) {
    return manifest.artifacts.filter(a => a.status === status);
}
/**
 * Add a QA signoff to the manifest.
 */
export function addQASignoff(manifest, signoff) {
    return {
        ...manifest,
        qaSignoffs: [...manifest.qaSignoffs, signoff],
    };
}
/**
 * Get all QA signoffs for a specific artifact path.
 */
export function getSignoffs(manifest, artifactPath) {
    return manifest.qaSignoffs.filter(s => s.artifactPath === artifactPath);
}
//# sourceMappingURL=manifest.js.map
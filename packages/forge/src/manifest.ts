/**
 * Forge Manifest — CRUD operations for project manifest files.
 *
 * The manifest tracks project state: domains, artifacts, QA signoffs, phase.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { ForgeManifest, ArtifactEntry, ArtifactStatus, QASignoff } from "./types.js";
import { randomUUID } from "node:crypto";

const MANIFEST_FILE = "forge-manifest.json";

/**
 * Load a manifest from a project directory.
 * Creates a minimal manifest if none exists.
 */
export function loadManifest(projectDir: string, projectId?: string): ForgeManifest {
  const filePath = join(projectDir, MANIFEST_FILE);

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as ForgeManifest;
  }

  // Create minimal manifest
  const manifest: ForgeManifest = {
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
export function saveManifest(projectDir: string, manifest: ForgeManifest): void {
  const filePath = join(projectDir, MANIFEST_FILE);
  writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");
}

/**
 * Add an artifact to the manifest.
 */
export function addArtifact(manifest: ForgeManifest, artifact: ArtifactEntry): ForgeManifest {
  return {
    ...manifest,
    artifacts: [...manifest.artifacts, artifact],
  };
}

/**
 * Update the status of an artifact by path.
 */
export function updateArtifactStatus(manifest: ForgeManifest, path: string, newStatus: ArtifactStatus): ForgeManifest {
  return {
    ...manifest,
    artifacts: manifest.artifacts.map(a =>
      a.path === path ? { ...a, status: newStatus, lastModified: Date.now() } : a
    ),
  };
}

/**
 * Get artifacts filtered by status.
 */
export function getArtifactsByStatus(manifest: ForgeManifest, status: ArtifactStatus): ArtifactEntry[] {
  return manifest.artifacts.filter(a => a.status === status);
}

/**
 * Add a QA signoff to the manifest.
 */
export function addQASignoff(manifest: ForgeManifest, signoff: QASignoff): ForgeManifest {
  return {
    ...manifest,
    qaSignoffs: [...manifest.qaSignoffs, signoff],
  };
}

/**
 * Get all QA signoffs for a specific artifact path.
 */
export function getSignoffs(manifest: ForgeManifest, artifactPath: string): QASignoff[] {
  return manifest.qaSignoffs.filter(s => s.artifactPath === artifactPath);
}
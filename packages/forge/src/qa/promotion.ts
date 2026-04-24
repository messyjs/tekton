/**
 * Promotion — Promotes artifacts from beta to release status.
 *
 * Only promotes artifacts that have full QA signoffs.
 */
import { existsSync, renameSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import type { ForgeManifest, ArtifactEntry } from "../types.js";
import { getOriginalName } from "../production/beta-file-manager.js";

/**
 * Promote a single artifact from beta to release.
 *
 * 1. Check manifest for QA signoffs on this artifact — THROW if missing
 * 2. Get original name via beta-file-manager
 * 3. Move from beta/ to final location (e.g., src/)
 * 4. Update manifest: artifact status → "release"
 * 5. Return new path
 */
export function promoteArtifact(
  projectDir: string,
  betaPath: string,
  manifest: ForgeManifest,
): { newPath: string; updatedManifest: ForgeManifest } {
  const fileName = basename(betaPath);

  // 1. Check QA signoffs
  const signoffs = manifest.qaSignoffs.filter(s =>
    s.artifactPath === fileName || s.artifactPath === betaPath
  );

  if (signoffs.length === 0) {
    throw new Error(
      `Cannot promote "${fileName}" to release: no QA signoffs found. ` +
      `All artifacts must have at least one passing QA signoff before release.`
    );
  }

  const hasPassed = signoffs.some(s => s.passed);
  if (!hasPassed) {
    throw new Error(
      `Cannot promote "${fileName}" to release: no passing QA signoffs. ` +
      `At least one passing signoff is required.`
    );
  }

  // 2. Get original name
  const originalName = getOriginalName(betaPath);

  // 3. Move from beta to release directory
  const srcPath = join(projectDir, betaPath);
  const releaseDir = join(projectDir, "release");
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true });
  }

  const newPath = join(releaseDir, originalName);

  if (existsSync(srcPath)) {
    renameSync(srcPath, newPath);
  } else if (existsSync(join(projectDir, "beta", fileName))) {
    renameSync(join(projectDir, "beta", fileName), newPath);
  }

  // 4. Update manifest
  const updatedManifest: ForgeManifest = {
    ...manifest,
    artifacts: manifest.artifacts.map(a =>
      a.path === betaPath || a.path === fileName
        ? { ...a, status: "release" as const, lastModified: Date.now(), path: originalName }
        : a
    ),
  };

  return { newPath, updatedManifest };
}

/**
 * Promote all artifacts that have full QA signoffs.
 *
 * Skips any without signoffs (logs warning).
 * Returns list of promoted paths.
 */
export function promoteAll(
  projectDir: string,
  manifest: ForgeManifest,
): { promotedPaths: string[]; updatedManifest: ForgeManifest; skipped: string[] } {
  const promotedPaths: string[] = [];
  const skipped: string[] = [];
  let currentManifest = manifest;

  // Get all beta artifacts
  const betaArtifacts = manifest.artifacts.filter(a => a.status === "beta" || a.status === "testing");

  for (const artifact of betaArtifacts) {
    try {
      const result = promoteArtifact(projectDir, artifact.path, currentManifest);
      promotedPaths.push(result.newPath);
      currentManifest = result.updatedManifest;
    } catch {
      skipped.push(artifact.path);
    }
  }

  return { promotedPaths, updatedManifest: currentManifest, skipped };
}
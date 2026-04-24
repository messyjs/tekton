/**
 * Artifact Tracker — Track file status through draft → beta → testing → release.
 *
 * Manages file moves between directories and naming conventions
 * based on artifact lifecycle.
 */
import { existsSync, renameSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import type { ForgeManifest, ArtifactStatus } from "./types.js";

// ── Status transitions ─────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ArtifactStatus, ArtifactStatus[]> = {
  "draft": ["beta"],
  "beta": ["testing", "draft"],
  "testing": ["release", "beta"],
  "release": [], // terminal
};

/**
 * Mark an artifact as beta: moves it from src/ to beta/ directory.
 */
export function markBeta(projectDir: string, filePath: string): string {
  const betaDir = join(projectDir, "beta");
  if (!existsSync(betaDir)) {
    mkdirSync(betaDir, { recursive: true });
  }

  const fileName = basename(filePath);
  const targetPath = join(betaDir, fileName);

  if (existsSync(filePath)) {
    renameSync(filePath, targetPath);
  }

  return targetPath;
}

/**
 * Mark an artifact as testing: moves it from beta/ to testing/ directory.
 */
export function markTesting(projectDir: string, filePath: string): string {
  const testingDir = join(projectDir, "testing");
  if (!existsSync(testingDir)) {
    mkdirSync(testingDir, { recursive: true });
  }

  const fileName = basename(filePath);
  const targetPath = join(testingDir, fileName);

  if (existsSync(filePath)) {
    renameSync(filePath, targetPath);
  }

  return targetPath;
}

/**
 * Promote an artifact to release: removes beta tag, moves to final location.
 * THROWS if the manifest has no QA signoffs for this artifact.
 */
export function promote(projectDir: string, filePath: string, manifest: ForgeManifest): string {
  // Check for QA signoffs
  const fileName = basename(filePath);
  const signoffs = manifest.qaSignoffs.filter(s => s.artifactPath === fileName || s.artifactPath === filePath);

  if (signoffs.length === 0) {
    throw new Error(
      `Cannot promote "${fileName}" to release: no QA signoffs found. ` +
      `All artifacts must have at least one passing QA signoff before release.`
    );
  }

  // Check if at least one signoff passed
  const hasPassed = signoffs.some(s => s.passed);
  if (!hasPassed) {
    throw new Error(
      `Cannot promote "${fileName}" to release: no passing QA signoffs found. ` +
      `At least one passing signoff is required.`
    );
  }

  const releaseDir = join(projectDir, "release");
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true });
  }

  const targetPath = join(releaseDir, fileName);

  if (existsSync(filePath)) {
    renameSync(filePath, targetPath);
  }

  return targetPath;
}

/**
 * Get the current status of an artifact based on its location.
 */
export function getStatus(projectDir: string, filePath: string): ArtifactStatus | null {
  const absPath = filePath.startsWith("/") || filePath.includes(":") ? filePath : join(projectDir, filePath);

  if (absPath.includes(join("release", "") ) || absPath.startsWith(join(projectDir, "release"))) {
    return "release";
  }
  if (absPath.includes(join("testing", "")) || absPath.startsWith(join(projectDir, "testing"))) {
    return "testing";
  }
  if (absPath.includes(join("beta", "")) || absPath.startsWith(join(projectDir, "beta"))) {
    return "beta";
  }

  // Default to draft if file exists in project root or src/
  if (existsSync(absPath)) {
    return "draft";
  }

  return null;
}
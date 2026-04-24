/**
 * Beta File Manager — Tracks beta file naming and organization.
 *
 * Production agents save files with .beta suffix. This module manages
 * the beta → stable transition and file tracking.
 */
import { join, dirname, basename, extname } from "node:path";

/**
 * Mark a file as beta by renaming with .beta suffix and moving to beta/ directory.
 * Returns the new path.
 */
export function markAsBeta(projectDir: string, filePath: string): string {
  const dir = dirname(filePath);
  const base = basename(filePath, extname(filePath));
  const ext = extname(filePath);
  const betaName = `${base}.beta${ext}`;
  const betaDir = dir === "." ? "beta" : `beta/${dir}`;
  return join(projectDir, betaDir, betaName);
}

/**
 * Check if a file path is a beta file.
 */
export function isBetaFile(path: string): boolean {
  // Check for .beta. pattern in filename (e.g., auth.beta.ts)
  const base = basename(path);
  return /\.beta\./.test(base);
}

/**
 * Get the original (non-beta) name from a beta file path.
 * Strips the .beta suffix: "auth.beta.ts" → "auth.ts"
 */
export function getOriginalName(betaPath: string): string {
  const base = basename(betaPath);
  const cleaned = base.replace(/\.beta\./, ".");
  return cleaned;
}

/**
 * List all beta files in a project directory.
 * In a real implementation, this would scan the filesystem.
 * For testing, it returns paths based on the beta naming convention.
 */
export function listBetaFiles(projectDir: string): string[] {
  // Placeholder: in production, this would use fs.readdir with recursive scanning
  // Currently returns empty array as this requires filesystem access
  return [];
}
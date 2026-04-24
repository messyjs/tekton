/**
 * File Tracker — Tracks file changes during a production session.
 *
 * Uses SHA-256 hashing to detect file modifications, creations, and deletions.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { FileChange } from "../types.js";

export interface FileChangeWithRole extends FileChange {
  agentRole: string;
}

export class FileTracker {
  private projectDir: string;
  private snapshot: Map<string, string> = new Map(); // path → hash
  private changes: FileChangeWithRole[] = [];
  private tracking = false;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Start tracking. Takes a snapshot of current file hashes.
   */
  startTracking(): void {
    this.snapshot = this.takeSnapshot();
    this.changes = [];
    this.tracking = true;
  }

  /**
   * Get changes since last snapshot by comparing current state.
   */
  getChanges(): FileChange[] {
    if (!this.tracking) return [];

    const current = this.takeSnapshot();
    const changes: FileChange[] = [...this.changes];

    // Detect new files
    for (const [path, hash] of current) {
      if (!this.snapshot.has(path)) {
        changes.push({
          path,
          action: "created",
          status: "beta",
          hash,
        });
      } else if (this.snapshot.get(path) !== hash) {
        changes.push({
          path,
          action: "modified",
          status: "beta",
          hash,
        });
      }
    }

    // Detect deleted files
    for (const [path] of this.snapshot) {
      if (!current.has(path)) {
        changes.push({
          path,
          action: "deleted",
          status: "draft",
          hash: "",
        });
      }
    }

    return changes;
  }

  /**
   * Manually record a change with role attribution.
   */
  recordChange(path: string, action: "created" | "modified" | "deleted", agentRole: string): void {
    const hash = action === "deleted" ? "" : this.hashFile(path);
    this.changes.push({
      path,
      action,
      status: "beta",
      hash,
      agentRole,
    } as FileChangeWithRole);
  }

  /**
   * Get changes attributed to a specific role.
   */
  getChangesByRole(role: string): FileChange[] {
    return this.changes
      .filter(c => (c as FileChangeWithRole).agentRole === role);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private takeSnapshot(): Map<string, string> {
    const snapshot = new Map<string, string>();

    if (!existsSync(this.projectDir)) {
      return snapshot;
    }

    this.walkDirectory(this.projectDir, snapshot);
    return snapshot;
  }

  private walkDirectory(dir: string, snapshot: Map<string, string>): void {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip hidden dirs, node_modules, etc.
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".git") {
          continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          this.walkDirectory(fullPath, snapshot);
        } else if (entry.isFile()) {
          const hash = this.hashFile(fullPath);
          if (hash) {
            const relativePath = fullPath.replace(this.projectDir + "/", "").replace(this.projectDir + "\\", "");
            snapshot.set(relativePath, hash);
          }
        }
      }
    } catch {
      // Directory might not be accessible
    }
  }

  private hashFile(filePath: string): string {
    try {
      if (!existsSync(filePath)) return "";
      const content = readFileSync(filePath);
      return createHash("sha256").update(content).digest("hex").slice(0, 16);
    } catch {
      return "";
    }
  }
}
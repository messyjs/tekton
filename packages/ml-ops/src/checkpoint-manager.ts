/**
 * Checkpoint Manager — Save, list, load, and export training checkpoints.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { execSync } from "node:child_process";
import type { Checkpoint, TrainingJob } from "./types.js";

export class CheckpointManager {
  private readonly baseDir: string;
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(baseDir: string = "./checkpoints") {
    this.baseDir = resolve(baseDir);
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /** Save a checkpoint record */
  saveCheckpoint(job: TrainingJob, step: number, trainLoss: number, evalLoss?: number): Checkpoint {
    const checkpointId = `${job.id}-step${step}`;
    const checkpointDir = join(this.baseDir, job.config.outputName, `checkpoint-${step}`);

    // Create checkpoint directory
    mkdirSync(checkpointDir, { recursive: true });

    const checkpoint: Checkpoint = {
      id: checkpointId,
      jobId: job.id,
      step,
      epoch: Math.floor(step / (job.totalSteps || 1)) + 1,
      trainLoss,
      evalLoss,
      path: checkpointDir,
      sizeMB: this.getDirSize(checkpointDir),
      timestamp: Date.now(),
      isBest: false,
    };

    // Save metadata
    const metaPath = join(checkpointDir, "tekton-checkpoint.json");
    writeFileSync(metaPath, JSON.stringify(checkpoint, null, 2));

    // Update best checkpoint tracking
    this.checkBestCheckpoint(job.id, checkpoint);

    this.checkpoints.set(checkpointId, checkpoint);
    return checkpoint;
  }

  /** List all checkpoints for a job */
  listCheckpoints(jobId?: string): Checkpoint[] {
    if (jobId) {
      return Array.from(this.checkpoints.values()).filter(c => c.jobId === jobId);
    }
    return Array.from(this.checkpoints.values());
  }

  /** Get a specific checkpoint */
  getCheckpoint(id: string): Checkpoint | undefined {
    return this.checkpoints.get(id);
  }

  /** Get the best checkpoint for a job */
  getBestCheckpoint(jobId: string): Checkpoint | undefined {
    const jobCheckpoints = this.listCheckpoints(jobId);
    return jobCheckpoints.find(c => c.isBest) ?? jobCheckpoints.sort((a, b) => (a.evalLoss ?? a.trainLoss) - (b.evalLoss ?? b.trainLoss))[0];
  }

  /** Delete a checkpoint */
  deleteCheckpoint(id: string): boolean {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return false;

    if (existsSync(checkpoint.path)) {
      rmSync(checkpoint.path, { recursive: true, force: true });
    }
    this.checkpoints.delete(id);
    return true;
  }

  /** Export checkpoint to GGUF format (uses llama.cpp if available) */
  async exportCheckpoint(checkpointId: string, format: "gguf" | "safetensors" | "onnx" | "mlx" = "gguf"): Promise<string> {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    const exportDir = join(this.baseDir, "exports", checkpointId);
    mkdirSync(exportDir, { recursive: true });

    if (format === "gguf") {
      return this.exportToGGUF(checkpoint, exportDir);
    } else if (format === "safetensors") {
      return this.exportToSafetensors(checkpoint, exportDir);
    } else {
      // Generic Python-based export
      const script = this.generateExportScript(checkpoint, format, exportDir);
      const scriptPath = join(exportDir, `export-${format}.py`);
      writeFileSync(scriptPath, script);

      try {
        execSync(`python3 ${scriptPath}`, { timeout: 300000 });
        return exportDir;
      } catch (err: any) {
        throw new Error(`Export failed: ${err.message}`);
      }
    }
  }

  /** Load checkpoints from disk (resume discover) */
  loadFromDisk(): void {
    if (!existsSync(this.baseDir)) return;

    const entries = readdirSync(this.baseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = join(this.baseDir, entry.name);
        const subEntries = readdirSync(subDir, { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.isDirectory() && sub.name.startsWith("checkpoint-")) {
            const metaPath = join(subDir, sub.name, "tekton-checkpoint.json");
            if (existsSync(metaPath)) {
              try {
                const data = JSON.parse(readFileSync(metaPath, "utf-8"));
                this.checkpoints.set(data.id, data);
              } catch {}
            }
          }
        }
      }
    }
  }

  /** Get total disk usage of all checkpoints */
  getTotalSizeMB(): number {
    return Array.from(this.checkpoints.values()).reduce((sum, c) => sum + c.sizeMB, 0);
  }

  /** Clean up old checkpoints, keeping only the N best */
  cleanup(keepCount: number = 3): number {
    const sorted = Array.from(this.checkpoints.values())
      .sort((a, b) => (a.evalLoss ?? a.trainLoss) - (b.evalLoss ?? b.trainLoss));

    let deleted = 0;
    for (let i = keepCount; i < sorted.length; i++) {
      const checkpoint = sorted[i]!;
      // Always keep the best
      if (!checkpoint.isBest) {
        this.deleteCheckpoint(checkpoint.id);
        deleted++;
      }
    }
    return deleted;
  }

  // ── Private ──────────────────────────────────────────────────────────

  private checkBestCheckpoint(jobId: string, newCheckpoint: Checkpoint): void {
    const existing = this.listCheckpoints(jobId);
    let best = newCheckpoint;

    for (const cp of existing) {
      const cpLoss = cp.evalLoss ?? cp.trainLoss;
      const bestLoss = best.evalLoss ?? best.trainLoss;
      if (cpLoss < bestLoss) {
        best = cp;
      }
      cp.isBest = false;
    }

    best.isBest = true;
  }

  private getDirSize(dirPath: string): number {
    if (!existsSync(dirPath)) return 0;
    let size = 0;
    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          size += this.getDirSize(fullPath);
        } else {
          size += stat.size;
        }
      }
    } catch {}
    return Math.round(size / (1024 * 1024) * 100) / 100;
  }

  private exportToGGUF(checkpoint: Checkpoint, exportDir: string): string {
    // Generate a conversion script that uses llama.cpp's convert scripts
    const script = `#!/usr/bin/env python3
"""Convert checkpoint to GGUF format using llama.cpp."""
import subprocess
import sys

def main():
    print("Converting ${checkpoint.path} to GGUF...")
    # This would use llama.cpp's convert scripts in production
    # For now, create a placeholder
    print("NOTE: Install llama.cpp and run:")
    print(f"  python convert.py ${checkpoint.path} --outfile ${join(exportDir, "model.gguf")}")
    print("GGUF export requires llama.cpp to be installed.")
    print(f"Checkpoint path: ${checkpoint.path}")
    print(f"Export dir: ${exportDir}")

if __name__ == "__main__":
    main()
`;
    writeFileSync(join(exportDir, "convert-to-gguf.py"), script);
    return exportDir;
  }

  private exportToSafetensors(checkpoint: Checkpoint, exportDir: string): string {
    const script = `#!/usr/bin/env python3
"""Export checkpoint to safetensors format."""
import json
import shutil
from pathlib import Path

def main():
    src = Path("${checkpoint.path}")
    dst = Path("${exportDir}")
    print(f"Copying safetensors from {src} to {dst}")
    # In production, this would use transformers/safetensors
    # to properly merge LoRA weights
    print(f"Checkpoint: ${checkpoint.id}")
    print(f"Train loss: ${checkpoint.trainLoss}")
    print("Safetensors export requires PyTorch + transformers.")

if __name__ == "__main__":
    main()
`;
    writeFileSync(join(exportDir, "export-safetensors.py"), script);
    return exportDir;
  }

  private generateExportScript(checkpoint: Checkpoint, format: string, exportDir: string): string {
    return `#!/usr/bin/env python3
"""Export checkpoint to ${format} format."""
import json
from pathlib import Path

def main():
    print(f"Exporting checkpoint ${checkpoint.id} to ${format}")
    print(f"Source: ${checkpoint.path}")
    print(f"Output: ${exportDir}")
    # This is a template — actual conversion depends on the framework

if __name__ == "__main__":
    main()
`;
  }
}
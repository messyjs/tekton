/**
 * GPU Monitor — Detect GPUs, track VRAM utilization, parse nvidia-smi.
 */
import { execSync } from "node:child_process";
import type { GPUInfo, EnvInfo } from "./types.js";

export class GPUMonitor {
  private cachedInfo: EnvInfo | null = null;
  private cacheTime = 0;
  private cacheTTL = 5000; // 5s cache

  /** Detect full environment info including GPUs */
  detectEnvironment(): EnvInfo {
    const now = Date.now();
    if (this.cachedInfo && now - this.cacheTime < this.cacheTTL) {
      return this.cachedInfo;
    }

    const gpus = this.detectGPUs();
    const pythonInfo = this.detectPython();

    const info: EnvInfo = {
      platform: process.platform,
      pythonAvailable: pythonInfo.available,
      pythonVersion: pythonInfo.version,
      nvidiaSmiAvailable: gpus.length > 0,
      gpus,
      cudaVersion: this.detectCUDA(),
      vramTotalMB: gpus.reduce((sum, g) => sum + g.vramTotalMB, 0),
    };

    this.cachedInfo = info;
    this.cacheTime = now;
    return info;
  }

  /** Detect GPUs via nvidia-smi or rocm-smi */
  detectGPUs(): GPUInfo[] {
    try {
      const output = execSync(
        "nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits",
        { encoding: "utf-8", timeout: 5000 }
      );

      return output.trim().split("\n").map((line, index) => {
        const parts = line.split(",").map(p => p.trim());
        return {
          detected: true,
          name: parts[0] ?? "Unknown",
          vramTotalMB: Number(parts[1]) || 0,
          vramUsedMB: Number(parts[2]) || 0,
          vramFreeMB: Number(parts[3]) || 0,
          utilization: Number(parts[4]) || 0,
        };
      });
    } catch {
      // Try AMD
      try {
        execSync("rocm-smi --showproductname", { encoding: "utf-8", timeout: 5000 });
        // AMD detected but parsing is limited
        return [{
          detected: true,
          name: "AMD GPU",
          vramTotalMB: 0,
          vramUsedMB: 0,
          vramFreeMB: 0,
          utilization: 0,
        }];
      } catch {
        return [];
      }
    }
  }

  /** Get current GPU utilization (refreshes cache) */
  getUtilization(): { gpuUtil: number; vramUsedMB: number; vramFreeMB: number; vramTotalMB: number } {
    const gpus = this.detectGPUs();
    if (gpus.length === 0) {
      return { gpuUtil: 0, vramUsedMB: 0, vramFreeMB: 0, vramTotalMB: 0 };
    }
    // Use first GPU as primary metric
    const primary = gpus[0]!;
    return {
      gpuUtil: primary.utilization,
      vramUsedMB: primary.vramUsedMB,
      vramFreeMB: primary.vramFreeMB,
      vramTotalMB: primary.vramTotalMB,
    };
  }

  /** Check if enough VRAM is available */
  hasVram(requiredMB: number): boolean {
    const util = this.getUtilization();
    return util.vramFreeMB >= requiredMB;
  }

  /** Estimate VRAM needed for a model */
  estimateModelVram(modelParams: number, precision: string): number {
    const bytesPerParam: Record<string, number> = {
      "fp32": 4,
      "fp16": 2,
      "bf16": 2,
      "8bit": 1,
      "4bit": 0.5,
    };
    const bpp = bytesPerParam[precision] ?? 2;
    // Model weights + overhead (optimizer states, activations, gradients)
    // Rule of thumb: 4x model size for full training, 1.5x for LoRA
    const modelBytes = modelParams * bpp;
    const overheadBytes = modelBytes * 1.5; // LoRA overhead
    return Math.ceil((modelBytes + overheadBytes) / (1024 * 1024));
  }

  private detectPython(): { available: boolean; version?: string } {
    try {
      const version = execSync("python3 --version", { encoding: "utf-8", timeout: 5000 }).trim();
      const match = version.match(/(\d+\.\d+\.\d+)/);
      return { available: true, version: match?.[1] };
    } catch {
      try {
        const version = execSync("python --version", { encoding: "utf-8", timeout: 5000 }).trim();
        const match = version.match(/(\d+\.\d+\.\d+)/);
        return { available: true, version: match?.[1] };
      } catch {
        return { available: false };
      }
    }
  }

  private detectCUDA(): string | undefined {
    try {
      const output = execSync("nvcc --version", { encoding: "utf-8", timeout: 5000 });
      const match = output.match(/release\s+([\d.]+)/);
      return match?.[1];
    } catch {
      return undefined;
    }
  }

  /** Invalidate cache */
  invalidateCache(): void {
    this.cachedInfo = null;
    this.cacheTime = 0;
  }
}
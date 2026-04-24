import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";

export function createGpuCommand(): CommandRegistration {
  return {
    name: "tekton:gpu",
    description: "Detect GPUs, show VRAM and utilization",
    handler: async (args, _ctx, _pi, piCtx) => {
      try {
        const { execSync } = await import("node:child_process");

        // Try nvidia-smi
        let gpuInfo: string;
        try {
          gpuInfo = execSync("nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits", {
            encoding: "utf-8",
            timeout: 5000,
          });
        } catch {
          // No nvidia-smi — check for AMD
          try {
            gpuInfo = execSync("rocm-smi --showproductname --showmeminfo vram --showpids --showuse --csv", {
              encoding: "utf-8",
              timeout: 5000,
            });
          } catch {
            if (hasJsonFlag(args)) {
              piCtx.ui.notify(JSON.stringify({ detected: false }, null, 2));
            } else {
              piCtx.ui.notify("No GPU detected (nvidia-smi and rocm-smi not found).\nLocal models may use CPU inference.");
            }
            return;
          }
        }

        // Parse nvidia-smi output
        const lines = gpuInfo.trim().split("\n");
        const gpus = lines.map((line, index) => {
          const parts = line.split(",").map(p => p.trim());
          return {
            index,
            name: parts[0] ?? "Unknown",
            vramTotal: parts[1] ? `${parts[1]} MB` : "Unknown",
            vramUsed: parts[2] ? `${parts[2]} MB` : "Unknown",
            vramFree: parts[3] ? `${parts[3]} MB` : "Unknown",
            utilization: parts[4] ? `${parts[4]}%` : "Unknown",
          };
        });

        if (hasJsonFlag(args)) {
          piCtx.ui.notify(JSON.stringify({ detected: true, gpus }, null, 2));
        } else {
          const lines: string[] = ["🖥️ GPU Detection:\n"];
          for (const gpu of gpus) {
            lines.push(`  GPU ${gpu.index}: ${gpu.name}`);
            lines.push(`    VRAM: ${gpu.vramUsed} / ${gpu.vramTotal} (free: ${gpu.vramFree})`);
            lines.push(`    Utilization: ${gpu.utilization}`);
          }
          piCtx.ui.notify(lines.join("\n"));
        }
      } catch {
        if (hasJsonFlag(args)) {
          piCtx.ui.notify(JSON.stringify({ detected: false, error: "Failed to detect GPU" }, null, 2));
        } else {
          piCtx.ui.notify("GPU detection failed. Ensure nvidia-smi or rocm-smi is in your PATH.");
        }
      }
    },
  };
}
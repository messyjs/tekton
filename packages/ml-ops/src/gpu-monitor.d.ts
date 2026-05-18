import type { GPUInfo, EnvInfo } from "./types.js";
export declare class GPUMonitor {
    private cachedInfo;
    private cacheTime;
    private cacheTTL;
    /** Detect full environment info including GPUs */
    detectEnvironment(): EnvInfo;
    /** Detect GPUs via nvidia-smi or rocm-smi */
    detectGPUs(): GPUInfo[];
    /** Get current GPU utilization (refreshes cache) */
    getUtilization(): {
        gpuUtil: number;
        vramUsedMB: number;
        vramFreeMB: number;
        vramTotalMB: number;
    };
    /** Check if enough VRAM is available */
    hasVram(requiredMB: number): boolean;
    /** Estimate VRAM needed for a model */
    estimateModelVram(modelParams: number, precision: string): number;
    private detectPython;
    private detectCUDA;
    /** Invalidate cache */
    invalidateCache(): void;
}
//# sourceMappingURL=gpu-monitor.d.ts.map
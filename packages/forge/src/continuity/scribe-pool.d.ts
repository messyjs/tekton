/**
 * Scribe Pool — Manages Scribe instances for different production layers.
 *
 * Assigns scribes based on layer membership and configuration.
 */
import { Scribe, type ScribeConfig, type CavememStore } from "./scribe.js";
export interface ScribePoolConfig {
    scribes: ScribeConfig[];
}
export declare class ScribePool {
    private scribes;
    private cavemem;
    constructor(config: ScribePoolConfig, cavemem: CavememStore);
    /**
     * Get the scribe assigned to a given layer.
     * Finds the first scribe whose "observes" list includes this layer.
     */
    getScribeForLayer(layer: string): Scribe | null;
    /** Get a scribe by its ID */
    getScribeById(id: string): Scribe | undefined;
    /** List all scribe IDs */
    listScribeIds(): string[];
    /** Shutdown all scribes (cleanup) */
    shutdownAll(): Promise<void>;
}
//# sourceMappingURL=scribe-pool.d.ts.map
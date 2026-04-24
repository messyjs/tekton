/**
 * Scribe Pool — Manages Scribe instances for different production layers.
 *
 * Assigns scribes based on layer membership and configuration.
 */
import { Scribe, type ScribeConfig, type CavememStore } from "./scribe.js";

// ── Scribe Pool Config ──────────────────────────────────────────────────────

export interface ScribePoolConfig {
  scribes: ScribeConfig[];
}

// ── Scribe Pool ────────────────────────────────────────────────────────────

export class ScribePool {
  private scribes: Map<string, Scribe> = new Map();
  private cavemem: CavememStore;

  constructor(config: ScribePoolConfig, cavemem: CavememStore) {
    this.cavemem = cavemem;

    for (const scribeConfig of config.scribes) {
      const scribe = new Scribe(scribeConfig, cavemem);
      this.scribes.set(scribeConfig.id, scribe);
    }
  }

  /**
   * Get the scribe assigned to a given layer.
   * Finds the first scribe whose "observes" list includes this layer.
   */
  getScribeForLayer(layer: string): Scribe | null {
    for (const scribe of this.scribes.values()) {
      if (scribe.config.observes.includes(layer)) {
        return scribe;
      }
    }
    // Default: return any scribe, or null
    const first = this.scribes.values().next();
    return first.done ? null : first.value;
  }

  /** Get a scribe by its ID */
  getScribeById(id: string): Scribe | undefined {
    return this.scribes.get(id);
  }

  /** List all scribe IDs */
  listScribeIds(): string[] {
    return [...this.scribes.keys()];
  }

  /** Shutdown all scribes (cleanup) */
  async shutdownAll(): Promise<void> {
    // Currently no cleanup needed — scribes are stateless observers.
    // Future: flush pending observations, close connections.
    this.scribes.clear();
  }
}
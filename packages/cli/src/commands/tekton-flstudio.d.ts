/**
 * /tekton:flstudio — FL Studio control command.
 *
 * Subcommands:
 *   status    – Show sidecar and FL Studio bridge connection
 *   play      – Start playback
 *   stop      – Stop playback
 *   tempo     – Set/get tempo
 *   channels  – List channels in the Channel Rack
 *   tracks    – List mixer tracks
 *   plugins   – List plugin parameters
 *   piano     – Show piano roll state
 *   start     – Start the sidecar
 *   stop_svc  – Stop the sidecar
 */
import type { CommandRegistration } from "./types.js";
export declare function createFLStudioCommand(): CommandRegistration;
//# sourceMappingURL=tekton-flstudio.d.ts.map
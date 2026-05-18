/**
 * /tekton:ableton — Ableton Live control command.
 *
 * Subcommands:
 *   status    – Show sidecar and AbletonOSC connection status
 *   play      – Start playback
 *   stop      – Stop playback
 *   tempo     – Set/get tempo
 *   tracks    – List tracks
 *   start     – Start the sidecar
 *   stop_svc  – Stop the sidecar
 */
import type { CommandRegistration } from "./types.js";
export declare function createAbletonCommand(): CommandRegistration;
//# sourceMappingURL=tekton-ableton.d.ts.map
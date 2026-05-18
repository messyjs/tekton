/**
 * /tekton:forge — Forge project management commands.
 *
 * Forge is an OPTIONAL package. If @tekton/forge is not installed,
 * commands will show a message asking the user to install it.
 *
 * Commands:
 *   /tekton:forge          — Show status (enabled/disabled, project count)
 *   /tekton:forge enable   — Enable Forge, create projects directory
 *   /tekton:forge disable  — Disable Forge
 *   /tekton:forge new      — Start new product (non-interactive with brief)
 *   /tekton:forge status   — Current project status
 *   /tekton:forge resume   — Resume project
 *   /tekton:forge list     — List all projects
 *   /tekton:forge check    — Preflight check for domain tools
 */
import type { CommandRegistration } from "./types.js";
export declare function createForgeCommand(): CommandRegistration;
//# sourceMappingURL=tekton-forge.d.ts.map
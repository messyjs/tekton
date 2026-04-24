import type { TektonConfig } from "@tekton/core";
import type { ParsedArgs } from "../run.js";

// ── Gateway mode (messaging platforms — Phase 9 stub) ────────────────

export async function startGatewayMode(
  config: TektonConfig,
  parsed: ParsedArgs,
  tektonHome: string,
): Promise<void> {
  console.log("Gateway mode is not yet implemented (Phase 9).");
  console.log(`Planned platforms: ${config.gateway?.platforms?.join(", ") ?? "none configured"}`);
  process.exit(0);
}
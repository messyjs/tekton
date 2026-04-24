import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";
import { featureState } from "./registry.js";

export function createOffCommand(): CommandRegistration {
  return {
    name: "tekton:off",
    description: "Disable Tekton layers, fall back to raw Pi behavior",
    handler: async (args, ctx, _pi, piCtx) => {
      featureState.routing = false;
      featureState.learning = false;
      featureState.compression = false;

      ctx.hermesBridge.setPaused(true);
      ctx.modelRouter.setMode("fast");

      if (hasJsonFlag(args)) {
        piCtx.ui.notify(JSON.stringify({ routing: false, learning: false, compression: false }, null, 2));
      } else {
        piCtx.ui.notify("⏹️ All Tekton layers disabled\n  • Routing: fast (no complexity)\n  • Learning: paused\n  • Compression: none");
      }
    },
  };
}
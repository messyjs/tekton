import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";
import { featureState } from "./registry.js";

export function createOnCommand(): CommandRegistration {
  return {
    name: "tekton:on",
    description: "Enable all Tekton layers (routing, learning, compression)",
    handler: async (args, ctx, _pi, piCtx) => {
      featureState.routing = true;
      featureState.learning = true;
      featureState.compression = true;

      ctx.hermesBridge.setPaused(false);
      ctx.modelRouter.setMode("auto");

      if (hasJsonFlag(args)) {
        piCtx.ui.notify(JSON.stringify({ routing: true, learning: true, compression: true }, null, 2));
      } else {
        piCtx.ui.notify("✅ All Tekton layers enabled\n  • Routing: auto\n  • Learning: active\n  • Compression: full");
      }
    },
  };
}
/**
 * Dashboard Command — /tekton:dashboard start|stop|open|url|status
 */
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag } from "./types.js";

let serverInstance: any = null;

export function createDashboardCommand(): CommandRegistration {
  return {
    name: "tekton:dashboard",
    description: "Start/stop web dashboard, view status, open in browser",
    subcommands: {
      "start": "Start the dashboard server",
      "stop": "Stop the dashboard server",
      "open": "Open dashboard in browser",
      "url": "Show dashboard URL",
      "status": "Show dashboard status",
    },
    handler: async (args, ctx, pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "start": {
          await handleStart(ctx, piCtx);
          return;
        }
        case "stop": {
          await handleStop(piCtx);
          return;
        }
        case "open": {
          await handleOpen(ctx, piCtx);
          return;
        }
        case "url": {
          piCtx.ui.notify(getUrl(ctx));
          return;
        }
        case "status": {
          handleStatus(ctx, piCtx);
          return;
        }
        default: {
          piCtx.ui.notify(
            "📊 Tekton Dashboard\n\n" +
            "Subcommands: start, stop, open, url, status\n\n" +
            `Default URL: ${getUrl(ctx)}`
          );
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["start", "stop", "open", "url", "status"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Dashboard ${s}` }));
    },
  };
}

function getUrl(ctx: CommandContext): string {
  const port = (ctx.config as any).dashboard?.port ?? 7700;
  const host = (ctx.config as any).dashboard?.host ?? "127.0.0.1";
  return `http://${host}:${port}`;
}

async function handleStart(ctx: CommandContext, piCtx: any): Promise<void> {
  if (serverInstance) {
    piCtx.ui.notify("Dashboard is already running. Use /tekton:dashboard stop first.");
    return;
  }

  try {
    const { DashboardServer } = await import("@tekton/dashboard");
    const port = (ctx.config as any).dashboard?.port ?? 7700;
    const host = (ctx.config as any).dashboard?.host ?? "127.0.0.1";

    serverInstance = new DashboardServer({ port, host });

    // Connect subsystems if available
    // (These would be injected from the running Tekton instance)

    await serverInstance.start();
    piCtx.ui.notify(`📊 Dashboard started at ${serverInstance.getUrl()}`);
  } catch (err: any) {
    piCtx.ui.notify(`❌ Dashboard start failed: ${err.message}`);
    serverInstance = null;
  }
}

async function handleStop(piCtx: any): Promise<void> {
  if (!serverInstance) {
    piCtx.ui.notify("Dashboard is not running.");
    return;
  }

  await serverInstance.stop();
  piCtx.ui.notify("📊 Dashboard stopped.");
  serverInstance = null;
}

async function handleOpen(ctx: CommandContext, piCtx: any): Promise<void> {
  const url = getUrl(ctx);

  // Try to start server if not running
  if (!serverInstance) {
    await handleStart(ctx, piCtx);
    if (!serverInstance) return;
  }

  try {
    // @ts-expect-error — 'open' is an optional dependency
    const openModule = await import("open") as any;
    await openModule.default(url);
    piCtx.ui.notify(`🌐 Opening dashboard at ${url}`);
  } catch {
    // 'open' package not available, just show URL
    piCtx.ui.notify(`🌐 Open this URL in your browser: ${url}`);
  }
}

function handleStatus(ctx: CommandContext, piCtx: any): Promise<void> {
  const url = getUrl(ctx);

  if (serverInstance) {
    const data = {
      running: true,
      url,
      port: (ctx.config as any).dashboard?.port ?? 7700,
      refreshInterval: (ctx.config as any).dashboard?.refreshIntervalMs ?? 5000,
    };

    if (hasJsonFlag(ctx as any)) {
      piCtx.ui.notify(JSON.stringify(data, null, 2));
    } else {
      piCtx.ui.notify(
        `📊 Dashboard Status\n  Running: ✓\n  URL: ${url}\n  Refresh: ${((ctx.config as any).dashboard?.refreshIntervalMs ?? 5000) / 1000}s`
      );
    }
  } else {
    if (hasJsonFlag(ctx as any)) {
      piCtx.ui.notify(JSON.stringify({ running: false, url }, null, 2));
    } else {
      piCtx.ui.notify(
        `📊 Dashboard Status\n  Running: ✗\n  URL: ${url}\n  Use /tekton:dashboard start to begin`
      );
    }
  }

  return Promise.resolve();
}
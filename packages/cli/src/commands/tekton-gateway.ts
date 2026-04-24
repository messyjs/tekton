/**
 * Gateway CLI Command — /tekton:gateway start|stop|status|platforms|sessions
 */
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatTable, formatBox } from "./types.js";
import { GatewayRunner } from "@tekton/gateway";
import type { PlatformName, GatewayConfig, GatewaySession, PlatformStatus, MessageEvent } from "@tekton/gateway";

let gatewayInstance: GatewayRunner | null = null;

export function createGatewayCommand(): CommandRegistration {
  return {
    name: "tekton:gateway",
    description: "Start/stop the messaging gateway, view status, manage sessions",
    subcommands: {
      "start": "Start the gateway (all configured platforms)",
      "stop": "Stop the gateway",
      "status": "Show gateway status",
      "platforms": "List platform adapters and their status",
      "sessions": "List active sessions",
    },
    handler: async (args, ctx, pi, piCtx) => {
      const sub = args.subcommand;

      if (sub === "start") {
        await handleStart(args, ctx, piCtx);
      } else if (sub === "stop") {
        await handleStop(piCtx);
      } else if (sub === "status") {
        await handleStatus(piCtx);
      } else if (sub === "platforms") {
        await handlePlatforms(piCtx);
      } else if (sub === "sessions") {
        await handleSessions(ctx, piCtx);
      } else {
        piCtx.ui.notify("Usage: /tekton:gateway start|stop|status|platforms|sessions");
      }
    },
  };
}

async function handleStart(args: ParsedArgs, ctx: CommandContext, piCtx: any): Promise<void> {
  if (gatewayInstance) {
    piCtx.ui.notify("Gateway is already running. Use /tekton:gateway stop first.");
    return;
  }

  // Build gateway config from tekton config
  const gatewayConfig = ctx.config?.gateway as Partial<GatewayConfig> | undefined;

  gatewayInstance = new GatewayRunner(gatewayConfig);

  // Register message handler — connects to Tekton's core pipeline
  gatewayInstance.onMessage(async (event: MessageEvent, session: GatewaySession) => {
    const prefix = `[${event.platform}:${event.userName ?? event.userId}]`;
    return `${prefix} Received: "${event.text}" | Session model: ${session.currentModel ?? "default"}`;
  });

  try {
    await gatewayInstance.start();
    const status = gatewayInstance.getStatus();
    const platforms = Object.entries(status.platforms)
      .map(([name, ps]) => `  ${(ps as PlatformStatus).connected ? "✓" : "✗"} ${name}`)
      .join("\n");

    const apiPort = (status.platforms as Record<string, PlatformStatus>)["api-server"] ? "7700" : "-";
    const whPort = (status.platforms as Record<string, PlatformStatus>)["webhook"] ? "7701" : "-";

    piCtx.ui.notify(
      `🟢 Gateway started\n${platforms}\n` +
      `API: http://localhost:${apiPort}\n` +
      `Webhook: http://localhost:${whPort}`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    piCtx.ui.notify(`✗ Gateway start failed: ${message}`);
    gatewayInstance = null;
  }
}

async function handleStop(piCtx: any): Promise<void> {
  if (!gatewayInstance) {
    piCtx.ui.notify("Gateway is not running.");
    return;
  }

  await gatewayInstance.stop();
  piCtx.ui.notify("🛑 Gateway stopped.");
  gatewayInstance = null;
}

async function handleStatus(piCtx: any): Promise<void> {
  if (gatewayInstance) {
    piCtx.ui.notify(gatewayInstance.getStatusSummary());
  } else {
    piCtx.ui.notify("Gateway is not running. Use /tekton:gateway start");
  }
}

async function handlePlatforms(piCtx: any): Promise<void> {
  if (!gatewayInstance) {
    piCtx.ui.notify("Gateway is not running.");
    return;
  }

  const status = gatewayInstance.getStatus();
  const rows = Object.entries(status.platforms).map(([name, ps]) => {
    const p = ps as PlatformStatus;
    return [
      name,
      p.connected ? "✓ connected" : "✗ disconnected",
      String(p.messagesIn ?? 0),
      String(p.messagesOut ?? 0),
      p.lastError ?? "-",
    ];
  });

  piCtx.ui.notify(
    formatTable(
      ["Platform", "Status", "In", "Out", "Last Error"],
      rows
    )
  );
}

async function handleSessions(ctx: CommandContext, piCtx: any): Promise<void> {
  if (!gatewayInstance) {
    piCtx.ui.notify("Gateway is not running.");
    return;
  }

  const sessions = gatewayInstance.sessions.listSessions();
  if (sessions.length === 0) {
    piCtx.ui.notify("No active sessions.");
    return;
  }

  const rows = sessions.slice(0, 20).map((s: GatewaySession) => [
    s.platform,
    s.userId,
    s.userName || "-",
    String(s.messageCount),
    s.currentModel ?? "-",
    new Date(s.lastActivityAt).toISOString().slice(0, 19),
  ]);

  piCtx.ui.notify(
    formatTable(
      ["Platform", "User ID", "Name", "Msgs", "Model", "Last Active"],
      rows
    )
  );
}
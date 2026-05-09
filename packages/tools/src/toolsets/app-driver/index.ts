/**
 * App Driver Toolset — Unified control interface for external applications.
 *
 * Now powered by the universal AppDriver protocol cascade:
 *   CDP → UIAutomation → OSC → Hotkeys → Screenshot+OCR
 *
 * Any software on the machine can be discovered, connected to, and controlled.
 * No per-app drivers needed — the protocol auto-selects the best method.
 */
import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import { getAppDriver } from "@tekton/core";
import type { ControlResult } from "@tekton/core";

const driver = getAppDriver();

/** Convert a ControlResult from the driver into a ToolResult for the tool system. */
function controlResultToToolResult(r: ControlResult, label: string): ToolResult {
  if (r.success) {
    const detail = r.result
      ? typeof r.result === "string" ? r.result : JSON.stringify(r.result, null, 2)
      : "";
    const screenshot = r.screenshot ? `\nScreenshot: ${r.screenshot.length} bytes (base64 PNG)` : "";
    return { content: `✅ ${label}${detail ? ` — ${detail}` : ""}${screenshot}` };
  }
  return { content: `❌ ${label} failed: ${r.error ?? "unknown error"}`, isError: true };
}

// ── Tool Definitions ─────────────────────────────────────────────────────

export const appDiscoverTool: ToolDefinition = {
  name: "app_discover",
  toolset: "app-driver",
  description: "Discover all running applications and their control surfaces. Auto-detects CDP, UIAutomation, OSC, and hotkey-capable apps.",
  parameters: Type.Object({
    refresh: Type.Optional(Type.Boolean({ description: "Force a fresh scan (default: return cached)" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const refresh = params.refresh as boolean | undefined;
      if (refresh) {
        // Force re-scan by calling discover (it refreshes internally)
      }
      const apps = await driver.discover();

      const lines = apps.map(a => {
        const icon = a.protocol === "cdp" ? "🌐" : a.protocol === "uia" ? "🪟" : a.protocol === "osc" ? "🎵" : a.protocol === "hotkey" ? "⌨️" : "📸";
        const conf = Math.round(a.confidence * 100);
        const surface = a.surface.length > 0 ? ` (${a.surface.length} controls)` : "";
        return `${icon} ${a.process.name} (PID ${a.process.pid}) — ${a.protocol.toUpperCase()} ${conf}%${surface}${a.process.windowTitle ? ` [${a.process.windowTitle.slice(0, 40)}]` : ""}`;
      });

      const summary = [
        `Found ${apps.length} controllable application${apps.length !== 1 ? "s" : ""}`,
        "",
        ...lines,
        "",
        "Protocol Cascade: CDP → UIAutomation → OSC → Hotkeys → Screenshot",
      ].join("\n");

      return { content: summary };
    } catch (err: any) {
      return { content: `Discovery failed: ${err.message}`, isError: true };
    }
  },
};

export const appConnectTool: ToolDefinition = {
  name: "app_connect",
  toolset: "app-driver",
  description: "Connect to a running application by name. Auto-selects best protocol (CDP, UIAutomation, OSC, Hotkeys).",
  parameters: Type.Object({
    app: Type.String({ description: "Application name (e.g., 'tradingview', 'ableton', 'vscode', 'chrome')" }),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const app = await driver.connect(appName);
      if (!app) {
        return { content: `Could not find or connect to "${appName}". Use app_discover to see available apps.`, isError: true };
      }

      const surface = app.surface.length > 0
        ? `\nControls discovered: ${app.surface.length}`
        : "";
      return {
        content: `✅ Connected to ${app.appName} via ${app.protocol.toUpperCase()}${surface}\nPID: ${app.pid} | Connected: ${app.connected}`,
      };
    } catch (err: any) {
      return { content: `Connection failed: ${err.message}`, isError: true };
    }
  },
};

export const appControlTool: ToolDefinition = {
  name: "app_control",
  toolset: "app-driver",
  description: "Execute a control action on a connected app. Supports click, type, shortcut, menu, scroll, select, toggle, and more. Uses the best protocol automatically.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name" }),
    action: Type.String({
      description: "Action type: click, type, shortcut, menu, scroll, select, toggle, wait",
      enum: ["click", "type", "shortcut", "menu", "scroll", "select", "toggle", "wait", "custom"],
    }),
    target: Type.Optional(Type.String({ description: "Target element (CSS selector, UIA automationId, key combo, menu path)" })),
    value: Type.Optional(Type.String({ description: "Value (text to type, shortcut combo, option value)" })),
    coordinates: Type.Optional(Type.Object({
      x: Type.Number(),
      y: Type.Number(),
    }, { description: "X,Y coordinates for click actions" })),
    modifiers: Type.Optional(Type.Array(Type.String({ description: "Modifier keys: ctrl, alt, shift" }))),
    delay_ms: Type.Optional(Type.Number({ description: "Delay in ms before action" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const action = params.action as string;
      const target = params.target as string | undefined;
      const value = params.value as string | undefined;
      const coordinates = params.coordinates as { x: number; y: number } | undefined;
      const modifiers = params.modifiers as string[] | undefined;
      const delay = params.delay_ms as number | undefined;

      let app = driver.get(appName);
      if (!app) {
        app = await driver.connect(appName);
        if (!app) {
          return { content: `App "${appName}" not connected. Use app_connect first.`, isError: true };
        }
      }

      const result = await app.execute({
        type: action as any,
        target,
        value,
        coordinates,
        modifiers,
        delay,
      });

      const status = result.success ? "✅" : "❌";
      const layer = result.layer.toUpperCase();
      const detail = result.result
        ? `\nResult: ${typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)}`
        : result.error ? `\nError: ${result.error}` : "";

      return {
        content: `${status} ${action} → ${appName} [${layer}]${detail}`,
        isError: !result.success,
      };
    } catch (err: any) {
      return { content: `Control failed: ${err.message}`, isError: true };
    }
  },
};

export const appSurfaceTool: ToolDefinition = {
  name: "app_surface",
  toolset: "app-driver",
  description: "Discover the control surface of an app — all buttons, inputs, menus, and interactive elements. Auto-probes via CDP or UIAutomation.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name" }),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      let app = driver.get(appName);
      if (!app) {
        app = await driver.connect(appName);
        if (!app) {
          return { content: `App "${appName}" not connected. Use app_connect first.`, isError: true };
        }
      }

      const surface = await app.learnSurface();

      const controlLines = surface.controls.slice(0, 50).map(c => {
        const typeIcon = { button: "🔘", input: "📝", dropdown: "📋", checkbox: "☑️", tab: "📑", slider: "🎚️", menu: "📂", region: "📦", shortcut: "⌨️" }[c.type] ?? "❓";
        const bounds = c.bounds ? ` @ (${c.bounds.x},${c.bounds.y})` : "";
        const val = c.value ? ` = "${c.value.slice(0, 20)}"` : "";
        const sel = c.selector ? ` [${c.selector.slice(0, 30)}]` : "";
        return `${typeIcon} ${c.label || c.id}${bounds}${val}${sel} ${c.enabled ? "" : "(disabled)"}`;
      });

      const shortcutLines = (surface.shortcuts ?? []).map(s =>
        `⌨️ ${s.combo} → ${s.action}`
      );

      const summary = [
        `📋 Control surface for ${surface.appName}`,
        `Protocol: ${app.protocol.toUpperCase()} | ${surface.controls.length} controls | ${surface.shortcuts.length} shortcuts`,
        "",
        ...controlLines.slice(0, 30),
        controlLines.length > 30 ? `... and ${controlLines.length - 30} more` : "",
        "",
        ...shortcutLines,
      ].filter(Boolean).join("\n");

      return { content: summary };
    } catch (err: any) {
      return { content: `Surface discovery failed: ${err.message}`, isError: true };
    }
  },
};

export const appScreenshotTool: ToolDefinition = {
  name: "app_screenshot",
  toolset: "app-driver",
  description: "Take a screenshot of an application window or the entire screen.",
  parameters: Type.Object({
    app: Type.Optional(Type.String({ description: "Application name to screenshot (omit for full screen)" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string | undefined;
      const result = await driver.screenshot(appName);
      return controlResultToToolResult(result, "Screenshot");
    } catch (err: any) {
      return { content: `Screenshot failed: ${err.message}`, isError: true };
    }
  },
};

export const appLearnTool: ToolDefinition = {
  name: "app_learn",
  toolset: "app-driver",
  description: "Probe an app's control surface and generate a reusable skill template for the Hermes learning loop.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name to learn" }),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    const appName = params.app as string;
    try {
      let app = driver.get(appName);
      if (!app) {
        app = await driver.connect(appName);
        if (!app) {
          return { content: `Could not connect to "${appName}". Use app_discover to find available apps.`, isError: true };
        }
      }

      const surface = await app.learnSurface();
      const controls = surface.controls.slice(0, 20);
      const shortcuts = surface.shortcuts ?? [];

      const skillTemplate = [
        `---`,
        `name: ${appName}-control`,
        `confidence: ${Math.round(app.info.confidence * 100) / 100}`,
        `usage_count: 0`,
        `last_used: ${new Date().toISOString()}`,
        `protocol: ${app.protocol}`,
        `app: ${appName}`,
        `---`,
        ``,
        `# ${appName} Control Skill`,
        ``,
        `## Protocol: ${app.protocol.toUpperCase()}`,
        `Connected via ${app.protocol} to ${surface.appName}.`,
        ``,
        `## Controls (${controls.length} discovered)`,
        ...controls.map(c => `- \`${c.selector}\`: ${c.label || c.id} (${c.type})`),
        ``,
        `## Shortcuts (${shortcuts.length} known)`,
        ...shortcuts.map(s => `- \`${s.combo}\`: ${s.action}`),
        ``,
        `## Usage`,
        `\`\`\``,
        `app_control(app="${appName}", action="click", target="${controls[0]?.selector ?? "selector"}")`,
        `app_control(app="${appName}", action="type", target="${controls.find(c => c.type === "input")?.selector ?? "input"}", value="text")`,
        `app_control(app="${appName}", action="shortcut", value="${shortcuts[0]?.combo ?? "Ctrl+S"}")`,
        `\`\`\``,
      ].join("\n");

      return {
        content: `Learned ${appName} control surface: ${controls.length} controls, ${shortcuts.length} shortcuts.\n\n${skillTemplate}\n\nThis template can be saved to ~/.tekton/skills/ for the Hermes learning loop.`,
      };
    } catch (err: any) {
      return { content: `Could not probe ${appName}: ${err.message}`, isError: true };
    }
  },
};

export const appShortcutTool: ToolDefinition = {
  name: "app_shortcut",
  toolset: "app-driver",
  description: "Send a keyboard shortcut to an application. Supports standard combos like Ctrl+S, Alt+F4, F5, etc.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name" }),
    combo: Type.String({ description: "Keyboard shortcut (e.g., 'Ctrl+S', 'Alt+F4', 'F5', 'Ctrl+Shift+N')" }),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const combo = params.combo as string;
      const result = await driver.quickControl(appName, {
        type: "shortcut",
        value: combo,
      });
      return controlResultToToolResult(result, `Shortcut ${combo} → ${appName}`);
    } catch (err: any) {
      return { content: `Shortcut failed: ${err.message}`, isError: true };
    }
  },
};

export const appTypeTool: ToolDefinition = {
  name: "app_type",
  toolset: "app-driver",
  description: "Type text into an application. Auto-focuses the app first. Uses clipboard paste for speed.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name" }),
    text: Type.String({ description: "Text to type" }),
    target: Type.Optional(Type.String({ description: "Target element to focus first (CSS selector, automationId)" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const text = params.text as string;
      const target = params.target as string | undefined;
      const action: any = { type: "type", value: text };
      if (target) action.target = target;
      const result = await driver.quickControl(appName, action);
      return controlResultToToolResult(result, `Type → ${appName}`);
    } catch (err: any) {
      return { content: `Type failed: ${err.message}`, isError: true };
    }
  },
};

// ── MIDI Tools ────────────────────────────────────────────────────────────

export const appSendNoteTool: ToolDefinition = {
  name: "app_send_note",
  toolset: "app-driver",
  description: "Play a MIDI note on a connected synth/DAW. Use for testing sounds, playing notes, programming patches.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name (e.g., 'massive', 'serum', 'ableton')" }),
    note: Type.String({ description: "Note name (e.g., 'C4', 'F#3', 'Bb5') or MIDI number (0-127)" }),
    velocity: Type.Optional(Type.Number({ description: "Velocity 0-127 (default: 100)" })),
    duration_ms: Type.Optional(Type.Number({ description: "Duration in ms (default: 500)" })),
    channel: Type.Optional(Type.Number({ description: "MIDI channel 0-15 (default: 0)" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const note = params.note as string;
      const velocity = params.velocity as number | undefined;
      const duration = params.duration_ms as number | undefined;
      const channel = params.channel as number | undefined;

      const result = await driver.quickControl(appName, {
        type: "note",
        target: note,
        value: String(velocity ?? 100),
        delay: duration,
        modifiers: channel !== undefined ? [String(channel)] : undefined,
      });
      return controlResultToToolResult(result, `Note ${note} → ${appName}`);
    } catch (err: any) {
      return { content: `Note failed: ${err.message}`, isError: true };
    }
  },
};

export const appSendCCTool: ToolDefinition = {
  name: "app_send_cc",
  toolset: "app-driver",
  description: "Send a MIDI Control Change to a connected synth. Use named parameters (filter1Cutoff) or CC numbers (74). Values 0-127 or percentage (0-100%).",
  parameters: Type.Object({
    app: Type.String({ description: "Application name" }),
    parameter: Type.String({ description: "Parameter name (e.g., 'filter1Cutoff', 'channelVolume') or CC number (0-127)" }),
    value: Type.String({ description: "Value 0-127, or percentage like '50%'" }),
    channel: Type.Optional(Type.Number({ description: "MIDI channel 0-15 (default: 0)" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const parameter = params.parameter as string;
      const value = params.value as string;
      const channel = params.channel as number | undefined;

      // Check if value is a percentage
      const isPercent = value.includes("%");
      const action: any = {
        type: isPercent ? "parameter" : "cc",
        target: parameter,
        value: value,
      };
      if (channel !== undefined) {
        action.modifiers = [String(channel)];
      }
      const result = await driver.quickControl(appName, action);
      return controlResultToToolResult(result, `CC ${parameter}=${value} → ${appName}`);
    } catch (err: any) {
      return { content: `CC failed: ${err.message}`, isError: true };
    }
  },
};

export const appSendPatchTool: ToolDefinition = {
  name: "app_send_patch",
  toolset: "app-driver",
  description: "Send multiple MIDI CC values at once to program a synth patch. Provide a JSON object mapping parameter names to values (0-127 or 0-100%).",
  parameters: Type.Object({
    app: Type.String({ description: "Application name" }),
    patch: Type.String({ description: "JSON object of parameter:value pairs, e.g. '{\"filter1Cutoff\":64,\"filter1Resonance\":32,\"masterVolume\":96}'" }),
    channel: Type.Optional(Type.Number({ description: "MIDI channel 0-15 (default: 0)" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const patch = params.patch as string;
      const channel = params.channel as number | undefined;

      const result = await driver.quickControl(appName, {
        type: "patch",
        value: patch,
        target: String(channel ?? 0),
      });
      return controlResultToToolResult(result, `Patch → ${appName}`);
    } catch (err: any) {
      return { content: `Patch failed: ${err.message}`, isError: true };
    }
  },
};

export const appSendOSCMessageTool: ToolDefinition = {
  name: "app_send_osc",
  toolset: "app-driver",
  description: "Send an OSC message to a DAW (Ableton, FL Studio, Reaper). Use for transport, track, clip, and device control.",
  parameters: Type.Object({
    app: Type.String({ description: "Application name (e.g., 'ableton', 'flstudio', 'reaper')" }),
    address: Type.String({ description: "OSC address (e.g., '/live/play', '/live/tempo')" }),
    args: Type.Optional(Type.String({ description: "JSON array of arguments, e.g. '[120.0]' for tempo" })),
  }),
  async execute(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      const appName = params.app as string;
      const address = params.address as string;
      const args = params.args as string | undefined;

      const result = await driver.quickControl(appName, {
        type: "osc_message",
        target: address,
        value: args ?? "[]",
      });
      return controlResultToToolResult(result, `OSC ${address} → ${appName}`);
    } catch (err: any) {
      return { content: `OSC failed: ${err.message}`, isError: true };
    }
  },
};

// ── Export all tools ─────────────────────────────────────────────────────

export const appDriverTools: ToolDefinition[] = [
  appDiscoverTool,
  appConnectTool,
  appControlTool,
  appSurfaceTool,
  appScreenshotTool,
  appLearnTool,
  appShortcutTool,
  appTypeTool,
  appSendNoteTool,
  appSendCCTool,
  appSendPatchTool,
  appSendOSCMessageTool,
];
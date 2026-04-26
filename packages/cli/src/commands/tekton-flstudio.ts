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

import type { CommandRegistration, CommandContext, ParsedArgs, AutocompleteEntry } from "./types.js";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import { spawn } from "node:child_process";

let sidecarProcess: import("node:child_process").ChildProcess | null = null;
const HOST = "127.0.0.1";
const PORT = 7704;

async function checkHealth(): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/health`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return { ok: false };
    const data = await resp.json() as Record<string, unknown>;
    return { ok: true, data };
  } catch { return { ok: false }; }
}

function checkInstalled(): { installed: boolean; version?: string } {
  try {
    const cmd = process.platform === "win32"
      ? "python -m tekton_flstudio --version 2>nul || pip show tekton-flstudio 2>nul"
      : "python -m tekton_flstudio --version 2>/dev/null || pip show tekton-flstudio 2>/dev/null";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000, stdio: "pipe" });
    if (result) {
      const match = result.match(/version:\s*([\d.]+)/i) || result.match(/(\d+\.\d+\.\d+)/);
      return { installed: true, version: match?.[1] };
    }
  } catch { /* not installed */ }
  return { installed: false };
}

export function createFLStudioCommand(): CommandRegistration {
  return {
    name: "tekton:flstudio",
    description: "Control FL Studio via TCP bridge (transport, channels, mixer, plugins, piano roll)",
    subcommands: {
      status: "Show connection status",
      play: "Start playback",
      stop: "Stop playback",
      tempo: "Set/get tempo (e.g., /tekton:flstudio tempo 140)",
      channels: "List channels in the Channel Rack",
      tracks: "List mixer tracks",
      plugins: "List plugin parameters for a channel",
      piano: "Show piano roll state",
      start: "Start the FL Studio sidecar",
      stop_svc: "Stop the FL Studio sidecar",
    },
    handler: async (args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext) => {
      const sub = args.subcommand || "status";
      switch (sub) {
        case "status": await handleStatus(piCtx); break;
        case "play": await handlePlay(piCtx); break;
        case "stop": await handleStop(piCtx); break;
        case "tempo": await handleTempo(args, piCtx); break;
        case "channels": await handleChannels(piCtx); break;
        case "tracks": await handleTracks(piCtx); break;
        case "plugins": await handlePlugins(args, piCtx); break;
        case "piano": await handlePianoRoll(piCtx); break;
        case "start": await handleStart(piCtx); break;
        case "stop_svc": await handleStopSvc(piCtx); break;
        default: piCtx.ui.notify(`Unknown subcommand: ${sub}. Use: status, play, stop, tempo, channels, tracks, start, stop_svc`);
      }
    },
    getArgumentCompletions: (prefix: string): AutocompleteEntry[] | null => {
      const subs = ["status", "play", "stop", "tempo", "channels", "tracks", "plugins", "piano", "start", "stop_svc"];
      const matches = subs.filter(s => s.startsWith(prefix));
      return matches.length > 0 ? matches.map(s => ({ value: s, label: s })) : null;
    },
  };
}

async function handleStatus(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok, data } = await checkHealth();
  const { installed, version } = checkInstalled();
  const lines = [
    "═══════════════════════════════════",
    "       FL Studio Control",
    "═══════════════════════════════════",
    `  Sidecar:     ${ok ? "✅ Running" : "❌ Not running"}`,
    `  Installed:   ${installed ? "✅ Yes" : "❌ No"} (${version || "N/A"})`,
    `  FL Studio:   ${data?.fl_studio_connected ? "✅ Connected" : "❌ Not connected"}`,
    "═══════════════════════════════════",
  ];
  if (!installed) {
    lines.push("", "Install with: pip install tekton-flstudio", "Also copy bridge/tekton_flstudio_bridge.py to FL Studio Settings/Hardware/");
  }
  piCtx.ui.notify(lines.join("\n"));
}

async function handlePlay(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running. Start with: /tekton:flstudio start"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/transport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "play" }), signal: AbortSignal.timeout(5000) });
    piCtx.ui.notify("▶️ FL Studio playback started");
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleStop(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running"); return; }
  try {
    await fetch(`http://${HOST}:${PORT}/transport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }), signal: AbortSignal.timeout(5000) });
    piCtx.ui.notify("⏹️ FL Studio playback stopped");
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleTempo(args: ParsedArgs, piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running"); return; }
  const tempoStr = args.positional[1];
  if (!tempoStr) {
    try {
      const resp = await fetch(`http://${HOST}:${PORT}/transport`, { signal: AbortSignal.timeout(5000) });
      const data = await resp.json() as Record<string, unknown>;
      piCtx.ui.notify(`🎵 Current position: ${data.position ?? "unknown"}`);
    } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
    return;
  }
  const tempo = parseFloat(tempoStr);
  if (isNaN(tempo) || tempo < 20 || tempo > 999) { piCtx.ui.notify("❌ Invalid tempo. Must be 20-999 BPM."); return; }
  try {
    await fetch(`http://${HOST}:${PORT}/transport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_tempo", tempo }), signal: AbortSignal.timeout(5000) });
    piCtx.ui.notify(`🎵 Tempo set to ${tempo} BPM`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleChannels(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/channels`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json() as { channels: Array<Record<string, unknown>> };
    if (!data.channels || data.channels.length === 0) { piCtx.ui.notify("No channels found (FL Studio bridge may not be connected)"); return; }
    const lines = data.channels.map(ch => `  ${ch.index}: ${ch.name || "Unnamed"} | Vol: ${ch.volume ?? "?"} | ${ch.muted ? "🔇" : "🔊"}`);
    piCtx.ui.notify(`🎹 Channels (${data.channels.length}):\n${lines.join("\n")}`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleTracks(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/mixer`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json() as { tracks: Array<Record<string, unknown>> };
    if (!data.tracks || data.tracks.length === 0) { piCtx.ui.notify("No mixer tracks found"); return; }
    const lines = data.tracks.slice(0, 20).map(tr => `  ${tr.index}: ${tr.name || "Track " + tr.index} | Vol: ${tr.volume ?? "?"}`);
    piCtx.ui.notify(`🎚️ Mixer (${data.tracks.length}):\n${lines.join("\n")}`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handlePlugins(args: ParsedArgs, piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running"); return; }
  const channelId = parseInt(args.positional[1] || "0", 10);
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/plugins/${channelId}/params`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json() as { params?: Array<Record<string, unknown>>; plugin_name?: string };
    if (!data.params || data.params.length === 0) { piCtx.ui.notify(`No plugin on channel ${channelId}`); return; }
    const lines = data.params.slice(0, 20).map(p => `  ${p.index}: ${p.name} = ${p.value}`).join("\n");
    const more = data.params.length > 20 ? `\n  ... and ${data.params.length - 20} more` : "";
    piCtx.ui.notify(`🎛️ ${data.plugin_name || "Plugin"} (${channelId}) — ${data.params.length} params:\n${lines}${more}`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handlePianoRoll(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ FL Studio sidecar not running"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/piano_roll`, { signal: AbortSignal.timeout(10000) });
    const data = await resp.json() as { result?: { noteCount?: number; notes?: Array<Record<string, unknown>> } };
    const result = data.result || data as unknown as Record<string, unknown>;
    const noteCount = (result as any).noteCount ?? (result as any).notes?.length ?? 0;
    const success = (result as any).success ?? true;
    if (!success) { piCtx.ui.notify("❌ Piano roll state unavailable (need flpianoroll in FL Studio)"); return; }
    piCtx.ui.notify(`🎹 Piano Roll: ${noteCount} notes`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleStart(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (ok) { piCtx.ui.notify("✅ FL Studio sidecar already running on port 7704"); return; }
  const { installed } = checkInstalled();
  if (!installed) { piCtx.ui.notify("❌ Not installed. Run: pip install tekton-flstudio"); return; }
  piCtx.ui.notify("🚀 Starting FL Studio sidecar...");
  try {
    const proc = spawn("tekton-flstudio", ["--mode", "http", "--port", String(PORT)], { detached: true, stdio: "ignore" });
    proc.unref(); sidecarProcess = proc;
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 1000)); if ((await checkHealth()).ok) { piCtx.ui.notify(`✅ FL Studio sidecar started on port ${PORT}`); return; } }
    piCtx.ui.notify("⚠️ Sidecar process started but health check failed.");
  } catch (err) { piCtx.ui.notify(`❌ Failed: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleStopSvc(piCtx: ExtensionCommandContext): Promise<void> {
  if (sidecarProcess) { sidecarProcess.kill("SIGTERM"); sidecarProcess = null; piCtx.ui.notify("✅ FL Studio sidecar stopped"); }
  else { piCtx.ui.notify("⚠️ No local sidecar process found"); }
}
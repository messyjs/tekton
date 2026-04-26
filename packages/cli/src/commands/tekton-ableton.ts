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

import type { CommandRegistration, CommandContext, ParsedArgs, AutocompleteEntry } from "./types.js";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import { spawn } from "node:child_process";

let sidecarProcess: import("node:child_process").ChildProcess | null = null;
const HOST = "127.0.0.1";
const PORT = 7703;

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
      ? "python -m tekton_ableton --version 2>nul || pip show tekton-ableton 2>nul"
      : "python -m tekton_ableton --version 2>/dev/null || pip show tekton-ableton 2>/dev/null";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000, stdio: "pipe" });
    if (result) {
      const match = result.match(/version:\s*([\d.]+)/i) || result.match(/(\d+\.\d+\.\d+)/);
      return { installed: true, version: match?.[1] };
    }
  } catch { /* not installed */ }
  return { installed: false };
}

export function createAbletonCommand(): CommandRegistration {
  return {
    name: "tekton:ableton",
    description: "Control Ableton Live via AbletonOSC sidecar (transport, tracks, clips, devices)",
    subcommands: {
      status: "Show connection status",
      play: "Start playback",
      stop: "Stop playback",
      tempo: "Set/get tempo (e.g., /tekton:ableton tempo 128)",
      tracks: "List tracks",
      start: "Start the Ableton sidecar",
      stop_svc: "Stop the Ableton sidecar",
    },
    handler: async (args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext) => {
      const sub = args.subcommand || "status";
      switch (sub) {
        case "status": await handleStatus(piCtx); break;
        case "play": await handlePlay(piCtx); break;
        case "stop": await handleStop(piCtx); break;
        case "tempo": await handleTempo(args, piCtx); break;
        case "tracks": await handleTracks(piCtx); break;
        case "start": await handleStart(piCtx); break;
        case "stop_svc": await handleStopSvc(piCtx); break;
        default: piCtx.ui.notify(`Unknown subcommand: ${sub}. Use: status, play, stop, tempo, tracks, start, stop_svc`);
      }
    },
    getArgumentCompletions: (prefix: string): AutocompleteEntry[] | null => {
      const subs = ["status", "play", "stop", "tempo", "tracks", "start", "stop_svc"];
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
    "       Ableton Live Control",
    "═══════════════════════════════════",
    `  Sidecar:    ${ok ? "✅ Running" : "❌ Not running"}`,
    `  Installed:  ${installed ? "✅ Yes" : "❌ No"} (${version || "N/A"})`,
    `  Ableton:    ${data?.ableton_connected ? "✅ Connected" : "❌ Not connected"}`,
    "═══════════════════════════════════",
  ];
  if (!installed) {
    lines.push("", "Install with: pip install tekton-ableton", "Also requires AbletonOSC in Ableton Live:", "https://github.com/ideoforms/AbletonOSC");
  }
  piCtx.ui.notify(lines.join("\n"));
}

async function handlePlay(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ Ableton sidecar not running. Start with: /tekton:ableton start"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/transport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "play" }), signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as Record<string, unknown>;
    piCtx.ui.notify(`▶️ Playback started`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleStop(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ Ableton sidecar not running"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/transport`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "stop" }), signal: AbortSignal.timeout(5000) });
    piCtx.ui.notify("⏹️ Playback stopped");
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleTempo(args: ParsedArgs, piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ Ableton sidecar not running"); return; }
  const tempoStr = args.positional[1];
  if (!tempoStr) {
    try {
      const resp = await fetch(`http://${HOST}:${PORT}/transport`, { signal: AbortSignal.timeout(5000) });
      const data = await resp.json() as Record<string, unknown>;
      piCtx.ui.notify(`🎵 Current tempo: ${data.tempo || "unknown"} BPM`);
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

async function handleTracks(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("❌ Ableton sidecar not running"); return; }
  try {
    const resp = await fetch(`http://${HOST}:${PORT}/tracks`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as { tracks: Array<Record<string, unknown>> };
    if (!data.tracks || data.tracks.length === 0) { piCtx.ui.notify("No tracks found (AbletonOSC may not be connected)"); return; }
    const lines = data.tracks.map(t => `  ${t.index}: ${t.name || "Unnamed"} | Vol: ${t.volume ?? "?"} | ${t.muted ? "🔇" : "🔊"}`);
    piCtx.ui.notify(`🎵 Tracks (${data.tracks.length}):\n${lines.join("\n")}`);
  } catch (err) { piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleStart(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (ok) { piCtx.ui.notify("✅ Ableton sidecar already running on port 7703"); return; }
  const { installed } = checkInstalled();
  if (!installed) { piCtx.ui.notify("❌ Not installed. Run: pip install tekton-ableton"); return; }
  piCtx.ui.notify("🚀 Starting Ableton sidecar...");
  try {
    const proc = spawn("tekton-ableton", ["--mode", "http", "--port", String(PORT)], { detached: true, stdio: "ignore" });
    proc.unref(); sidecarProcess = proc;
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 1000)); if ((await checkHealth()).ok) { piCtx.ui.notify(`✅ Ableton sidecar started on port ${PORT}`); return; } }
    piCtx.ui.notify("⚠️ Sidecar process started but health check failed.");
  } catch (err) { piCtx.ui.notify(`❌ Failed: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleStopSvc(piCtx: ExtensionCommandContext): Promise<void> {
  if (sidecarProcess) { sidecarProcess.kill("SIGTERM"); sidecarProcess = null; piCtx.ui.notify("✅ Ableton sidecar stopped"); }
  else { piCtx.ui.notify("⚠️ No local sidecar process found"); }
}
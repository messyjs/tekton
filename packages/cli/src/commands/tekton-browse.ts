/**
 * /tekton:browse — Browser Use command.
 *
 * Subcommands:
 *   status    – Show sidecar status and browser availability
 *   task      – Submit a web browsing task
 *   start     – Start the sidecar service
 *   stop      – Stop the sidecar
 */

import type { CommandRegistration, CommandContext, ParsedArgs, AutocompleteEntry } from "./types.js";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import { spawn } from "node:child_process";

let sidecarProcess: import("node:child_process").ChildProcess | null = null;

const BROWSE_HOST = "127.0.0.1";
const BROWSE_PORT = 7702;

async function checkHealth(): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  try {
    const resp = await fetch(`http://${BROWSE_HOST}:${BROWSE_PORT}/health`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return { ok: false };
    const data = await resp.json() as Record<string, unknown>;
    return { ok: true, data };
  } catch { return { ok: false }; }
}

function checkInstalled(): { installed: boolean; version?: string } {
  try {
    const cmd = process.platform === "win32"
      ? "python -m tekton_browser_use --version 2>nul || pip show tekton-browser-use 2>nul"
      : "python -m tekton_browser_use --version 2>/dev/null || pip show tekton-browser-use 2>/dev/null";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000, stdio: "pipe" });
    if (result) {
      const match = result.match(/version:\s*([\d.]+)/i) || result.match(/(\d+\.\d+\.\d+)/);
      return { installed: true, version: match?.[1] };
    }
  } catch { /* not installed */ }
  return { installed: false };
}

export function createBrowseCommand(): CommandRegistration {
  return {
    name: "tekton:browse",
    description: "AI web browsing via browser-use sidecar (navigate, extract, automate)",
    subcommands: {
      status: "Show sidecar status and browser availability",
      task: "Submit a web browsing task",
      start: "Start the browser-use sidecar",
      stop: "Stop the browser-use sidecar",
    },
    handler: async (args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext) => {
      const sub = args.subcommand || "status";
      switch (sub) {
        case "status": await handleBrowseStatus(piCtx); break;
        case "task": await handleBrowseTask(args, piCtx); break;
        case "start": await handleBrowseStart(piCtx); break;
        case "stop": await handleBrowseStop(piCtx); break;
        default: piCtx.ui.notify(`Unknown subcommand: ${sub}. Use: status, task, start, stop`);
      }
    },
    getArgumentCompletions: (prefix: string): AutocompleteEntry[] | null => {
      const subs = ["status", "task", "start", "stop"];
      const matches = subs.filter(s => s.startsWith(prefix));
      return matches.length > 0 ? matches.map(s => ({ value: s, label: s })) : null;
    },
  };
}

async function handleBrowseStatus(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok, data } = await checkHealth();
  const { installed, version } = checkInstalled();
  if (!installed) {
    piCtx.ui.notify("Browser Use Sidecar\n\nNot installed. Run: pip install tekton-browser-use\nThen: tekton-browser-use --mode http");
    return;
  }
  const lines = ok ? "Sidecar running" : "Sidecar not running";
  piCtx.ui.notify(`Browser Use Sidecar\n${lines}\nInstalled: ${version || "yes"}\nLLM: ${data?.llm || "?"}`);
}

async function handleBrowseTask(args: ParsedArgs, piCtx: ExtensionCommandContext): Promise<void> {
  const taskDescription = args.positional.slice(1).join(" ");
  if (!taskDescription) { piCtx.ui.notify("Usage: /tekton:browse task <description>"); return; }
  const { ok } = await checkHealth();
  if (!ok) { piCtx.ui.notify("Sidecar not running. Start with: /tekton:browse start"); return; }
  piCtx.ui.notify(`Starting task: "${taskDescription}"`);
  try {
    const resp = await fetch(`http://${BROWSE_HOST}:${BROWSE_PORT}/task`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: taskDescription, max_steps: 50 }),
      signal: AbortSignal.timeout(300000),
    });
    const result = await resp.json() as Record<string, unknown>;
    if (result.task_id) {
      piCtx.ui.notify(`Task started: ${result.task_id}. Polling for result...`);
    } else {
      piCtx.ui.notify(`Result: ${JSON.stringify(result)}`);
    }
  } catch (err) { piCtx.ui.notify(`Error: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleBrowseStart(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (ok) { piCtx.ui.notify("Browser-use sidecar already running on port 7702"); return; }
  const { installed } = checkInstalled();
  if (!installed) { piCtx.ui.notify("Not installed. Run: pip install tekton-browser-use"); return; }
  piCtx.ui.notify("Starting browser-use sidecar...");
  try {
    const proc = spawn("tekton-browser-use", ["--mode", "http", "--port", String(BROWSE_PORT)], { detached: true, stdio: "ignore" });
    proc.unref(); sidecarProcess = proc;
    for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 1000)); if ((await checkHealth()).ok) { piCtx.ui.notify(`Sidecar started on port ${BROWSE_PORT}`); return; } }
    piCtx.ui.notify("Sidecar started but health check failed.");
  } catch (err) { piCtx.ui.notify(`Failed: ${err instanceof Error ? err.message : String(err)}`); }
}

async function handleBrowseStop(piCtx: ExtensionCommandContext): Promise<void> {
  if (sidecarProcess) { sidecarProcess.kill("SIGTERM"); sidecarProcess = null; piCtx.ui.notify("Sidecar stopped"); }
  else { piCtx.ui.notify("No local sidecar process found"); }
}

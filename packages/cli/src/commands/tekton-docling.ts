/**
 * /tekton:docling — Document intelligence command.
 *
 * Subcommands:
 *   status    – Show whether sidecar is running, installed version, supported formats
 *   parse     – Parse a document and display Markdown in terminal
 *   start     – Start the sidecar service
 *   stop      – Stop the sidecar
 *   formats   – List all supported input formats
 *   config    – Show current configuration
 */

import type { CommandRegistration, CommandContext, ParsedArgs, AutocompleteEntry } from "./types.js";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

let sidecarProcess: import("node:child_process").ChildProcess | null = null;

const DOCLING_HOST = "127.0.0.1";
const DOCLING_PORT = 7701;

/** Check sidecar health via HTTP. */
async function checkHealth(): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  try {
    const resp = await fetch(`http://${DOCLING_HOST}:${DOCLING_PORT}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return { ok: false };
    const data = await resp.json() as Record<string, unknown>;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

/** Check if Python tekton-docling package is installed. */
function checkInstalled(): { installed: boolean; version?: string } {
  try {
    const cmd = process.platform === "win32"
      ? "python -m tekton_docling --version 2>nul || pip show tekton-docling 2>nul"
      : "python -m tekton_docling --version 2>/dev/null || pip show tekton-docling 2>/dev/null";
    const result = execSync(cmd, { encoding: "utf-8", timeout: 5000, stdio: "pipe" });
    if (result) {
      const match = result.match(/version:\s*([\d.]+)/i) || result.match(/(\d+\.\d+\.\d+)/);
      return { installed: true, version: match?.[1] };
    }
  } catch { /* not installed */ }
  return { installed: false };
}

export function createDoclingCommand(): CommandRegistration {
  return {
    name: "tekton:docling",
    description: "Document intelligence via Docling sidecar (parse PDF, DOCX, PPTX, images, etc.)",
    subcommands: {
      status: "Show sidecar status, version, supported formats",
      parse: "Parse a document and display Markdown",
      start: "Start the Docling sidecar service",
      stop: "Stop the Docling sidecar",
      formats: "List all supported input formats",
      config: "Show current Docling configuration",
    },
    handler: async (args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext) => {
      const sub = args.subcommand || "status";
      switch (sub) {
        case "status":
          await handleStatus(piCtx);
          break;
        case "parse":
          await handleParse(args, piCtx);
          break;
        case "start":
          await handleStart(piCtx);
          break;
        case "stop":
          await handleStop(piCtx);
          break;
        case "formats":
          await handleFormats(piCtx);
          break;
        case "config":
          await handleConfig(ctx, piCtx);
          break;
        default:
          piCtx.ui.notify(`Unknown subcommand: ${sub}. Use: status, parse, start, stop, formats, config`);
      }
    },
    getArgumentCompletions: (prefix: string): AutocompleteEntry[] | null => {
      const subs = ["status", "parse", "start", "stop", "formats", "config"];
      const matches = subs.filter(s => s.startsWith(prefix));
      return matches.length > 0 ? matches.map(s => ({ value: s, label: s })) : null;
    },
  };
}

async function handleStatus(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok, data } = await checkHealth();
  const { installed, version } = checkInstalled();
  const versionStr = version ?? "not found";

  const lines = [
    "╔══════════════════════════════════════════╗",
    "║       Docling Document Intelligence       ║",
    "╠══════════════════════════════════════════╣",
    `║  Sidecar:  ${ok ? "✅ Running" : "❌ Not running"}                           ║`,
    `║  Installed: ${installed ? "✅ Yes" : "❌ No"}                              ║`,
    `║  Version:   ${versionStr}                                  ║`,
    "╚══════════════════════════════════════════╝",
  ];

  if (ok && data) {
    const caps = data.capabilities as Record<string, boolean> | undefined;
    if (caps) {
      lines.push("");
      lines.push("Capabilities:");
      lines.push(`  OCR:     ${caps.ocr ? "✅" : "❌"}`);
      lines.push(`  Tables:  ${caps.tables ? "✅" : "❌"}`);
      lines.push(`  VLM:     ${caps.vlm ? "✅" : "❌"}`);
      lines.push(`  Cache:   ${caps.cache ? "✅" : "❌"}`);
    }
  } else if (!installed) {
    lines.push("");
    lines.push("Install with: pip install tekton-docling");
    lines.push("Then start:   tekton-docling --mode http");
  }

  piCtx.ui.notify(lines.join("\n"));
}

async function handleParse(args: ParsedArgs, piCtx: ExtensionCommandContext): Promise<void> {
  const filePath = args.positional[0];
  if (!filePath) {
    piCtx.ui.notify("Usage: /tekton:docling parse <path> [--format markdown|html|json|doctags]");
    return;
  }

  const { ok } = await checkHealth();
  if (!ok) {
    piCtx.ui.notify("❌ Docling sidecar not running. Start with: /tekton:docling start");
    return;
  }

  const format = (args.flags.format as string) || "markdown";
  piCtx.ui.notify(`📄 Parsing ${filePath}...`);

  try {
    const formData = new FormData();
    formData.append("path", filePath);
    formData.append("output_format", format);
    formData.append("ocr", "true");
    formData.append("table_mode", "accurate");

    const resp = await fetch(`http://${DOCLING_HOST}:${DOCLING_PORT}/parse`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(120000),
    });

    if (!resp.ok) {
      const err = await resp.text();
      piCtx.ui.notify(`❌ Parse failed (${resp.status}): ${err}`);
      return;
    }

    const result = await resp.json() as { source: string; format: string; content: string; success: boolean };
    if (result.success && result.content) {
      const content = result.content.length > 10000
        ? result.content.slice(0, 10000) + "\n\n[...truncated]"
        : result.content;
      piCtx.ui.notify(content);
    } else {
      piCtx.ui.notify(`❌ Parse failed: ${JSON.stringify(result)}`);
    }
  } catch (err) {
    piCtx.ui.notify(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleStart(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (ok) {
    piCtx.ui.notify("✅ Docling sidecar is already running on port 7701");
    return;
  }

  const { installed } = checkInstalled();
  if (!installed) {
    piCtx.ui.notify("❌ tekton-docling not installed. Install with: pip install tekton-docling");
    return;
  }

  piCtx.ui.notify("🚀 Starting Docling sidecar...");

  try {
    const { spawn } = await import("node:child_process");
    const proc = spawn("tekton-docling", ["--mode", "http", "--port", String(DOCLING_PORT)], {
      detached: true,
      stdio: "ignore",
    });
    proc.unref();
    sidecarProcess = proc;

    // Wait for health check
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const health = await checkHealth();
      if (health.ok) {
        piCtx.ui.notify(`✅ Docling sidecar started on port ${DOCLING_PORT}`);
        return;
      }
    }
    piCtx.ui.notify("⚠️ Sidecar process started but health check failed. It may need more time to initialize.");
  } catch (err) {
    piCtx.ui.notify(`❌ Failed to start sidecar: ${err instanceof Error ? err.message : String(err)}\nInstall with: pip install tekton-docling`);
  }
}

async function handleStop(piCtx: ExtensionCommandContext): Promise<void> {
  if (sidecarProcess) {
    sidecarProcess.kill("SIGTERM");
    sidecarProcess = null;
    piCtx.ui.notify("✅ Docling sidecar stopped");
  } else {
    try {
      if (process.platform === "win32") {
        execSync("for /f \"tokens=5\" %a in ('netstat -aon | findstr :7701 | findstr LISTENING') do taskkill /F /PID %a 2>nul", { timeout: 3000 });
      } else {
        execSync("lsof -ti:7701 | xargs kill -TERM 2>/dev/null || true", { timeout: 3000 });
      }
      piCtx.ui.notify("✅ Docling sidecar stopped");
    } catch {
      piCtx.ui.notify("⚠️ No sidecar process found on port 7701");
    }
  }
}

async function handleFormats(piCtx: ExtensionCommandContext): Promise<void> {
  const { ok } = await checkHealth();
  if (!ok) {
    piCtx.ui.notify("❌ Docling sidecar not running. Start with: /tekton:docling start");
    return;
  }

  try {
    const resp = await fetch(`http://${DOCLING_HOST}:${DOCLING_PORT}/formats`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) {
      piCtx.ui.notify("❌ Could not fetch formats from sidecar");
      return;
    }
    const data = await resp.json() as { formats: Array<Record<string, unknown>> };

    const headers = ["Extension", "Description", "OCR"];
    const rows = data.formats.map((f) => [
      String(f.extension ?? ""),
      String(f.description ?? ""),
      f.ocr ? "✅" : "",
    ]);

    piCtx.ui.notify(`Supported Formats:\n${headers.join("\t")}\n${"─".repeat(60)}\n${rows.map(r => r.join("\t")).join("\n")}`);
  } catch (err) {
    piCtx.ui.notify(`❌ Error fetching formats: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function handleConfig(ctx: CommandContext, piCtx: ExtensionCommandContext): Promise<void> {
  const configPath = path.join(ctx.tektonHome, "docling.json");

  if (!fs.existsSync(configPath)) {
    // Copy default config
    const defaultPath = path.resolve(process.cwd(), "configs/docling.json");
    if (fs.existsSync(defaultPath)) {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.copyFileSync(defaultPath, configPath);
    }
  }

  const config = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, "utf-8")
    : "No configuration file found";

  piCtx.ui.notify(`Docling Configuration (${configPath}):\n\`\`\`json\n${config}\n\`\`\``);
}
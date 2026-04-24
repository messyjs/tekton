import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { loadConfig, DEFAULT_SOUL, type TektonConfig } from "@tekton/core";

// ── CLI argument types ──────────────────────────────────────────────

export interface PiArgs {
  continue: boolean;
  resume: string | null;
  print: boolean;
  mode: "interactive" | "print" | "rpc";
  provider: string | null;
  model: string | null;
  thinking: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | null;
  tools: string[];
  noSession: boolean;
  session: string | null;
}

export interface TektonFlags {
  route: "auto" | "fast" | "deep" | "rules";
  compress: "off" | "lite" | "full" | "ultra";
  noLearning: boolean;
  dashboard: boolean;
  dashboardPort: number;
  noDashboard: boolean;
  soul: string | null;
  personality: string | null;
  toolsets: string[];
  gateway: boolean;
  voice: boolean;
}

export interface ParsedArgs {
  pi: PiArgs;
  tekton: TektonFlags;
  initialMessage: string | null;
  showHelp: boolean;
}

const HELP_TEXT = `
Tekton — The self-improving coding agent

Usage: tekton [options] [message]

Pi options (pass-through):
  -c, --continue              Continue last session
  -r, --resume <file>        Resume a specific session
  -p, --print                 Print mode (single-shot, no TUI)
      --mode <mode>           Mode: interactive, print, rpc
      --provider <provider>   LLM provider
      --model <model>        Model name
      --thinking <level>     Thinking level: off|minimal|low|medium|high|xhigh
      --tools <list>          Comma-separated tool whitelist
      --no-session            Don't persist session
      --session <path>        Session file path

Tekton options:
      --route <mode>          Routing mode: auto|fast|deep|rules
      --compress <tier>       Compression: off|lite|full|ultra
      --no-learning           Disable skill extraction & learning
      --dashboard             Enable dashboard
      --dashboard-port <n>    Dashboard port (default: 7890)
      --no-dashboard          Disable dashboard
      --soul <path>           Override SOUL.md path
      --personality <preset>   Personality preset: teacher|reviewer|researcher|pragmatic|creative
      --toolsets <list>        Comma-separated toolset whitelist
      --gateway               Start gateway mode (messaging)
      --voice                  Enable voice I/O
  -h, --help                   Show this help

Examples:
  tekton                          Start interactive session
  tekton "list files"              Single-shot message
  tekton --route fast --compress ultra  Fast model + ultra compression
  tekton --mode rpc               JSON-RPC mode
  tekton --gateway                 Start messaging gateway
`.trim();

export { HELP_TEXT };

// ── Argument parser ─────────────────────────────────────────────────

export function parseArgs(argv: string[]): ParsedArgs {
  const pi: PiArgs = {
    continue: false,
    resume: null,
    print: false,
    mode: "interactive",
    provider: null,
    model: null,
    thinking: null,
    tools: [],
    noSession: false,
    session: null,
  };

  const tekton: TektonFlags = {
    route: "auto",
    compress: "full",
    noLearning: false,
    dashboard: false,
    dashboardPort: 7890,
    noDashboard: false,
    soul: null,
    personality: null,
    toolsets: [],
    gateway: false,
    voice: false,
  };

  let initialMessage: string | null = null;
  let showHelp = false;

  const validModes = ["interactive", "print", "rpc"] as const;
  const validRoutes = ["auto", "fast", "deep", "rules"] as const;
  const validCompressions = ["off", "lite", "full", "ultra"] as const;
  const validThinking = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      // ── Pi flags ──
      case "-c":
      case "--continue":
        pi.continue = true;
        break;
      case "-r":
      case "--resume":
        pi.resume = argv[++i] ?? "";
        break;
      case "-p":
      case "--print":
        pi.print = true;
        pi.mode = "print";
        break;
      case "--mode":
        i++;
        if (validModes.includes(argv[i] as any)) {
          pi.mode = argv[i] as PiArgs["mode"];
        } else {
          throw new Error(`Invalid mode: ${argv[i]}. Valid: ${validModes.join(", ")}`);
        }
        break;
      case "--provider":
        pi.provider = argv[++i] ?? null;
        break;
      case "--model":
        pi.model = argv[++i] ?? null;
        break;
      case "--thinking":
        i++;
        if (validThinking.includes(argv[i] as any)) {
          pi.thinking = argv[i] as NonNullable<PiArgs["thinking"]>;
        } else {
          throw new Error(`Invalid thinking level: ${argv[i]}. Valid: ${validThinking.join(", ")}`);
        }
        break;
      case "--tools":
        pi.tools = (argv[++i] ?? "").split(",").map(s => s.trim()).filter(Boolean);
        break;
      case "--no-session":
        pi.noSession = true;
        break;
      case "--session":
        pi.session = argv[++i] ?? null;
        break;

      // ── Tekton flags ──
      case "--route":
        i++;
        if (validRoutes.includes(argv[i] as any)) {
          tekton.route = argv[i] as TektonFlags["route"];
        } else {
          throw new Error(`Invalid route: ${argv[i]}. Valid: ${validRoutes.join(", ")}`);
        }
        break;
      case "--compress":
        i++;
        if (validCompressions.includes(argv[i] as any)) {
          tekton.compress = argv[i] as TektonFlags["compress"];
        } else {
          throw new Error(`Invalid compression: ${argv[i]}. Valid: ${validCompressions.join(", ")}`);
        }
        break;
      case "--no-learning":
        tekton.noLearning = true;
        break;
      case "--dashboard":
        tekton.dashboard = true;
        break;
      case "--dashboard-port":
        tekton.dashboardPort = parseInt(argv[++i] ?? "7890", 10);
        break;
      case "--no-dashboard":
        tekton.noDashboard = true;
        break;
      case "--soul":
        tekton.soul = argv[++i] ?? null;
        break;
      case "--personality":
        tekton.personality = argv[++i] ?? null;
        break;
      case "--toolsets":
        tekton.toolsets = (argv[++i] ?? "").split(",").map(s => s.trim()).filter(Boolean);
        break;
      case "--gateway":
        tekton.gateway = true;
        break;
      case "--voice":
        tekton.voice = true;
        break;
      case "-h":
      case "--help":
        showHelp = true;
        break;
      default:
        // Positional argument = initial message
        if (!arg.startsWith("-")) {
          initialMessage = arg;
        }
        break;
    }
  }

  return { pi, tekton, initialMessage, showHelp };
}

// ── Tekton home directory ──────────────────────────────────────────

export function getTektonHome(): string {
  const envHome = process.env.TEKTON_HOME;
  if (envHome) return envHome;
  return path.join(os.homedir(), ".tekton");
}

export function initTektonHome(tektonHome: string): void {
  const dirs = [
    tektonHome,
    path.join(tektonHome, "skills"),
    path.join(tektonHome, "sessions"),
    path.join(tektonHome, "cron"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Seed default files if they don't exist
  const soulPath = path.join(tektonHome, "SOUL.md");
  if (!fs.existsSync(soulPath)) {
    fs.writeFileSync(soulPath, DEFAULT_SOUL, "utf-8");
  }

  const memoryPath = path.join(tektonHome, "MEMORY.md");
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, "", "utf-8");
  }

  const userPath = path.join(tektonHome, "USER.md");
  if (!fs.existsSync(userPath)) {
    fs.writeFileSync(userPath, "", "utf-8");
  }

  const configPath = path.join(tektonHome, "config.yaml");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, "# Tekton configuration\nidentity:\n  name: tekton\n", "utf-8");
  }
}

// ── Main entry ──────────────────────────────────────────────────────

export async function run(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);

  if (parsed.showHelp) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Initialize Tekton home directory
  const tektonHome = getTektonHome();
  initTektonHome(tektonHome);

  // Load config
  const config = loadConfig(process.cwd());

  // Determine run mode
  const effectiveMode = parsed.pi.print ? "print" : parsed.pi.mode;

  // Import mode runner
  if (parsed.tekton.gateway) {
    const { startGatewayMode } = await import("./modes/gateway.js");
    await startGatewayMode(config, parsed, tektonHome);
    return;
  }

  switch (effectiveMode) {
    case "interactive": {
      const { startInteractiveMode } = await import("./modes/interactive.js");
      await startInteractiveMode(config, parsed, tektonHome);
      break;
    }
    case "print": {
      const { startPrintMode } = await import("./modes/print.js");
      await startPrintMode(config, parsed, tektonHome);
      break;
    }
    case "rpc": {
      const { startRpcMode } = await import("./modes/rpc.js");
      await startRpcMode(config, parsed, tektonHome);
      break;
    }
    default:
      console.error(`Unknown mode: ${effectiveMode}`);
      process.exit(1);
  }
}
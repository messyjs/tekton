import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import type { HermesBridge } from "@tekton/hermes-bridge";
import type { ModelRouter, SoulManager, PersonalityManager, MemoryManager, TelemetryTracker, TektonConfig } from "@tekton/core";

/**
 * Command context — all Tekton subsystems available to command handlers.
 */
export interface CommandContext {
  hermesBridge: HermesBridge;
  modelRouter: ModelRouter;
  soul: SoulManager;
  personality: PersonalityManager;
  memory: MemoryManager;
  telemetry: TelemetryTracker;
  config: TektonConfig;
  tektonHome: string;
}

/**
 * Parsed args from a slash command invocation.
 */
export interface ParsedArgs {
  /** The subcommand, e.g. "list" in /tekton:skills list */
  subcommand: string;
  /** Remaining positional arguments */
  positional: string[];
  /** Named flags, e.g. { json: true, verbose: true } from --json --verbose */
  flags: Record<string, string | boolean>;
  /** The original raw args string */
  raw: string;
}

/** Whether a feature is enabled/disabled */
export interface FeatureState {
  routing: boolean;
  learning: boolean;
  compression: boolean;
}

/**
 * A registered command definition.
 */
export interface AutocompleteEntry {
  value: string;
  label: string;
  description?: string;
}

export interface CommandRegistration {
  name: string;
  description: string;
  subcommands?: Record<string, string>;
  handler: (args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext) => Promise<void>;
  getArgumentCompletions?: (argumentPrefix: string) => AutocompleteEntry[] | null;
}

// ── Arg parsing ─────────────────────────────────────────────────────

export function parseArgs(raw: string): ParsedArgs {
  const tokens = tokenize(raw);
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let subcommand = "";

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("--")) {
      const flagName = token.slice(2);
      // Check if next token is a value (not another flag)
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        flags[flagName] = tokens[i + 1];
        i++;
      } else {
        flags[flagName] = true;
      }
    } else if (token.startsWith("-") && token.length === 2) {
      // Short flag like -j for json
      const flagName = token.slice(1);
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        flags[flagName] = tokens[i + 1];
        i++;
      } else {
        flags[flagName] = true;
      }
    } else {
      if (subcommand === "") {
        subcommand = token;
      } else {
        positional.push(token);
      }
    }
  }

  return { subcommand, positional, flags, raw };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (const char of input) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " " || char === "\t") {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

// ── Output formatting ────────────────────────────────────────────────

export function hasJsonFlag(args: ParsedArgs): boolean {
  return args.flags.json === true || args.flags.j === true;
}

export function formatBox(title: string, rows: Array<[string, string | number]>, width = 40): string {
  const innerWidth = width - 4;
  const top = `╔${"═".repeat(innerWidth)}╗`;
  const bottom = `╚${"═".repeat(innerWidth)}╝`;
  const titleLine = `║ ${title.padEnd(innerWidth - 1)}║`;

  const dataLines = rows.map(([key, value]) => {
    const label = key;
    const val = String(value);
    const padding = innerWidth - 1 - label.length - 2 - val.length;
    return `║  ${label}: ${val}${" ".repeat(Math.max(0, padding))}║`;
  });

  return [top, titleLine, `╠${"═".repeat(innerWidth)}╣`, ...dataLines, bottom].join("\n");
}

export function formatTable(headers: string[], rows: string[][]): string {
  const colWidths = headers.map((h, i) => {
    const maxDataLen = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
    return Math.max(h.length, maxDataLen);
  });

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i]!)).join("  ");
  const separator = colWidths.map(w => "─".repeat(w)).join("──");
  const dataLines = rows.map(row =>
    headers.map((_, i) => (row[i] ?? "").padEnd(colWidths[i]!)).join("  ")
  );

  return [headerLine, separator, ...dataLines].join("\n");
}

export function confirmAction(piCtx: ExtensionCommandContext, message: string): Promise<boolean> {
  return piCtx.ui.confirm("Confirm", message);
}

export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + "...";
}
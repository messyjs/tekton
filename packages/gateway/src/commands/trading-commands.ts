/**
 * Trading Commands — Slash commands for TradingAgents via Tekton Gateway.
 *
 * /analyze TICKER [DATE]  — Run full multi-agent analysis
 * /history TICKER          — Show past analysis results
 * /status                  — System health check
 * /models                  — Show LLM configuration
 * /cancel                  — Cancel running analysis
 *
 * These commands route through TradingAgents via the Python bridge.
 */
import type { CommandResult, CommandContext } from "./slash-commands.js";
import type { MessageEvent } from "../types.js";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TRADINGAGENTS_DIR = process.env.TRADINGAGENTS_DIR || "D:/AI Drive/pi-agent/TradingAgents";
const BRIDGE_SCRIPT = process.env.TRADINGAGENTS_BRIDGE || join(TRADINGAGENTS_DIR, "..", "tekton", "scripts", "trading_bridge.py");
const RESULTS_DIR = process.env.TRADINGAGENTS_RESULTS_DIR || join(homedir(), ".tekton", "tradingagents-bot", "results");

// Active analysis tasks (chatId -> process)
const activeTasks = new Map<string, { pid?: number; ticker: string; startTime: number }>();

/** Run the trading_bridge.py with a JSON command */
function callBridge(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const child = execFile("python3", [BRIDGE_SCRIPT], {
      env: {
        ...process.env,
        TRADINGAGENTS_DIR,
        TRADINGAGENTS_RESULTS_DIR: RESULTS_DIR,
      },
      timeout: 600_000,
      maxBuffer: 10 * 1024 * 1024,
      cwd: TRADINGAGENTS_DIR,
    }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error("Analysis timed out (10 min limit)"));
          return;
        }
        reject(new Error(error.message));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ raw: true, output: stdout.slice(-3000) });
      }
    });
    child.stdin?.write(JSON.stringify(params));
    child.stdin?.end();
    // Track the PID for cancellation
    if (child.pid) {
      params._pid = child.pid;
    }
  });
}

/** Format Markdown for Telegram */
function md(text: string): string {
  return text;
}

export function registerTradingCommands(): void {
  const { registerCommand } = require("./slash-commands.js");

  // /analyze TICKER [DATE]
  registerCommand("analyze", "Run full TradingAgents analysis on a ticker", async (args: string, event: MessageEvent, ctx: CommandContext): Promise<CommandResult> => {
    const parts = args.trim().split(/\s+/);
    const ticker = (parts[0] || "").toUpperCase();
    const date = parts[1] || undefined;

    if (!ticker) {
      return {
        response: md("**Usage:** `/tekton:analyze TICKER [YYYY-MM-DD]`\n\nRuns multi-agent analysis (4 analysts + debate + risk assessment).\nTakes 2-5 minutes. Example: `/tekton:analyze NVDA 2026-05-08`"),
      };
    }

    const chatId = event.channelId;

    // Check for existing task
    if (activeTasks.has(chatId)) {
      const existing = activeTasks.get(chatId)!;
      const elapsed = Math.round((Date.now() - existing.startTime) / 1000);
      return {
        response: md(`Analysis already running for ${existing.ticker} (${elapsed}s elapsed).\nUse /tekton:cancel to stop.`),
      };
    }

    // Acknowledge and run async
    const result = await callBridge({
      command: "analyze",
      ticker,
      date,
      debate_rounds: 1,
      risk_rounds: 1,
    });

    if (result.error) {
      return {
        response: md(`**Analysis failed for ${ticker}**\n\n${result.message}\n\n${(result.traceback as string || "").slice(0, 300)}`),
      };
    }

    // Format result
    const lines = [
      `**TradingAgents: ${result.ticker}**`,
      `Date: ${result.date || "today"}`,
      `Provider: ${result.provider || "ollama"}`,
      "",
    ];

    if (result.decision) {
      lines.push("**Decision:**");
      lines.push(String(result.decision).slice(0, 3000));
    }

    const knownFields = ["ticker", "date", "decision", "provider", "deep_llm", "quick_llm", "timestamp", "error"];
    for (const [key, val] of Object.entries(result)) {
      if (!knownFields.includes(key) && val && typeof val === "string" && val.length < 500) {
        lines.push(`**${key}:** ${val}`);
      }
    }

    lines.push("");
    lines.push(`_Completed at ${result.timestamp || new Date().toISOString()}_`);

    return { response: md(lines.join("\n")) };
  });

  // /history TICKER
  registerCommand("history", "Show past TradingAgents analyses", async (args: string): Promise<CommandResult> => {
    const ticker = args.trim().toUpperCase();
    const result = await callBridge({ command: "history", ticker, limit: 10 });

    if (!result.results || (result.results as unknown[]).length === 0) {
      return { response: md(`No past analyses found${ticker ? ` for ${ticker}` : ""}.`) };
    }

    const lines = [`**Past Analyses${ticker ? `: ${ticker}` : ""}**`, ""];
    for (const r of (result.results as Record<string, string>[])) {
      lines.push(`${r.date || "?"} — ${(r.decision || "?").slice(0, 100)}`);
    }
    lines.push("", `Total: ${result.count} results`);

    return { response: md(lines.join("\n")) };
  });

  // /status
  registerCommand("trading", "Show TradingAgents system status", async (): Promise<CommandResult> => {
    const result = await callBridge({ command: "status" });

    const lines = ["**TradingAgents Status**", ""];
    lines.push(`TradingAgents: ${(result.tradingagents as Record<string, unknown>)?.installed ? "installed" : "not found"}`);
    lines.push(`Ollama: ${(result.ollama as Record<string, unknown>)?.connected ? "connected" : "offline"}`);

    const config = result.config as Record<string, string>;
    if (config) {
      lines.push(`Deep Think: ${config.deep_think_llm}`);
      lines.push(`Quick Think: ${config.quick_think_llm}`);
      lines.push(`Provider: ${config.provider} @ ${config.base_url}`);
      lines.push(`Checkpoints: ${config.checkpoint_enabled ? "enabled" : "disabled"}`);
    }

    return { response: md(lines.join("\n")) };
  });

  // /models
  registerCommand("models", "Show TradingAgents LLM configuration", async (): Promise<CommandResult> => {
    const result = await callBridge({ command: "models" });

    const lines = ["**TradingAgents Model Config**", ""];
    const dt = result.deep_think as Record<string, string>;
    const qt = result.quick_think as Record<string, string>;
    if (dt) lines.push(`Deep Think: ${dt.model} (${dt.provider})`);
    if (qt) lines.push(`Quick Think: ${qt.model} (${qt.provider})`);
    lines.push(`Data: yfinance (all)`);
    lines.push(`Checkpoints: ${result.checkpoint_enabled ? "enabled" : "disabled"}`);

    return { response: md(lines.join("\n")) };
  });

  // /cancel
  registerCommand("cancel", "Cancel active TradingAgents analysis", async (_args: string, event: MessageEvent): Promise<CommandResult> => {
    const chatId = event.channelId;
    if (!activeTasks.has(chatId)) {
      return { response: md("No active analysis to cancel.") };
    }

    const task = activeTasks.get(chatId)!;
    if (task.pid) {
      try { process.kill(task.pid); } catch {}
    }
    activeTasks.delete(chatId);
    return { response: md(`Cancelled analysis for ${task.ticker}.`) };
  });
}
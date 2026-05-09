/**
 * TradingAgents Toolset — Multi-agent trading analysis tools for Tekton Agent.
 *
 * Calls TradingAgents Python bridge via subprocess (JSON stdin/stdout).
 * Does NOT import TradingAgents directly — clean separation between Node.js and Python.
 */
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import { homedir } from "node:os";
import { join } from "node:path";

const TRADINGAGENTS_DIR = process.env.TRADINGAGENTS_DIR || "D:/AI Drive/pi-agent/TradingAgents";
const BRIDGE_SCRIPT = join(TRADINGAGENTS_DIR, "..", "tekton", "scripts", "trading_bridge.py");
const RESULTS_DIR = process.env.TRADINGAGENTS_RESULTS_DIR || join(homedir(), ".tekton", "tradingagents-bot", "results");

/** Run trading_bridge.py with a JSON command, return parsed result */
function callBridge(params: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      TRADINGAGENTS_DIR,
      TRADINGAGENTS_RESULTS_DIR: RESULTS_DIR,
    };

    const child = execFile("python3", [BRIDGE_SCRIPT], {
      env,
      timeout: 600_000, // 10 min timeout
      maxBuffer: 10 * 1024 * 1024,
      cwd: TRADINGAGENTS_DIR,
    }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error("TradingAgents analysis timed out (10 min limit)"));
          return;
        }
        // Try to parse stderr for useful error info
        const errLines = stderr.split("\n").filter(l => !l.includes("UserWarning") && !l.includes("DeprecationWarning") && !l.includes("pydantic") && !l.includes("LangChain"));
        const errDetail = errLines.slice(-3).join(" ").trim();
        reject(new Error(errDetail || error.message));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch {
        // If not JSON, return raw output
        resolve({ raw: true, output: stdout.slice(-3000), errors: stderr.slice(-500) });
      }
    });

    // Send JSON to stdin
    child.stdin?.write(JSON.stringify(params));
    child.stdin?.end();
  });
}

/** Format a TradingAgents analysis result for display */
function formatAnalysis(result: Record<string, unknown>): string {
  if (result.error) {
    return `**Analysis Error**\n${result.message || "Unknown error"}\n\n${(result.traceback as string || "").slice(0, 500)}`;
  }

  const lines: string[] = [];
  lines.push(`**TradingAgents: ${result.ticker || "Unknown"}**`);
  lines.push(`Date: ${result.date || "N/A"}`);
  lines.push(`Provider: ${result.provider || "ollama"}`);
  lines.push(`Deep Think: ${result.deep_llm || "N/A"}`);
  lines.push(`Quick Think: ${result.quick_llm || "N/A"}`);
  lines.push("");

  if (result.decision) {
    const decision = String(result.decision);
    lines.push("**Decision:**");
    lines.push(decision);
    lines.push("");
  }

  // Add any extra fields from the decision object
  const knownFields = ["ticker", "date", "decision", "provider", "deep_llm", "quick_llm", "timestamp", "error", "message", "traceback"];
  for (const [key, val] of Object.entries(result)) {
    if (!knownFields.includes(key) && val && typeof val === "string" && val.length < 500) {
      lines.push(`**${key}:** ${val}`);
    }
  }

  lines.push("");
  lines.push(`_Analysis completed at ${result.timestamp || new Date().toISOString()}_`);

  return lines.join("\n");
}

// ── Tool Definitions ──

export const tradingAnalyzeTool: ToolDefinition = {
  name: "trading_analyze",
  toolset: "trading-agents",
  description: "Run full multi-agent trading analysis using TradingAgents (4 analysts + bull/bear debate + risk assessment + portfolio manager). Takes 2-5 minutes. Returns buy/sell/hold decision with reasoning.",
  parameters: Type.Object({
    ticker: Type.String({ description: "Stock/crypto ticker (e.g., NVDA, AAPL, BTC-USD)" }),
    date: Type.Optional(Type.String({ description: "Analysis date YYYY-MM-DD (default: today)" })),
    debate_rounds: Type.Optional(Type.Number({ description: "Max debate rounds (default: 1)" })),
    risk_rounds: Type.Optional(Type.Number({ description: "Max risk discussion rounds (default: 1)" })),
  }, { required: ["ticker"] }),
  async execute(params): Promise<ToolResult> {
    try {
      const result = await callBridge({
        command: "analyze",
        ticker: params.ticker,
        date: params.date,
        debate_rounds: params.debate_rounds,
        risk_rounds: params.risk_rounds,
      });

      if (result.error) {
        return { content: `Analysis failed: ${result.message}`, isError: true };
      }

      return { content: formatAnalysis(result) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: `TradingAgents error: ${msg}`, isError: true };
    }
  },
};

export const tradingHistoryTool: ToolDefinition = {
  name: "trading_history",
  toolset: "trading-agents",
  description: "Show past TradingAgents analysis results for a ticker or all tickers.",
  parameters: Type.Object({
    ticker: Type.Optional(Type.String({ description: "Ticker symbol (omit for all)" })),
    limit: Type.Optional(Type.Number({ description: "Max results to return (default: 10)" })),
  }),
  async execute(params): Promise<ToolResult> {
    try {
      const result = await callBridge({
        command: "history",
        ticker: params.ticker || "",
        limit: params.limit || 10,
      });

      if (!result.results || (result.results as unknown[]).length === 0) {
        return { content: `No past analyses found${params.ticker ? ` for ${params.ticker}` : ""}.` };
      }

      const lines = [`**Past Analyses${params.ticker ? `: ${params.ticker}` : ""}**`, ""];
      for (const r of result.results as Record<string, string>[]) {
        const date = r.date || "?";
        const decision = (r.decision || "?").slice(0, 100);
        const file = r.file || "?";
        lines.push(`${date} — ${decision} (${file})`);
      }
      lines.push("", `Total: ${result.count} results`);

      return { content: lines.join("\n") };
    } catch (err) {
      return { content: `History error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
    }
  },
};

export const tradingStatusTool: ToolDefinition = {
  name: "trading_status",
  toolset: "trading-agents",
  description: "Check TradingAgents system health — library status, Ollama connectivity, model availability.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    try {
      const result = await callBridge({ command: "status" });

      const lines = ["**TradingAgents System Status**", ""];
      lines.push(`Status: ${result.status}`);
      lines.push(`TradingAgents: ${(result.tradingagents as Record<string, unknown>)?.installed ? "installed" : "not found"}`);
      lines.push(`Ollama: ${(result.ollama as Record<string, unknown>)?.connected ? "connected" : "offline"}`);

      const config = result.config as Record<string, string>;
      if (config) {
        lines.push("");
        lines.push(`Deep Think: ${config.deep_think_llm}`);
        lines.push(`Quick Think: ${config.quick_think_llm}`);
        lines.push(`Provider: ${config.provider} @ ${config.base_url}`);
        lines.push(`Checkpointing: ${config.checkpoint_enabled ? "enabled" : "disabled"}`);
      }

      return { content: lines.join("\n") };
    } catch (err) {
      return { content: `Status error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
    }
  },
};

export const tradingModelsTool: ToolDefinition = {
  name: "trading_models",
  toolset: "trading-agents",
  description: "Show current TradingAgents LLM configuration.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    try {
      const result = await callBridge({ command: "models" });

      const lines = ["**TradingAgents Model Configuration**", ""];
      const dt = result.deep_think as Record<string, string>;
      const qt = result.quick_think as Record<string, string>;
      if (dt) lines.push(`Deep Think: ${dt.model} (${dt.provider} @ ${dt.base_url})`);
      if (qt) lines.push(`Quick Think: ${qt.model} (${qt.provider} @ ${qt.base_url})`);
      lines.push(`Data Vendors: ${JSON.stringify(result.data_vendors)}`);
      lines.push(`Checkpoints: ${result.checkpoint_enabled ? "enabled" : "disabled"}`);

      return { content: lines.join("\n") };
    } catch (err) {
      return { content: `Models error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
    }
  },
};
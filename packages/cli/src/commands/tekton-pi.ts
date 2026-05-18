/**
 * /tekton:pi — PI Agent trading intelligence control command.
 *
 * PI Agent is one of the three pillars of Tekton Agent (PI + Hermes + OpenMythos).
 * It runs in-process — no separate sidecar needed. Engines are available immediately.
 *
 * The optional `http-start` / `http-stop` commands start the HTTP sidecar
 * for external consumers (TradingView bot, Telegram bot) that need the REST API.
 */

import type { CommandRegistration, ParsedArgs, CommandContext } from "./types.js";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { defaultPiAgent } from "@tekton/core";

export function createPiCommand(): CommandRegistration {
  return {
    name: "tekton:pi",
    description: "PI Agent trading intelligence — Gann, Fibonacci, trade signals (built-in, always available)",
    subcommands: {
      status: "Engine/GLM/TV status",
      signal: "Trade signal (Gann+Fib)",
      gann: "Gann analysis",
      fib: "Fibonacci analysis",
      quote: "Current price from TV",
      positions: "Open positions",
      history: "Trade history",
      glm: "Ask local GLM model",
      trade: "Execute trade",
      close: "Close position",
      "http-start": "Start HTTP sidecar (:7706) for external consumers",
      "http-stop": "Stop HTTP sidecar",
    },
    async handler(args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext): Promise<void> {
      const sub = args.subcommand || "status";
      const rest = args.positional;

      switch (sub) {
        // ── Status (no HTTP needed — calls defaultPiAgent directly) ────
        case "status": {
          try {
            const status = await defaultPiAgent.status();
            piCtx.ui.notify([
              "⚡ PI Agent (built-in)",
              `   Engines:      ${status.enginesAvailable ? "✅" : "❌"}`,
              `   GLM 5.1:      ${status.glmAvailable ? "✅" : "❌"}`,
              `   TradingView:  ${status.tvMcpAvailable ? "✅" : "❌"}`,
              `   Positions:    ${status.openPositions} open`,
            ].join("\n"));
          } catch (err: any) {
            piCtx.ui.notify(`❌ ${err.message}`);
          }
          return;
        }

        // ── Trade Signal (the main entry point) ─────────────────────
        case "signal": {
          const symbol = rest[0];
          const price = rest[1] ? parseFloat(rest[1]) : undefined;
          const timeframe = rest[2] ?? "4H";
          const trend = rest[3] ?? "up";

          if (!symbol) { piCtx.ui.notify("Usage: /tekton:pi signal BTCUSD 104500 4H up"); return; }

          piCtx.ui.notify(`Computing trade signal for ${symbol}...`);
          try {
            let actualPrice = price;
            if (!actualPrice) {
              try {
                const quote = await defaultPiAgent.tvQuote(symbol);
                actualPrice = quote.price;
                piCtx.ui.notify(`  Price from TV: ${actualPrice}`);
              } catch {
                piCtx.ui.notify("❌ No price provided and TradingView not available");
                return;
              }
            }

            const pivots = [
              { price: actualPrice! * 0.97, time: Date.now() - 86400000 * 7, type: "low" as const },
              { price: actualPrice! * 1.02, time: Date.now() - 86400000 * 3, type: "high" as const },
              { price: actualPrice! * 0.99, time: Date.now() - 86400000, type: "low" as const },
              { price: actualPrice!, time: Date.now(), type: (trend === "up" ? "high" : "low") as "high" | "low" },
            ];

            const result = await defaultPiAgent.tradeSignal({ symbol, price: actualPrice!, pivots, timeframe, trend: trend as any });

            const lines = [
              `\n⚡ TRADE SIGNAL: ${result.symbol} ${result.price}`,
              `   Action:     ${result.action}`,
              `   Confidence: ${result.confidence}`,
              `   Score:      ${result.combinedScore}/100`,
              `   Stop Loss:  ${result.stopLoss}`,
              `   Take Profit:${result.takeProfit}`,
              `   Risk/Reward:${result.riskReward}`,
            ];
            if (result.crossEngineConfluence?.length) lines.push(`   Confluence: ${result.crossEngineConfluence.length} zones`);
            if (result.planetaryWarning) lines.push(`   ⚠️ Planetary Warning: ${result.planetaryWarning}`);
            piCtx.ui.notify(lines.join("\n"));
          } catch (err: any) {
            piCtx.ui.notify(`❌ Signal failed: ${err.message}`);
          }
          return;
        }

        // ── Gann ────────────────────────────────────────────────────
        case "gann": {
          if (rest[0] === "planetary") {
            try {
              const result = await defaultPiAgent.gannPlanetary();
              piCtx.ui.notify(`🪐 Planetary Positions:\n${JSON.stringify(result, null, 2)}`);
            } catch (err: any) { piCtx.ui.notify(`❌ ${err.message}`); }
            return;
          }
          piCtx.ui.notify("Usage: /tekton:pi gann planetary");
          return;
        }

        // ── Fib ─────────────────────────────────────────────────────
        case "fib": {
          piCtx.ui.notify("Fibonacci is included in /tekton:pi signal automatically. Use pi_fib_analyze tool for standalone Fib analysis.");
          return;
        }

        // ── Quote ───────────────────────────────────────────────────
        case "quote": {
          const symbol = rest[0];
          if (!symbol) { piCtx.ui.notify("Usage: /tekton:pi quote BTCUSD"); return; }
          try {
            const result = await defaultPiAgent.tvQuote(symbol);
            piCtx.ui.notify(`📊 ${result.symbol}: $${result.price} (${result.change >= 0 ? "+" : ""}${(result.changePercent ?? 0).toFixed(2)}%)`);
          } catch (err: any) { piCtx.ui.notify(`❌ Quote failed: ${err.message}`); }
          return;
        }

        // ── Positions ───────────────────────────────────────────────
        case "positions": {
          const positions = defaultPiAgent.getPositions();
          if (!positions.length) { piCtx.ui.notify("No open positions"); }
          else {
            const lines = positions.map(p => `  ${p.side} ${p.symbol} @ ${p.entry} | SL:${p.sl ?? "-"} TP:${p.tp ?? "-"} PnL:${p.pnl?.toFixed(2) ?? "-"}`);
            piCtx.ui.notify(`📐 Open Positions:\n${lines.join("\n")}`);
          }
          return;
        }

        // ── History ─────────────────────────────────────────────────
        case "history": {
          const history = defaultPiAgent.getTradeHistory();
          if (!history.length) { piCtx.ui.notify("No trade history"); }
          else {
            const lines = history.slice(-10).map(t => `  ${t.action} ${t.symbol} @ ${t.price} → ${t.outcome}`);
            piCtx.ui.notify(`📜 Recent Trades:\n${lines.join("\n")}`);
          }
          return;
        }

        // ── GLM ─────────────────────────────────────────────────────
        case "glm": {
          const question = rest.join(" ");
          if (!question) { piCtx.ui.notify("Usage: /tekton:pi glm <question>"); return; }
          try {
            piCtx.ui.notify("🤔 Asking GLM 5.1...");
            const result = await defaultPiAgent.glmAsk({ question });
            piCtx.ui.notify(`💡 ${result.answer}`);
          } catch (err: any) { piCtx.ui.notify(`❌ GLM failed: ${err.message}`); }
          return;
        }

        // ── Trade ──────────────────────────────────────────────────
        case "trade": {
          const [direction, symbol, p, sl, tp] = [rest[0], rest[1], rest[2] ? parseFloat(rest[2]) : 0, rest[3] ? parseFloat(rest[3]) : 0, rest[4] ? parseFloat(rest[4]) : 0];
          if (!direction || !symbol) { piCtx.ui.notify("Usage: /tekton:pi trade buy BTCUSD 104500 104311 104601"); return; }
          try {
            const result = await defaultPiAgent.tvExecuteTrade({ direction: direction as any, symbol, price: p, sl, tp });
            piCtx.ui.notify(`✅ Trade: ${direction} ${symbol}`);
          } catch (err: any) { piCtx.ui.notify(`❌ Trade failed: ${err.message}`); }
          return;
        }

        // ── Close ───────────────────────────────────────────────────
        case "close": {
          try {
            const result = await defaultPiAgent.tvClosePosition();
            piCtx.ui.notify(`✅ Position closed`);
          } catch (err: any) { piCtx.ui.notify(`❌ Close failed: ${err.message}`); }
          return;
        }

        // ── HTTP sidecar (optional, for external consumers) ──────────
        case "http-start": {
          const port = rest[0] ? parseInt(rest[0], 10) : 7706;
          piCtx.ui.notify(`Starting PI Agent HTTP sidecar on port ${port}...`);
          const { spawn } = await import("node:child_process");
          const proc = spawn("node", [
            require.resolve("@tekton/pi-agent-service/dist/cli.js"),
            "--mode", "http", "--port", String(port),
          ], { detached: true, stdio: "ignore" });
          proc.unref();
          await new Promise((r) => setTimeout(r, 2000));
          piCtx.ui.notify(`✅ HTTP sidecar at http://localhost:${port} (for external consumers only)`);
          return;
        }

        case "http-stop": {
          try {
            const { execSync } = await import("node:child_process");
            if (process.platform === "win32") {
              execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :7706 ^| findstr LISTENING') do taskkill /F /PID %a 2>nul`, { stdio: "ignore" as const });
            } else {
              execSync(`lsof -ti:7706 | xargs kill 2>/dev/null`, { stdio: "ignore" as const });
            }
            piCtx.ui.notify("✅ HTTP sidecar stopped");
          } catch {
            piCtx.ui.notify("No HTTP sidecar running");
          }
          return;
        }

        default: {
          piCtx.ui.notify([
            "⚡ PI Agent (built-in — always available)",
            "",
            "Trading Commands:",
            "  signal S P TF T  — Trade signal (Gann+Fib)",
            "  gann planetary   — Planetary positions",
            "  quote S          — Current price from TV",
            "  positions        — Open positions",
            "  history          — Trade history",
            "  glm Q            — Ask local GLM model",
            "  trade DIR S P SL TP — Execute trade",
            "  close            — Close position",
            "",
            "Optional HTTP sidecar (for bots/external apps):",
            "  http-start [port] — Start sidecar on :7706",
            "  http-stop         — Stop sidecar",
          ].join("\n"));
        }
      }
    },
  };
}
/**
 * PI Agent Service — HTTP + MCP dual-mode server for trading intelligence.
 *
 * Port 7706 for HTTP, or stdio for MCP.
 *
 * Usage:
 *   tekton-pi-agent --mode http --port 7706   # HTTP API
 *   tekton-pi-agent --mode mcp                 # MCP stdio server
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createServer } from "node:http";
import type { Server } from "node:http";

import {
  configure,
  getServiceStatus,
  gannAnalyze,
  gannLevels,
  gannRange,
  gannPlanetary,
  gannS9,
  gannAngles,
  fibAnalyze,
  masterBridgeSignal,
  glmAsk,
  glmInterpretGann,
  tvExecuteTrade,
  tvClosePosition,
  tvTradeStatus,
  tvQuote,
  tvData,
  tvCheckConnection,
  getPositions,
  getTradeHistory,
  recordPosition,
  recordTrade,
  type Pivot,
  type TradeSignal,
} from "./engine-bridge.js";

// ── MCP Server (stdio) ─────────────────────────────────────────────────

export const MCP_TOOLS = [
  { name: "pi_gann_analyze", description: "Full Gann analysis with scoring. Returns BUY/SELL/WAIT signals with confidence, SL/TP from Gann confluence zones.", inputSchema: { type: "object", properties: { symbol: { type: "string", description: "Trading symbol (e.g., BTCUSD)" }, price: { type: "number" }, pivots: { type: "array", items: { type: "object", properties: { price: { type: "number" }, time: { type: "number" }, type: { type: "string", enum: ["high", "low"] } }, required: ["price", "time", "type"] } }, timeframe: { type: "string", description: "e.g., 1m, 5m, 15m, 1H, 4H, 1D" }, trend: { type: "string", enum: ["up", "down", "sideways"] } }, required: ["symbol", "price", "pivots", "timeframe", "trend"] } },
  { name: "pi_gann_levels", description: "Quick SQ9 vibration levels from an anchor price", inputSchema: { type: "object", properties: { symbol: { type: "string" }, price: { type: "number" }, anchor: { type: "number", description: "Anchor pivot price" } }, required: ["symbol", "price", "anchor"] } },
  { name: "pi_fib_analyze", description: "Fibonacci retracements, extensions, confluence, and harmonic pattern detection", inputSchema: { type: "object", properties: { price: { type: "number" }, swings: { type: "array", items: { type: "object", properties: { price: { type: "number" }, type: { type: "string", enum: ["high", "low"] } }, required: ["price", "type"] } } }, required: ["price", "swings"] } },
  { name: "pi_trade_signal", description: "The primary combined Gann+Fib signal → BUY, SELL, or WAIT with exact SL/TP levels", inputSchema: { type: "object", properties: { symbol: { type: "string" }, price: { type: "number" }, pivots: { type: "array", items: { type: "object", properties: { price: { type: "number" }, time: { type: "number" }, type: { type: "string", enum: ["high", "low"] } }, required: ["price", "time", "type"] } }, timeframe: { type: "string" }, trend: { type: "string", enum: ["up", "down", "sideways"] }, minRR: { type: "number", description: "Minimum risk:reward ratio (default 1.5)" } }, required: ["symbol", "price", "pivots", "timeframe", "trend"] } },
  { name: "pi_glm_ask", description: "Query the local GLM 5.1 model", inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] } },
  { name: "pi_quote", description: "Get current price/quote from TradingView", inputSchema: { type: "object", properties: { symbol: { type: "string" } }, required: ["symbol"] } },
  { name: "pi_data", description: "Get OHLCV or indicator data from TradingView", inputSchema: { type: "object", properties: { command: { type: "string", description: "e.g., ohlcv, strategy_values" }, args: { type: "array", items: { type: "string" } } }, required: ["command"] } },
  { name: "pi_execute_trade", description: "Execute a trade via Pine Script injection with SL and TP", inputSchema: { type: "object", properties: { direction: { type: "string", enum: ["buy", "sell"] }, price: { type: "number" }, sl: { type: "number" }, tp: { type: "number" }, symbol: { type: "string" } }, required: ["direction", "price", "sl", "tp", "symbol"] } },
  { name: "pi_positions", description: "Get current open positions", inputSchema: { type: "object", properties: {} } },
  { name: "pi_trade_history", description: "Get recent trade history with P&L", inputSchema: { type: "object", properties: {} } },
  { name: "pi_status", description: "Get service status", inputSchema: { type: "object", properties: {} } },
  { name: "pi_gann_planetary", description: "Get current planetary cycle positions for Gann time analysis", inputSchema: { type: "object", properties: {} } },
  { name: "pi_gann_range", description: "Gann proportional range projections (1/8 through 3x)", inputSchema: { type: "object", properties: { high: { type: "number" }, low: { type: "number" } }, required: ["high", "low"] } },
];

export async function handleMcpRequest(request: { method: string; id: string; params?: Record<string, any> }): Promise<any> {
  const method = request.method;
  const id = request.id;
  const params = request.params ?? {};

  if (method === "initialize") {
    return { jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "tekton-pi-agent", version: "1.0.0" } } };
  }

  if (method === "tools/list") {
    return { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } };
  }

  if (method === "tools/call") {
    const toolName = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, any>;

    try {
      let result: any;
      switch (toolName) {
        case "pi_gann_analyze":
          result = await gannAnalyze(args as Parameters<typeof gannAnalyze>[0]);
          break;
        case "pi_gann_levels":
          result = await gannLevels(args as Parameters<typeof gannLevels>[0]);
          break;
        case "pi_fib_analyze":
          result = await fibAnalyze(args as Parameters<typeof fibAnalyze>[0]);
          break;
        case "pi_trade_signal":
          result = await masterBridgeSignal(args as Parameters<typeof masterBridgeSignal>[0]);
          break;
        case "pi_glm_ask":
          result = await glmAsk(args as Parameters<typeof glmAsk>[0]);
          break;
        case "pi_quote":
          result = await tvQuote(args.symbol as string);
          break;
        case "pi_data":
          result = await tvData(args as Parameters<typeof tvData>[0]);
          break;
        case "pi_execute_trade":
          result = await tvExecuteTrade(args as Parameters<typeof tvExecuteTrade>[0]);
          break;
        case "pi_positions":
          result = getPositions();
          break;
        case "pi_trade_history":
          result = getTradeHistory();
          break;
        case "pi_status":
          result = await getServiceStatus();
          break;
        case "pi_gann_planetary":
          result = await gannPlanetary();
          break;
        case "pi_gann_range":
          result = await gannRange(args as Parameters<typeof gannRange>[0]);
          break;
        default:
          return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
      }
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } };
    } catch (err: any) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }], isError: true } };
    }
  }

  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

export function runMcpServer(): void {
  const chunks: Buffer[] = [];
  process.stdin.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });
  process.stdin.on("end", async () => {
    const input = Buffer.concat(chunks).toString("utf-8");
    try {
      const request = JSON.parse(input);
      const response = await handleMcpRequest(request);
      process.stdout.write(JSON.stringify(response) + "\n");
    } catch (err: any) {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: err.message } }) + "\n");
    }
  });
}

// ── HTTP API (Hono) ─────────────────────────────────────────────────────

export function createApp(): Hono {
  const app = new Hono();

  app.use("*", cors());

  // ── Health ───────────────────────────────────────────────────────────

  app.get("/health", async (c) => {
    const status = await getServiceStatus();
    return c.json({ status: "ok", service: "tekton-pi-agent", version: "1.0.0", ...status });
  });

  // ── Gann ─────────────────────────────────────────────────────────────

  app.post("/gann/analyze", async (c) => {
    const body = await c.req.json();
    const result = await gannAnalyze(body);
    return c.json(result);
  });

  app.post("/gann/levels", async (c) => {
    const body = await c.req.json();
    const result = await gannLevels(body);
    return c.json(result);
  });

  app.post("/gann/range", async (c) => {
    const body = await c.req.json();
    const result = await gannRange(body);
    return c.json(result);
  });

  app.get("/gann/planetary", async (c) => {
    const result = await gannPlanetary();
    return c.json(result);
  });

  app.post("/gann/sq9", async (c) => {
    const body = await c.req.json();
    const result = await gannS9(body);
    return c.json(result);
  });

  app.post("/gann/angles", async (c) => {
    const body = await c.req.json();
    const result = await gannAngles(body);
    return c.json(result);
  });

  // ── Fibonacci ────────────────────────────────────────────────────────

  app.post("/fib/analyze", async (c) => {
    const body = await c.req.json();
    const result = await fibAnalyze(body);
    return c.json(result);
  });

  // ── Master Bridge (primary trade signal) ──────────────────────────────

  app.post("/master-bridge/trade", async (c) => {
    const body = await c.req.json();
    const result = await masterBridgeSignal(body);
    recordTrade(result, "pending");
    return c.json(result);
  });

  // ── GLM ──────────────────────────────────────────────────────────────

  app.post("/glm/ask", async (c) => {
    const body = await c.req.json();
    const result = await glmAsk(body);
    return c.json(result);
  });

  app.post("/glm/interpret-gann", async (c) => {
    const body = await c.req.json();
    const result = await glmInterpretGann(body);
    return c.json({ interpretation: result });
  });

  // ── TradingView ──────────────────────────────────────────────────────

  app.post("/tv/execute", async (c) => {
    const body = await c.req.json();
    const result = await tvExecuteTrade(body);
    if (body.direction === "buy" || body.direction === "sell") {
      recordPosition({ symbol: body.symbol, side: body.direction, qty: 1, entry: body.price, mark: body.price, tp: body.tp, sl: body.sl, pnl: 0 });
    }
    return c.json(result);
  });

  app.post("/tv/close", async (c) => {
    const result = await tvClosePosition();
    return c.json({ result });
  });

  app.get("/tv/status", async (c) => {
    const connected = await tvCheckConnection();
    const status = connected ? await tvTradeStatus() : "disconnected";
    return c.json({ connected, status });
  });

  app.get("/tv/quote/:symbol", async (c) => {
    const symbol = c.req.param("symbol");
    const result = await tvQuote(symbol);
    return c.json(result);
  });

  app.post("/tv/data", async (c) => {
    const body = await c.req.json();
    const result = await tvData(body);
    return c.json(result);
  });

  // ── Positions & History ──────────────────────────────────────────────

  app.get("/positions", (c) => c.json(getPositions()));
  app.get("/trade-history", (c) => c.json(getTradeHistory()));

  return app;
}

// ── PiAgentService class ─────────────────────────────────────────────

export class PiAgentService {
  readonly app: Hono;
  private server: Server | null = null;
  private port: number;

  constructor(port = 7706) {
    this.port = port;
    this.app = createApp();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        // Read request body for non-GET methods
        const chunks: Uint8Array[] = [];
        if (req.method !== "GET" && req.method !== "HEAD") {
          req.on("data", (chunk: Uint8Array) => chunks.push(chunk));
          req.on("end", () => {
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
            this.handleRequest(req, res, body);
          });
        } else {
          this.handleRequest(req, res, undefined);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`⚡ PI Agent Service running on http://localhost:${this.port}`);
        console.log(`   Health: http://localhost:${this.port}/health`);
        resolve();
      });

      this.server.on("error", reject);
    });
  }

  private async handleRequest(req: any, res: any, body: Buffer | undefined): Promise<void> {
    try {
      const url = `http://localhost:${this.port}${req.url}`;
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers as Record<string, any>)) {
        if (typeof value === "string") headers[key] = value;
        else if (Array.isArray(value)) headers[key] = value.join(", ");
      }

      const response = await this.app.fetch(new Request(url, {
        method: req.method,
        headers: new Headers(headers),
        body: body ? new ReadableStream({
          start(controller) {
            controller.enqueue(body);
            controller.close();
          },
        }) : undefined,
      }));

      res.statusCode = response.status;
      response.headers.forEach((v: string, k: string) => res.setHeader(k, v));
      const buf = await response.arrayBuffer();
      res.end(Buffer.from(buf));
    } catch (err: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

// ── Entry ─────────────────────────────────────────────────────────────

export function main(): void {
  const args = process.argv.slice(2);
  const modeIdx = args.indexOf("--mode");
  const mode = modeIdx >= 0 ? args[modeIdx + 1] : "http";
  const portIdx = args.indexOf("--port");
  const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : 7706;

  // Allow engine dir override
  const engineIdx = args.indexOf("--engine-dir");
  if (engineIdx >= 0) {
    configure({ engineDir: args[engineIdx + 1] });
  }
  const tvIdx = args.indexOf("--tv-mcp-dir");
  if (tvIdx >= 0) {
    configure({ tvMcpDir: args[tvIdx + 1] });
  }

  if (mode === "mcp") {
    runMcpServer();
    return;
  }

  // HTTP mode — use PiAgentService class
  const service = new PiAgentService(port);
  service.start().then(() => {
    console.log(`   Gann:   POST /gann/analyze, /gann/levels, /gann/planetary`);
    console.log(`   Fib:    POST /fib/analyze`);
    console.log(`   Trade:  POST /master-bridge/trade`);
    console.log(`   GLM:    POST /glm/ask`);
    console.log(`   TV:     POST /tv/execute, GET /tv/quote/:symbol`);
  }).catch((err: any) => {
    console.error("Failed to start PI Agent Service:", err);
    process.exit(1);
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
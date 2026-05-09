/**
 * PI Agent Engine Bridge — Type-safe wrappers around the JS math engines.
 *
 * Engines live at: D:\AI Drive\pi-agent\engines\
 * We import them directly since they're pure JS math (no external deps).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);

// ── Configuration ──────────────────────────────────────────────────────

export interface PiAgentConfig {
  /** Root directory containing the engine JS files */
  engineDir: string;
  /** Path to tradingview-mcp-jackson CLI */
  tvMcpDir: string;
  /** GLM client endpoint */
  glmEndpoint: string;
  /** Default timeout for engine calls (ms) */
  timeout: number;
}

const DEFAULT_CONFIG: PiAgentConfig = {
  engineDir: resolve("D:/AI Drive/pi-agent/engines"),
  tvMcpDir: resolve("D:/AI Drive/tradingview-mcp-jackson"),
  glmEndpoint: "http://localhost:11434/v1/chat/completions",
  timeout: 30000,
};

let _config: PiAgentConfig = { ...DEFAULT_CONFIG };

export function configure(config: Partial<PiAgentConfig>): void {
  _config = { ..._config, ...config };
}

export function getConfig(): PiAgentConfig {
  return { ..._config };
}

// ── Types ──────────────────────────────────────────────────────────────

export interface Pivot {
  price: number;
  time: number;
  type: "high" | "low";
}

export interface GannAnalysis {
  action: string;
  confidence: string;
  combinedScore: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  signals: string[];
  crossEngineConfluence?: Array<{ zone: number; strength: string }>;
  harmonicPattern?: { name: string; direction: string; dPoint: number };
  planetaryWarning?: string;
}

export interface GannLevels {
  anchor: number;
  levels: Array<{ price: number; type: string; rotations: number }>;
  nearestLevel: { price: number; distance: number } | null;
}

export interface FibAnalysis {
  retracement: Array<{ level: string; price: number }>;
  extensions: Array<{ level: string; price: number }>;
  confluence: Array<{ price: number; count: number; levels: string[] }>;
  timeZones: Array<{ date: string; index: number }>;
  harmonicPattern?: { name: string; direction: string; projectedD: number };
}

export interface TradeSignal extends GannAnalysis {
  symbol: string;
  price: number;
  timeframe: string;
  trend: string;
  timestamp: string;
}

export interface TVQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

export interface TVPosition {
  symbol: string;
  side: string;
  qty: number;
  entry: number;
  mark: number;
  tp: number | null;
  sl: number | null;
  pnl: number;
}

export interface ServiceStatus {
  enginesAvailable: boolean;
  glmAvailable: boolean;
  tvMcpAvailable: boolean;
  openPositions: number;
  lastTradeTime: string | null;
}

// ── Engine Calls ───────────────────────────────────────────────────────

async function runEngine(script: string, args: string[]): Promise<string> {
  const scriptPath = resolve(_config.engineDir, script);
  try {
    const { stdout, stderr } = await execFileAsync("node", [scriptPath, ...args], {
      timeout: _config.timeout,
      maxBuffer: 1024 * 1024,
    });
    if (stderr && !stderr.includes("DeprecationWarning")) {
      console.error(`[pi-agent] Engine stderr: ${stderr.slice(0, 500)}`);
    }
    return stdout.trim();
  } catch (err: any) {
    throw new Error(`Engine call failed (${script}): ${err.message}`);
  }
}

function parseJSON(text: string): any {
  // Engines sometimes wrap JSON in markdown code blocks or prepend text
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
                    text.match(/(\{[\s\S]*\})/) ||
                    text.match(/(\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch {}
  }
  try { return JSON.parse(text); } catch {}
  return { raw: text };
}

// ── Gann Engine ────────────────────────────────────────────────────────

/** Full Gann analysis with scoring */
export async function gannAnalyze(params: {
  symbol: string;
  price: number;
  pivots: Pivot[];
  timeframe: string;
  trend: "up" | "down" | "sideways";
  scale?: number;
}): Promise<GannAnalysis> {
  const pivotsJson = JSON.stringify(params.pivots);
  const output = await runEngine("gann_bridge.js", [
    "trade",
    "--symbol", params.symbol,
    "--price", String(params.price),
    "--pivots", pivotsJson,
    "--timeframe", params.timeframe,
    "--trend", params.trend,
  ]);
  return parseJSON(output);
}

/** Quick SQ9 vibration levels from an anchor price */
export async function gannLevels(params: {
  symbol: string;
  price: number;
  anchor: number;
}): Promise<GannLevels> {
  const output = await runEngine("gann_bridge.js", [
    "levels",
    "--symbol", params.symbol,
    "--price", String(params.price),
    "--anchor", String(params.anchor),
  ]);
  return parseJSON(output);
}

/** Gann range projections */
export async function gannRange(params: {
  high: number;
  low: number;
}): Promise<any> {
  const output = await runEngine("run_gann_v2.js", [
    "range",
    "--high", String(params.high),
    "--low", String(params.low),
  ]);
  return parseJSON(output);
}

/** Planetary cycle positions */
export async function gannPlanetary(): Promise<any> {
  const output = await runEngine("run_gann_v2.js", ["planetary"]);
  return parseJSON(output);
}

/** Square of 9 vibration levels */
export async function gannS9(params: {
  anchor: number;
  current: number;
}): Promise<any> {
  const output = await runEngine("run_gann_v2.js", [
    "sq9",
    "--anchor", String(params.anchor),
    "--current", String(params.current),
  ]);
  return parseJSON(output);
}

/** Gann angles from a pivot */
export async function gannAngles(params: {
  pivot: number;
  bars: number;
  current: number;
  direction: "up" | "down";
  scale?: number;
}): Promise<any> {
  const output = await runEngine("run_gann_v2.js", [
    "angles",
    "--pivot", String(params.pivot),
    "--bars", String(params.bars),
    "--current", String(params.current),
    "--direction", params.direction,
    ...(params.scale ? ["--scale", String(params.scale)] : []),
  ]);
  return parseJSON(output);
}

// ── Fibonacci Engine ───────────────────────────────────────────────────

/** Full Fibonacci analysis (retracements + extensions + confluence + harmonics) */
export async function fibAnalyze(params: {
  price: number;
  swings: Array<{ price: number; type: "high" | "low" }>;
  pivotTime?: number;
  timeframe?: string;
}): Promise<FibAnalysis> {
  // Fibonacci engine is an ES module (no CLI). Use master_bridge.js which imports it internally.
  const swingsArg = params.swings.map(s => ({ price: s.price, time: params.pivotTime ?? Date.now() / 1000 }));
  const pivotsArg = params.swings.map((s, i) => ({
    price: s.price, time: (params.pivotTime ?? Date.now() / 1000) - (params.swings.length - i) * 3600, type: s.type,
  }));
  const output = await runEngine("master_bridge.js", [
    "trade",
    "--symbol", "FIB",
    "--price", String(params.price),
    "--pivots", JSON.stringify(pivotsArg),
    "--swings", JSON.stringify(swingsArg),
    "--timeframe", params.timeframe ?? "4H",
    "--trend", "sideways",
    "--minRR", "0",
  ]);
  const result = parseJSON(output);
  return {
    retracement: result?.fibData?.retracement ?? result?.retracement ?? [],
    extensions: result?.fibData?.extensions ?? result?.extensions ?? [],
    confluence: result?.fibData?.confluence ?? result?.confluence ?? [],
    timeZones: result?.fibData?.timeZones ?? result?.timeZones ?? [],
    harmonicPattern: result?.harmonicPattern,
  };
}

// ── Master Bridge (Gann + Fib Combined) ───────────────────────────────

/** The primary trade signal — combines Gann 60% + Fib 40% → BUY/SELL/WAIT */
export async function masterBridgeSignal(params: {
  symbol: string;
  price: number;
  pivots: Pivot[];
  timeframe: string;
  trend: "up" | "down" | "sideways";
  minRR?: number;
}): Promise<TradeSignal> {
  const pivotsJson = JSON.stringify(params.pivots);
  const swingsJson = JSON.stringify(params.pivots.map(p => ({ price: p.price, time: p.time })));
  const args = [
    "trade",
    "--symbol", params.symbol,
    "--price", String(params.price),
    "--pivots", pivotsJson,
    "--swings", swingsJson,
    "--timeframe", params.timeframe,
    "--trend", params.trend,
    ...(params.minRR ? ["--minRR", String(params.minRR)] : ["--minRR", "1.5"]),
  ];
  const output = await runEngine("master_bridge.js", args);
  const result = parseJSON(output);
  return {
    ...result,
    symbol: params.symbol,
    price: params.price,
    timeframe: params.timeframe,
    trend: params.trend,
    timestamp: new Date().toISOString(),
  };
}

// ── GLM Client ────────────────────────────────────────────────────────

/** Query the local GLM 5.1 model (cheap/free for routine tasks) */
export async function glmAsk(params: {
  question: string;
  model?: string;
}): Promise<{ answer: string; model: string; cost: string }> {
  const output = await runEngine("glm_client.cjs", [
    "ask",
    params.question,
  ]);
  return {
    answer: output,
    model: params.model ?? "glm-5.1:cloud",
    cost: "local-0",
  };
}

/** Have GLM interpret Gann engine output in plain language */
export async function glmInterpretGann(gannOutput: any): Promise<string> {
  const output = await runEngine("glm_client.cjs", [
    "interpret-gann",
    JSON.stringify(gannOutput),
  ]);
  return output;
}

// ── TradingView ────────────────────────────────────────────────────────

/** Execute a trade via Pine Script injection */
export async function tvExecuteTrade(params: {
  direction: "buy" | "sell";
  price: number;
  sl: number;
  tp: number;
  symbol: string;
}): Promise<{ pineScript: string; status: string }> {
  const output = await runEngine("tv_trade_executor.cjs", [
    params.direction,
    "--price", String(params.price),
    "--sl", String(params.sl),
    "--tp", String(params.tp),
    "--symbol", params.symbol,
  ]);
  return parseJSON(output);
}

/** Close current position */
export async function tvClosePosition(): Promise<string> {
  const output = await runEngine("tv_trade_executor.cjs", ["close"]);
  return output;
}

/** Get trade executor status */
export async function tvTradeStatus(): Promise<string> {
  const output = await runEngine("tv_trade_executor.cjs", ["status"]);
  return output;
}

/** Get current quote via TradingView MCP */
export async function tvQuote(symbol: string): Promise<TVQuote> {
  try {
    const { stdout } = await execFileAsync("node", [
      resolve(_config.tvMcpDir, "src/cli/index.js"),
      "quote",
      symbol,
    ], { timeout: 15000 });
    return parseJSON(stdout);
  } catch (err: any) {
    throw new Error(`TV MCP quote failed: ${err.message}`);
  }
}

/** Get OHLCV / indicator data via TradingView MCP */
export async function tvData(params: {
  command: string;
  args?: string[];
}): Promise<any> {
  try {
    const args = params.args ?? [];
    const { stdout } = await execFileAsync("node", [
      resolve(_config.tvMcpDir, "src/cli/index.js"),
      "data",
      params.command,
      ...args,
    ], { timeout: 15000 });
    return parseJSON(stdout);
  } catch (err: any) {
    throw new Error(`TV MCP data failed: ${err.message}`);
  }
}

/** Check TradingView MCP availability */
export async function tvCheckConnection(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("node", [
      resolve(_config.tvMcpDir, "src/cli/index.js"),
      "status",
    ], { timeout: 10000 });
    return !stdout.toLowerCase().includes("error") && !stdout.toLowerCase().includes("not connected");
  } catch {
    return false;
  }
}

// ── GLM Connection Check ──────────────────────────────────────────────

export async function glmCheckConnection(): Promise<boolean> {
  try {
    const resp = await fetch(_config.glmEndpoint.replace("/v1/chat/completions", "/api/tags"), {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// ── Positions & History ────────────────────────────────────────────────

// In-memory position store (production: use SQLite or the trading-hq ledger)
const _positions: TVPosition[] = [];
const _tradeHistory: Array<TradeSignal & { outcome: string }> = [];

export function getPositions(): TVPosition[] {
  return [..._positions];
}

export function getTradeHistory(): Array<TradeSignal & { outcome: string }> {
  return [..._tradeHistory];
}

export function recordPosition(position: TVPosition): void {
  const idx = _positions.findIndex(p => p.symbol === position.symbol && p.side === position.side);
  if (idx >= 0) {
    _positions[idx] = position;
  } else {
    _positions.push(position);
  }
}

export function closePosition(symbol: string, side: string, pnl: number): void {
  const idx = _positions.findIndex(p => p.symbol === symbol && p.side === side);
  if (idx >= 0) {
    _positions.splice(idx, 1);
  }
}

export function recordTrade(signal: TradeSignal, outcome: string): void {
  _tradeHistory.push({ ...signal, outcome });
}

// ── Full Service Status ───────────────────────────────────────────────

export async function getServiceStatus(): Promise<ServiceStatus> {
  const [enginesOk, glmOk, tvOk] = await Promise.all([
    // Engines are local files — check if dir exists
    import("node:fs").then(fs => fs.existsSync(_config.engineDir)).catch(() => false),
    glmCheckConnection(),
    tvCheckConnection(),
  ]);

  return {
    enginesAvailable: enginesOk as boolean,
    glmAvailable: glmOk,
    tvMcpAvailable: tvOk,
    openPositions: _positions.length,
    lastTradeTime: _tradeHistory.length > 0
      ? _tradeHistory[_tradeHistory.length - 1].timestamp
      : null,
  };
}
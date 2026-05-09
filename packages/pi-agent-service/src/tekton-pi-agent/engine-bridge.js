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
const DEFAULT_CONFIG = {
    engineDir: resolve("D:/AI Drive/pi-agent/engines"),
    tvMcpDir: resolve("D:/AI Drive/tradingview-mcp-jackson"),
    glmEndpoint: "http://localhost:11434/v1/chat/completions",
    timeout: 30000,
};
let _config = { ...DEFAULT_CONFIG };
export function configure(config) {
    _config = { ..._config, ...config };
}
export function getConfig() {
    return { ..._config };
}
// ── Engine Calls ───────────────────────────────────────────────────────
async function runEngine(script, args) {
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
    }
    catch (err) {
        throw new Error(`Engine call failed (${script}): ${err.message}`);
    }
}
function parseJSON(text) {
    // Engines sometimes wrap JSON in markdown code blocks or prepend text
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ||
        text.match(/(\{[\s\S]*\})/) ||
        text.match(/(\[[\s\S]*\])/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        }
        catch { }
    }
    try {
        return JSON.parse(text);
    }
    catch { }
    return { raw: text };
}
// ── Gann Engine ────────────────────────────────────────────────────────
/** Full Gann analysis with scoring */
export async function gannAnalyze(params) {
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
export async function gannLevels(params) {
    const output = await runEngine("gann_bridge.js", [
        "levels",
        "--symbol", params.symbol,
        "--price", String(params.price),
        "--anchor", String(params.anchor),
    ]);
    return parseJSON(output);
}
/** Gann range projections */
export async function gannRange(params) {
    const output = await runEngine("run_gann_v2.js", [
        "range",
        "--high", String(params.high),
        "--low", String(params.low),
    ]);
    return parseJSON(output);
}
/** Planetary cycle positions */
export async function gannPlanetary() {
    const output = await runEngine("run_gann_v2.js", ["planetary"]);
    return parseJSON(output);
}
/** Square of 9 vibration levels */
export async function gannS9(params) {
    const output = await runEngine("run_gann_v2.js", [
        "sq9",
        "--anchor", String(params.anchor),
        "--current", String(params.current),
    ]);
    return parseJSON(output);
}
/** Gann angles from a pivot */
export async function gannAngles(params) {
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
export async function fibAnalyze(params) {
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
export async function masterBridgeSignal(params) {
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
export async function glmAsk(params) {
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
export async function glmInterpretGann(gannOutput) {
    const output = await runEngine("glm_client.cjs", [
        "interpret-gann",
        JSON.stringify(gannOutput),
    ]);
    return output;
}
// ── TradingView ────────────────────────────────────────────────────────
/** Execute a trade via Pine Script injection */
export async function tvExecuteTrade(params) {
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
export async function tvClosePosition() {
    const output = await runEngine("tv_trade_executor.cjs", ["close"]);
    return output;
}
/** Get trade executor status */
export async function tvTradeStatus() {
    const output = await runEngine("tv_trade_executor.cjs", ["status"]);
    return output;
}
/** Get current quote via TradingView MCP */
export async function tvQuote(symbol) {
    try {
        const { stdout } = await execFileAsync("node", [
            resolve(_config.tvMcpDir, "src/cli/index.js"),
            "quote",
            symbol,
        ], { timeout: 15000 });
        return parseJSON(stdout);
    }
    catch (err) {
        throw new Error(`TV MCP quote failed: ${err.message}`);
    }
}
/** Get OHLCV / indicator data via TradingView MCP */
export async function tvData(params) {
    try {
        const args = params.args ?? [];
        const { stdout } = await execFileAsync("node", [
            resolve(_config.tvMcpDir, "src/cli/index.js"),
            "data",
            params.command,
            ...args,
        ], { timeout: 15000 });
        return parseJSON(stdout);
    }
    catch (err) {
        throw new Error(`TV MCP data failed: ${err.message}`);
    }
}
/** Check TradingView MCP availability */
export async function tvCheckConnection() {
    try {
        const { stdout } = await execFileAsync("node", [
            resolve(_config.tvMcpDir, "src/cli/index.js"),
            "status",
        ], { timeout: 10000 });
        return !stdout.toLowerCase().includes("error") && !stdout.toLowerCase().includes("not connected");
    }
    catch {
        return false;
    }
}
// ── GLM Connection Check ──────────────────────────────────────────────
export async function glmCheckConnection() {
    try {
        const resp = await fetch(_config.glmEndpoint.replace("/v1/chat/completions", "/api/tags"), {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });
        return resp.ok;
    }
    catch {
        return false;
    }
}
// ── Positions & History ────────────────────────────────────────────────
// In-memory position store (production: use SQLite or the trading-hq ledger)
const _positions = [];
const _tradeHistory = [];
export function getPositions() {
    return [..._positions];
}
export function getTradeHistory() {
    return [..._tradeHistory];
}
export function recordPosition(position) {
    const idx = _positions.findIndex(p => p.symbol === position.symbol && p.side === position.side);
    if (idx >= 0) {
        _positions[idx] = position;
    }
    else {
        _positions.push(position);
    }
}
export function closePosition(symbol, side, pnl) {
    const idx = _positions.findIndex(p => p.symbol === symbol && p.side === side);
    if (idx >= 0) {
        _positions.splice(idx, 1);
    }
}
export function recordTrade(signal, outcome) {
    _tradeHistory.push({ ...signal, outcome });
}
// ── Full Service Status ───────────────────────────────────────────────
export async function getServiceStatus() {
    const [enginesOk, glmOk, tvOk] = await Promise.all([
        // Engines are local files — check if dir exists
        import("node:fs").then(fs => fs.existsSync(_config.engineDir)).catch(() => false),
        glmCheckConnection(),
        tvCheckConnection(),
    ]);
    return {
        enginesAvailable: enginesOk,
        glmAvailable: glmOk,
        tvMcpAvailable: tvOk,
        openPositions: _positions.length,
        lastTradeTime: _tradeHistory.length > 0
            ? _tradeHistory[_tradeHistory.length - 1].timestamp
            : null,
    };
}
//# sourceMappingURL=engine-bridge.js.map
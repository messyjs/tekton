/**
 * PI Agent — Trading intelligence module for Tekton Agent.
 *
 * One of the three pillars of Tekton Agent:
 *   - PI Agent  → trading intelligence (Gann, Fibonacci, GLM, Trade execution)
 *   - Hermes    → learning loop (SkillManager, Evaluator, Learner)
 *   - OpenMythos → model routing (ModelRouter, RulesEngine, scoreComplexity)
 *
 * Unlike the sidecar pattern (Ableton, FL Studio), PI Agent runs in-process.
 * The engines are pure JS math — no separate process needed.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const execFileAsync = promisify(execFile);
// ── Default Config ──────────────────────────────────────────────────────
const DEFAULT_PI_CONFIG = {
    engineDir: resolve("D:/AI Drive/pi-agent/engines"),
    tvMcpDir: resolve("D:/AI Drive/tradingview-mcp-jackson"),
    glmEndpoint: "http://localhost:11434/v1/chat/completions",
    timeout: 30000,
};
// ── PiAgent Class ──────────────────────────────────────────────────────
/**
 * PI Agent — the trading intelligence pillar of Tekton Agent.
 *
 * Usage:
 *   import { defaultPiAgent } from "@tekton/core";
 *   const signal = await defaultPiAgent.tradeSignal({ symbol: "BTCUSD", ... });
 *
 * Or create a custom instance:
 *   const pi = new PiAgent({ engineDir: "/custom/path" });
 */
export class PiAgent {
    config;
    // In-memory position store (production: use SQLite or trading-hq ledger)
    _positions = [];
    _tradeHistory = [];
    constructor(config) {
        this.config = { ...DEFAULT_PI_CONFIG, ...config };
    }
    // ── Engine Runtime ─────────────────────────────────────────────────
    /** Run a JS engine script and return stdout */
    async runEngine(script, args) {
        const scriptPath = resolve(this.config.engineDir, script);
        try {
            const { stdout, stderr } = await execFileAsync("node", [scriptPath, ...args], {
                timeout: this.config.timeout,
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
    /** Parse possibly messy JSON from engines */
    parseJSON(text) {
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
    // ── Gann Engine ────────────────────────────────────────────────────
    /** Full Gann analysis with scoring → BUY/SELL/WAIT signals */
    async gannAnalyze(params) {
        const output = await this.runEngine("gann_bridge.js", [
            "trade",
            "--symbol", params.symbol,
            "--price", String(params.price),
            "--pivots", JSON.stringify(params.pivots),
            "--timeframe", params.timeframe,
            "--trend", params.trend,
        ]);
        return this.parseJSON(output);
    }
    /** Quick SQ9 vibration levels from an anchor price */
    async gannLevels(params) {
        const output = await this.runEngine("gann_bridge.js", [
            "levels",
            "--symbol", params.symbol,
            "--price", String(params.price),
            "--anchor", String(params.anchor),
        ]);
        return this.parseJSON(output);
    }
    /** Gann proportional range projections */
    async gannRange(params) {
        const output = await this.runEngine("run_gann_v2.js", [
            "range", "--high", String(params.high), "--low", String(params.low),
        ]);
        return this.parseJSON(output);
    }
    /** Planetary cycle positions */
    async gannPlanetary() {
        const output = await this.runEngine("run_gann_v2.js", ["planetary"]);
        return this.parseJSON(output);
    }
    /** Square of 9 vibration levels */
    async gannS9(params) {
        const output = await this.runEngine("run_gann_v2.js", [
            "sq9", "--anchor", String(params.anchor), "--current", String(params.current),
        ]);
        return this.parseJSON(output);
    }
    /** Gann angles from a pivot */
    async gannAngles(params) {
        const output = await this.runEngine("run_gann_v2.js", [
            "angles", "--pivot", String(params.pivot), "--bars", String(params.bars),
            "--current", String(params.current), "--direction", params.direction,
            ...(params.scale ? ["--scale", String(params.scale)] : []),
        ]);
        return this.parseJSON(output);
    }
    // ── Fibonacci Engine ───────────────────────────────────────────────
    /**
     * Fibonacci analysis (retracements + extensions + confluence + harmonics).
     * Uses master_bridge.js which imports fibonacci_engine.js internally.
     * Returns the combined Gann+Fib signal with Fib-specific data.
     */
    async fibAnalyze(params) {
        // fibonacci_engine.js is an ES module with no CLI entry point.
        // master_bridge.js imports it internally — call via master_bridge.
        const swingsArg = params.swings.map(s => ({ price: s.price, time: params.pivotTime ?? Date.now() / 1000 }));
        const output = await this.runEngine("master_bridge.js", [
            "trade",
            "--symbol", "FIB",
            "--price", String(params.price),
            "--pivots", JSON.stringify(params.swings.map((s, i) => ({
                price: s.price, time: (params.pivotTime ?? Date.now() / 1000) - (params.swings.length - i) * 3600, type: s.type,
            }))),
            "--swings", JSON.stringify(swingsArg),
            "--timeframe", params.timeframe ?? "4H",
            "--trend", "sideways",
            "--minRR", "0",
        ]);
        const result = this.parseJSON(output);
        // Extract fib-specific fields from the combined result
        return {
            retracement: result?.fibData?.retracement ?? result?.retracement ?? [],
            extensions: result?.fibData?.extensions ?? result?.extensions ?? [],
            confluence: result?.fibData?.confluence ?? result?.confluence ?? [],
            timeZones: result?.fibData?.timeZones ?? result?.timeZones ?? [],
            harmonicPattern: result?.harmonicPattern,
        };
    }
    // ── Master Bridge (Gann 60% + Fib 40%) ─────────────────────────────
    /** The primary trade signal — combines Gann 60% + Fibonacci 40% → BUY/SELL/WAIT */
    async tradeSignal(params) {
        // Pass pivots as both pivots (Gann) and swings (Fib)
        const swingsArg = params.pivots.map(p => ({ price: p.price, time: p.time }));
        const output = await this.runEngine("master_bridge.js", [
            "trade",
            "--symbol", params.symbol,
            "--price", String(params.price),
            "--pivots", JSON.stringify(params.pivots),
            "--swings", JSON.stringify(swingsArg),
            "--timeframe", params.timeframe,
            "--trend", params.trend,
            "--minRR", String(params.minRR ?? 1.5),
        ]);
        const result = this.parseJSON(output);
        return {
            ...result,
            symbol: params.symbol,
            price: params.price,
            timeframe: params.timeframe,
            trend: params.trend,
            timestamp: new Date().toISOString(),
        };
    }
    // ── GLM Client ─────────────────────────────────────────────────────
    /** Query the local GLM 5.1 model (cheap/free for routine tasks) */
    async glmAsk(params) {
        const output = await this.runEngine("glm_client.cjs", ["ask", params.question]);
        return { answer: output, model: params.model ?? "glm-5.1:cloud", cost: "local-0" };
    }
    /** Have GLM interpret Gann engine output in plain language */
    async glmInterpretGann(gannOutput) {
        const output = await this.runEngine("glm_client.cjs", ["interpret-gann", JSON.stringify(gannOutput)]);
        return output;
    }
    // ── TradingView ────────────────────────────────────────────────────
    /** Execute a trade via Pine Script injection */
    async tvExecuteTrade(params) {
        const output = await this.runEngine("tv_trade_executor.cjs", [
            params.direction, "--price", String(params.price),
            "--sl", String(params.sl), "--tp", String(params.tp), "--symbol", params.symbol,
        ]);
        const result = this.parseJSON(output);
        // Record position
        this.recordPosition({
            symbol: params.symbol, side: params.direction, qty: 1,
            entry: params.price, mark: params.price, tp: params.tp, sl: params.sl, pnl: 0,
        });
        return result;
    }
    /** Close current position */
    async tvClosePosition() {
        const output = await this.runEngine("tv_trade_executor.cjs", ["close"]);
        return output;
    }
    /** Get trade executor status */
    async tvTradeStatus() {
        const output = await this.runEngine("tv_trade_executor.cjs", ["status"]);
        return output;
    }
    /** Get current quote via TradingView MCP CLI */
    async tvQuote(symbol) {
        const { stdout } = await execFileAsync("node", [
            resolve(this.config.tvMcpDir, "src/cli/index.js"), "quote", symbol,
        ], { timeout: 15000 });
        return this.parseJSON(stdout);
    }
    /** Get OHLCV / indicator data via TradingView MCP CLI */
    async tvData(params) {
        const args = params.args ?? [];
        const { stdout } = await execFileAsync("node", [
            resolve(this.config.tvMcpDir, "src/cli/index.js"), "data", params.command, ...args,
        ], { timeout: 15000 });
        return this.parseJSON(stdout);
    }
    /** Check TradingView MCP availability */
    async tvCheckConnection() {
        try {
            const { stdout } = await execFileAsync("node", [
                resolve(this.config.tvMcpDir, "src/cli/index.js"), "status",
            ], { timeout: 10000 });
            return !stdout.toLowerCase().includes("error") && !stdout.toLowerCase().includes("not connected");
        }
        catch {
            return false;
        }
    }
    /** Check GLM availability */
    async glmCheckConnection() {
        try {
            const resp = await fetch(this.config.glmEndpoint.replace("/v1/chat/completions", "/api/tags"), {
                method: "GET", signal: AbortSignal.timeout(5000),
            });
            return resp.ok;
        }
        catch {
            return false;
        }
    }
    // ── Positions & History ────────────────────────────────────────────
    getPositions() {
        return [...this._positions];
    }
    getTradeHistory() {
        return [...this._tradeHistory];
    }
    recordPosition(position) {
        const idx = this._positions.findIndex(p => p.symbol === position.symbol && p.side === position.side);
        if (idx >= 0)
            this._positions[idx] = position;
        else
            this._positions.push(position);
    }
    closePosition(symbol, side) {
        const idx = this._positions.findIndex(p => p.symbol === symbol && p.side === side);
        if (idx >= 0)
            this._positions.splice(idx, 1);
    }
    recordTrade(signal, outcome) {
        this._tradeHistory.push({ ...signal, outcome });
    }
    // ── Full Service Status ────────────────────────────────────────────
    async status() {
        const [enginesOk, glmOk, tvOk] = await Promise.all([
            Promise.resolve(existsSync(this.config.engineDir)),
            this.glmCheckConnection(),
            this.tvCheckConnection(),
        ]);
        return {
            enginesAvailable: enginesOk,
            glmAvailable: glmOk,
            tvMcpAvailable: tvOk,
            openPositions: this._positions.length,
            lastTradeTime: this._tradeHistory.length > 0
                ? this._tradeHistory[this._tradeHistory.length - 1].timestamp
                : null,
        };
    }
}
// ── Singleton ──────────────────────────────────────────────────────────
/** Default PI Agent instance — available the moment Tekton starts */
export const defaultPiAgent = new PiAgent();
//# sourceMappingURL=pi-agent.js.map
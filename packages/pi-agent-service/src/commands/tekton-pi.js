/**
 * /tekton:pi — PI Agent trading intelligence control command.
 *
 * This command is a thin HTTP client to the PI Agent sidecar running on :7706.
 * It does NOT import from the CLI package — it's self-contained so the
 * pi-agent-service package can compile independently.
 *
 * To register this command, add it to the CLI's command registry:
 *   import { piCommand } from "@tekton/pi-agent-service/commands";
 *   registry.register(piCommand);
 */
const PORT = 7706;
const BASE = `http://localhost:${PORT}`;
async function check() {
    try {
        const resp = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await resp.json();
        return { ok: true, data };
    }
    catch {
        return { ok: false };
    }
}
async function api(path, method = "GET", body) {
    const opts = { method, signal: AbortSignal.timeout(30000) };
    if (body) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
    }
    const resp = await fetch(`${BASE}${path}`, opts);
    return resp.json();
}
/** The PI Agent command definition — plain object, compatible with any CLI registry */
export const piCommand = {
    name: "tekton:pi",
    description: "PI Agent trading intelligence — Gann, Fibonacci, trade signals",
    subcommands: {
        status: "Service status",
        start: "Start the sidecar",
        stop: "Stop the sidecar",
        signal: "Trade signal (Gann+Fib)",
        gann: "Gann analysis",
        fib: "Fibonacci analysis",
        quote: "Current price from TV",
        positions: "Open positions",
        history: "Trade history",
        glm: "Query local GLM",
        trade: "Execute trade",
        close: "Close position",
    },
    async handler(args, ctx, pi, piCtx) {
        const sub = args.subcommand || args[0] || "status";
        const rest = args.positional ?? (Array.isArray(args) ? args.slice(1) : []);
        switch (sub) {
            case "status": {
                const { ok, data } = await check();
                if (!ok) {
                    piCtx?.ui?.notify?.("❌ PI Agent sidecar not running. Start with: /tekton:pi start") ?? console.log("❌ Sidecar not running");
                    return;
                }
                const msg = [
                    "⚡ PI Agent Service Status",
                    `   Engines:      ${data.enginesAvailable ? "✅ Available" : "❌ Not found"}`,
                    `   GLM 5.1:      ${data.glmAvailable ? "✅ Connected" : "❌ Disconnected"}`,
                    `   TradingView:  ${data.tvMcpAvailable ? "✅ Connected" : "❌ Disconnected"}`,
                    `   Positions:    ${data.openPositions ?? 0} open`,
                ].join("\n");
                piCtx?.ui?.notify?.(msg) ?? console.log(msg);
                return;
            }
            case "start": {
                const existing = await check();
                if (existing.ok) {
                    piCtx?.ui?.notify?.("✅ Already running on :7706") ?? console.log("Already running");
                    return;
                }
                piCtx?.ui?.notify?.("Starting PI Agent sidecar...") ?? console.log("Starting...");
                const { spawn } = await import("node:child_process");
                const proc = spawn("npx", ["tekton-pi-agent", "--mode", "http", "--port", String(PORT)], { detached: true, stdio: "ignore", shell: true });
                proc.unref();
                await new Promise((r) => setTimeout(r, 3000));
                const started = await check();
                piCtx?.ui?.notify?.(started.ok ? `✅ Running on port ${PORT}` : "⚠️ May still be starting.") ?? console.log(started.ok ? "Started" : "May still be starting");
                return;
            }
            case "stop": {
                try {
                    const { execSync } = await import("node:child_process");
                    if (process.platform === "win32")
                        execSync(`taskkill /F /FI "WINDOWTITLE eq tekton-pi-agent*" 2>nul`);
                    else
                        execSync(`pkill -f "tekton-pi-agent" 2>/dev/null`);
                    piCtx?.ui?.notify?.("✅ Stopped") ?? console.log("Stopped");
                }
                catch {
                    piCtx?.ui?.notify?.("May not be running") ?? console.log("Not running?");
                }
                return;
            }
            case "signal": {
                const symbol = rest[0];
                const price = rest[1] ? parseFloat(rest[1]) : undefined;
                const timeframe = rest[2] ?? "4H";
                const trend = rest[3] ?? "up";
                if (!symbol) {
                    piCtx?.ui?.notify?.("Usage: /tekton:pi signal BTCUSD 104500 4H up") ?? console.log("Usage: signal BTCUSD 104500 4H up");
                    return;
                }
                try {
                    let actualPrice = price;
                    if (!actualPrice) {
                        const q = await api(`/tv/quote/${symbol}`);
                        actualPrice = q.price;
                    }
                    const pivots = [
                        { price: actualPrice * 0.97, time: Date.now() - 86400000 * 7, type: "low" },
                        { price: actualPrice * 1.02, time: Date.now() - 86400000 * 3, type: "high" },
                        { price: actualPrice * 0.99, time: Date.now() - 86400000, type: "low" },
                        { price: actualPrice, time: Date.now(), type: trend === "up" ? "high" : "low" },
                    ];
                    const result = await api("/master-bridge/trade", "POST", { symbol, price: actualPrice, pivots, timeframe, trend });
                    const msg = `⚡ ${result.action} ${result.symbol} @ ${result.price}\n  Confidence: ${result.confidence} | Score: ${result.combinedScore}/100\n  SL: ${result.stopLoss} | TP: ${result.takeProfit} | RR: ${result.riskReward}`;
                    piCtx?.ui?.notify?.(msg) ?? console.log(msg);
                }
                catch (err) {
                    piCtx?.ui?.notify?.(`❌ ${err.message}`) ?? console.error(err);
                }
                return;
            }
            case "gann": {
                if (rest[0] === "planetary") {
                    try {
                        const r = await api("/gann/planetary");
                        piCtx?.ui?.notify?.(JSON.stringify(r, null, 2)) ?? console.log(r);
                    }
                    catch (e) {
                        piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                    }
                    return;
                }
                piCtx?.ui?.notify?.("Usage: /tekton:pi gann planetary") ?? console.log("Usage: gann planetary");
                return;
            }
            case "fib": {
                piCtx?.ui?.notify?.("Use /tekton:pi signal — Fib is included automatically") ?? console.log("Use signal");
                return;
            }
            case "quote": {
                const symbol = rest[0];
                if (!symbol) {
                    piCtx?.ui?.notify?.("Usage: /tekton:pi quote BTCUSD") ?? console.log("Usage: quote BTCUSD");
                    return;
                }
                try {
                    const r = await api(`/tv/quote/${symbol}`);
                    piCtx?.ui?.notify?.(`📊 ${r.symbol}: $${r.price}`) ?? console.log(`${r.symbol}: $${r.price}`);
                }
                catch (e) {
                    piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                }
                return;
            }
            case "positions": {
                try {
                    const p = await api("/positions");
                    piCtx?.ui?.notify?.(p.length ? `📐 ${p.length} positions` : "No positions") ?? console.log(p);
                }
                catch (e) {
                    piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                }
                return;
            }
            case "history": {
                try {
                    const h = await api("/trade-history");
                    piCtx?.ui?.notify?.(h.length ? `📜 ${h.length} trades` : "No history") ?? console.log(h);
                }
                catch (e) {
                    piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                }
                return;
            }
            case "glm": {
                const question = rest.join(" ");
                if (!question) {
                    piCtx?.ui?.notify?.("Usage: /tekton:pi glm <question>") ?? console.log("Usage: glm <question>");
                    return;
                }
                try {
                    const r = await api("/glm/ask", "POST", { question });
                    piCtx?.ui?.notify?.(`💡 ${r.answer}`) ?? console.log(r.answer);
                }
                catch (e) {
                    piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                }
                return;
            }
            case "trade": {
                const [direction, symbol, p, sl, tp] = [rest[0], rest[1], rest[2] ? parseFloat(rest[2]) : 0, rest[3] ? parseFloat(rest[3]) : 0, rest[4] ? parseFloat(rest[4]) : 0];
                if (!direction || !symbol) {
                    piCtx?.ui?.notify?.("Usage: /tekton:pi trade buy BTCUSD 104500 104311 104601") ?? console.log("Usage: trade buy BTCUSD 104500 104311 104601");
                    return;
                }
                try {
                    const r = await api("/tv/execute", "POST", { direction, symbol, price: p, sl, tp });
                    piCtx?.ui?.notify?.(`✅ ${direction} ${symbol}`) ?? console.log(r);
                }
                catch (e) {
                    piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                }
                return;
            }
            case "close": {
                try {
                    const r = await api("/tv/close", "POST");
                    piCtx?.ui?.notify?.("✅ Closed") ?? console.log(r);
                }
                catch (e) {
                    piCtx?.ui?.notify?.(`❌ ${e.message}`) ?? console.error(e);
                }
                return;
            }
            default: {
                const help = "⚡ PI Agent — Use: status, start, stop, signal, gann, quote, positions, history, glm, trade, close";
                piCtx?.ui?.notify?.(help) ?? console.log(help);
            }
        }
    },
};
//# sourceMappingURL=tekton-pi.js.map
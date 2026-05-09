/**
 * PI Agent Toolset — First-class trading intelligence tools for Tekton Agent.
 *
 * These tools call the PI Agent engines directly (in-process), NOT via HTTP.
 * PI Agent is one of the three pillars of Tekton Agent (PI + Hermes + OpenMythos).
 *
 * Available immediately when Tekton starts — no sidecar or separate process needed.
 */
import { Type } from "@sinclair/typebox";
import { defaultPiAgent } from "@tekton/core";
export const piGannAnalyzeTool = {
    name: "pi_gann_analyze",
    toolset: "pi",
    description: "Full Gann analysis with scoring. Returns BUY/SELL/WAIT signals with confidence, SL/TP from Gann confluence zones.",
    parameters: Type.Object({
        symbol: Type.String({ description: "Trading symbol (e.g., BTCUSD)" }),
        price: Type.Number({ description: "Current price" }),
        pivots: Type.Array(Type.Object({
            price: Type.Number(),
            time: Type.Number(),
            type: Type.Union([Type.Literal("high"), Type.Literal("low")]),
        }), { description: "Recent pivot points from chart" }),
        timeframe: Type.String({ description: "e.g., 1m, 5m, 15m, 1H, 4H, 1D" }),
        trend: Type.Union([Type.Literal("up"), Type.Literal("down"), Type.Literal("sideways")]),
    }, { required: ["symbol", "price", "pivots", "timeframe", "trend"] }),
    async execute(params) {
        const result = await defaultPiAgent.gannAnalyze(params);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piGannLevelsTool = {
    name: "pi_gann_levels",
    toolset: "pi",
    description: "Quick SQ9 vibration levels from an anchor price.",
    parameters: Type.Object({
        symbol: Type.String(),
        price: Type.Number(),
        anchor: Type.Number({ description: "Anchor pivot price" }),
    }, { required: ["symbol", "price", "anchor"] }),
    async execute(params) {
        const result = await defaultPiAgent.gannLevels(params);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piGannPlanetaryTool = {
    name: "pi_gann_planetary",
    toolset: "pi",
    description: "Current planetary cycle positions for Gann time analysis.",
    parameters: Type.Object({}),
    async execute() {
        const result = await defaultPiAgent.gannPlanetary();
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piGannRangeTool = {
    name: "pi_gann_range",
    toolset: "pi",
    description: "Gann proportional range projections (1/8 through 3x).",
    parameters: Type.Object({
        high: Type.Number(),
        low: Type.Number(),
    }, { required: ["high", "low"] }),
    async execute(params) {
        const result = await defaultPiAgent.gannRange(params);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piFibAnalyzeTool = {
    name: "pi_fib_analyze",
    toolset: "pi",
    description: "Fibonacci retracements, extensions, confluence zones, and harmonic pattern detection.",
    parameters: Type.Object({
        price: Type.Number(),
        swings: Type.Array(Type.Object({
            price: Type.Number(),
            type: Type.Union([Type.Literal("high"), Type.Literal("low")]),
        })),
        timeframe: Type.Optional(Type.String()),
    }, { required: ["price", "swings"] }),
    async execute(params) {
        const result = await defaultPiAgent.fibAnalyze(params);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piTradeSignalTool = {
    name: "pi_trade_signal",
    toolset: "pi",
    description: "The primary combined Gann+Fib signal → BUY, SELL, or WAIT with exact SL/TP levels and risk:reward. This is the main entry point for trade decisions.",
    parameters: Type.Object({
        symbol: Type.String(),
        price: Type.Number(),
        pivots: Type.Array(Type.Object({
            price: Type.Number(),
            time: Type.Number(),
            type: Type.Union([Type.Literal("high"), Type.Literal("low")]),
        })),
        timeframe: Type.String(),
        trend: Type.Union([Type.Literal("up"), Type.Literal("down"), Type.Literal("sideways")]),
        minRR: Type.Optional(Type.Number({ description: "Minimum risk:reward ratio (default 1.5)" })),
    }, { required: ["symbol", "price", "pivots", "timeframe", "trend"] }),
    async execute(params) {
        const result = await defaultPiAgent.tradeSignal(params);
        // Record the signal
        defaultPiAgent.recordTrade(result, "pending");
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piGlmAskTool = {
    name: "pi_glm_ask",
    toolset: "pi",
    description: "Query the local GLM 5.1 model — cheap/free for routine analysis, indicator reading, summaries.",
    parameters: Type.Object({
        question: Type.String(),
    }, { required: ["question"] }),
    async execute(params) {
        const result = await defaultPiAgent.glmAsk(params);
        return { content: result.answer };
    },
};
export const piQuoteTool = {
    name: "pi_quote",
    toolset: "pi",
    description: "Get current price/quote from TradingView.",
    parameters: Type.Object({
        symbol: Type.String(),
    }, { required: ["symbol"] }),
    async execute(params) {
        const result = await defaultPiAgent.tvQuote(params.symbol);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piDataTool = {
    name: "pi_data",
    toolset: "pi",
    description: "Get OHLCV or indicator data from TradingView.",
    parameters: Type.Object({
        command: Type.String({ description: "e.g., ohlcv, strategy_values" }),
        args: Type.Optional(Type.Array(Type.String())),
    }, { required: ["command"] }),
    async execute(params) {
        const result = await defaultPiAgent.tvData(params);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piExecuteTradeTool = {
    name: "pi_execute_trade",
    toolset: "pi",
    description: "Execute a trade via Pine Script injection with SL and TP. ⚠️ Requires approval for live trading.",
    parameters: Type.Object({
        direction: Type.Union([Type.Literal("buy"), Type.Literal("sell")]),
        price: Type.Number(),
        sl: Type.Number({ description: "Stop loss price" }),
        tp: Type.Number({ description: "Take profit price" }),
        symbol: Type.String(),
    }, { required: ["direction", "price", "sl", "tp", "symbol"] }),
    async execute(params) {
        const result = await defaultPiAgent.tvExecuteTrade(params);
        return { content: JSON.stringify(result, null, 2) };
    },
};
export const piPositionsTool = {
    name: "pi_positions",
    toolset: "pi",
    description: "Get current open positions tracked by PI Agent.",
    parameters: Type.Object({}),
    async execute() {
        const positions = defaultPiAgent.getPositions();
        return { content: JSON.stringify(positions, null, 2) };
    },
};
export const piTradeHistoryTool = {
    name: "pi_trade_history",
    toolset: "pi",
    description: "Get recent trade history with P&L from PI Agent.",
    parameters: Type.Object({}),
    async execute() {
        const history = defaultPiAgent.getTradeHistory();
        return { content: JSON.stringify(history, null, 2) };
    },
};
export const piStatusTool = {
    name: "pi_status",
    toolset: "pi",
    description: "Get PI Agent status — engine availability, GLM connection, TradingView connection, open positions.",
    parameters: Type.Object({}),
    async execute() {
        const status = await defaultPiAgent.status();
        return { content: JSON.stringify(status, null, 2) };
    },
};
//# sourceMappingURL=index.js.map
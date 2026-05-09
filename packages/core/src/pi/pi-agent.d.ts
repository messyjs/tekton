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
    crossEngineConfluence?: Array<{
        zone: number;
        strength: string;
    }>;
    harmonicPattern?: {
        name: string;
        direction: string;
        dPoint: number;
    };
    planetaryWarning?: string;
}
export interface GannLevels {
    anchor: number;
    levels: Array<{
        price: number;
        type: string;
        rotations: number;
    }>;
    nearestLevel: {
        price: number;
        distance: number;
    } | null;
}
export interface FibAnalysis {
    retracement: Array<{
        level: string;
        price: number;
    }>;
    extensions: Array<{
        level: string;
        price: number;
    }>;
    confluence: Array<{
        price: number;
        count: number;
        levels: string[];
    }>;
    timeZones: Array<{
        date: string;
        index: number;
    }>;
    harmonicPattern?: {
        name: string;
        direction: string;
        projectedD: number;
    };
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
export declare class PiAgent {
    readonly config: PiAgentConfig;
    private _positions;
    private _tradeHistory;
    constructor(config?: Partial<PiAgentConfig>);
    /** Run a JS engine script and return stdout */
    private runEngine;
    /** Parse possibly messy JSON from engines */
    private parseJSON;
    /** Full Gann analysis with scoring → BUY/SELL/WAIT signals */
    gannAnalyze(params: {
        symbol: string;
        price: number;
        pivots: Pivot[];
        timeframe: string;
        trend: "up" | "down" | "sideways";
        scale?: number;
    }): Promise<GannAnalysis>;
    /** Quick SQ9 vibration levels from an anchor price */
    gannLevels(params: {
        symbol: string;
        price: number;
        anchor: number;
    }): Promise<GannLevels>;
    /** Gann proportional range projections */
    gannRange(params: {
        high: number;
        low: number;
    }): Promise<any>;
    /** Planetary cycle positions */
    gannPlanetary(): Promise<any>;
    /** Square of 9 vibration levels */
    gannS9(params: {
        anchor: number;
        current: number;
    }): Promise<any>;
    /** Gann angles from a pivot */
    gannAngles(params: {
        pivot: number;
        bars: number;
        current: number;
        direction: "up" | "down";
        scale?: number;
    }): Promise<any>;
    /**
     * Fibonacci analysis (retracements + extensions + confluence + harmonics).
     * Uses master_bridge.js which imports fibonacci_engine.js internally.
     * Returns the combined Gann+Fib signal with Fib-specific data.
     */
    fibAnalyze(params: {
        price: number;
        swings: Array<{
            price: number;
            type: "high" | "low";
        }>;
        pivotTime?: number;
        timeframe?: string;
    }): Promise<FibAnalysis>;
    /** The primary trade signal — combines Gann 60% + Fibonacci 40% → BUY/SELL/WAIT */
    tradeSignal(params: {
        symbol: string;
        price: number;
        pivots: Pivot[];
        timeframe: string;
        trend: "up" | "down" | "sideways";
        minRR?: number;
    }): Promise<TradeSignal>;
    /** Query the local GLM 5.1 model (cheap/free for routine tasks) */
    glmAsk(params: {
        question: string;
        model?: string;
    }): Promise<{
        answer: string;
        model: string;
        cost: string;
    }>;
    /** Have GLM interpret Gann engine output in plain language */
    glmInterpretGann(gannOutput: any): Promise<string>;
    /** Execute a trade via Pine Script injection */
    tvExecuteTrade(params: {
        direction: "buy" | "sell";
        price: number;
        sl: number;
        tp: number;
        symbol: string;
    }): Promise<{
        pineScript: string;
        status: string;
    }>;
    /** Close current position */
    tvClosePosition(): Promise<string>;
    /** Get trade executor status */
    tvTradeStatus(): Promise<string>;
    /** Get current quote via TradingView MCP CLI */
    tvQuote(symbol: string): Promise<TVQuote>;
    /** Get OHLCV / indicator data via TradingView MCP CLI */
    tvData(params: {
        command: string;
        args?: string[];
    }): Promise<any>;
    /** Check TradingView MCP availability */
    tvCheckConnection(): Promise<boolean>;
    /** Check GLM availability */
    glmCheckConnection(): Promise<boolean>;
    getPositions(): TVPosition[];
    getTradeHistory(): Array<TradeSignal & {
        outcome: string;
    }>;
    recordPosition(position: TVPosition): void;
    closePosition(symbol: string, side: string): void;
    recordTrade(signal: TradeSignal, outcome: string): void;
    status(): Promise<ServiceStatus>;
}
/** Default PI Agent instance — available the moment Tekton starts */
export declare const defaultPiAgent: PiAgent;
//# sourceMappingURL=pi-agent.d.ts.map
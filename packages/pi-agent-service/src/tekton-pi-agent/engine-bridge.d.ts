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
export declare function configure(config: Partial<PiAgentConfig>): void;
export declare function getConfig(): PiAgentConfig;
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
/** Full Gann analysis with scoring */
export declare function gannAnalyze(params: {
    symbol: string;
    price: number;
    pivots: Pivot[];
    timeframe: string;
    trend: "up" | "down" | "sideways";
    scale?: number;
}): Promise<GannAnalysis>;
/** Quick SQ9 vibration levels from an anchor price */
export declare function gannLevels(params: {
    symbol: string;
    price: number;
    anchor: number;
}): Promise<GannLevels>;
/** Gann range projections */
export declare function gannRange(params: {
    high: number;
    low: number;
}): Promise<any>;
/** Planetary cycle positions */
export declare function gannPlanetary(): Promise<any>;
/** Square of 9 vibration levels */
export declare function gannS9(params: {
    anchor: number;
    current: number;
}): Promise<any>;
/** Gann angles from a pivot */
export declare function gannAngles(params: {
    pivot: number;
    bars: number;
    current: number;
    direction: "up" | "down";
    scale?: number;
}): Promise<any>;
/** Full Fibonacci analysis (retracements + extensions + confluence + harmonics) */
export declare function fibAnalyze(params: {
    price: number;
    swings: Array<{
        price: number;
        type: "high" | "low";
    }>;
    pivotTime?: number;
    timeframe?: string;
}): Promise<FibAnalysis>;
/** The primary trade signal — combines Gann 60% + Fib 40% → BUY/SELL/WAIT */
export declare function masterBridgeSignal(params: {
    symbol: string;
    price: number;
    pivots: Pivot[];
    timeframe: string;
    trend: "up" | "down" | "sideways";
    minRR?: number;
}): Promise<TradeSignal>;
/** Query the local GLM 5.1 model (cheap/free for routine tasks) */
export declare function glmAsk(params: {
    question: string;
    model?: string;
}): Promise<{
    answer: string;
    model: string;
    cost: string;
}>;
/** Have GLM interpret Gann engine output in plain language */
export declare function glmInterpretGann(gannOutput: any): Promise<string>;
/** Execute a trade via Pine Script injection */
export declare function tvExecuteTrade(params: {
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
export declare function tvClosePosition(): Promise<string>;
/** Get trade executor status */
export declare function tvTradeStatus(): Promise<string>;
/** Get current quote via TradingView MCP */
export declare function tvQuote(symbol: string): Promise<TVQuote>;
/** Get OHLCV / indicator data via TradingView MCP */
export declare function tvData(params: {
    command: string;
    args?: string[];
}): Promise<any>;
/** Check TradingView MCP availability */
export declare function tvCheckConnection(): Promise<boolean>;
export declare function glmCheckConnection(): Promise<boolean>;
export declare function getPositions(): TVPosition[];
export declare function getTradeHistory(): Array<TradeSignal & {
    outcome: string;
}>;
export declare function recordPosition(position: TVPosition): void;
export declare function closePosition(symbol: string, side: string, pnl: number): void;
export declare function recordTrade(signal: TradeSignal, outcome: string): void;
export declare function getServiceStatus(): Promise<ServiceStatus>;
//# sourceMappingURL=engine-bridge.d.ts.map
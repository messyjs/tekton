/**
 * Unit tests for PI Agent core module.
 *
 * Tests the PiAgent class from @tekton/core.
 * Engine calls are mocked by overriding runEngine and parseJSON.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PiAgent } from "@tekton/core";

// Create a test subclass that overrides engine calls
class MockPiAgent extends PiAgent {
  private mockResponses: Record<string, any> = {};

  setMockResponse(script: string, response: any) {
    this.mockResponses[script] = response;
  }

  // Override runEngine to return mock data
  async runEngine(script: string, args: string[]): Promise<string> {
    if (script in this.mockResponses) {
      return JSON.stringify(this.mockResponses[script]);
    }
    // Default responses by script
    switch (script) {
      case "gann_bridge.js":
        return JSON.stringify({ action: "BUY", confidence: "HIGH", combinedScore: 78, stopLoss: 100, takeProfit: 200, riskReward: 2.0, signals: ["SQ9_CONFLUENCE"] });
      case "master_bridge.js":
        return JSON.stringify({ action: "SELL", confidence: "MEDIUM", combinedScore: 65, stopLoss: 110000, takeProfit: 102000, riskReward: 1.8, signals: ["FIB_CONFLUENCE"], retracement: [], extensions: [], confluence: [] });
      case "run_gann_v2.js":
        if (args.includes("planetary")) return JSON.stringify({ mercury: 45, venus: 120 });
        if (args.includes("sq9")) return JSON.stringify({ levels: [100, 104, 108], nearest: { price: 104, distance: 0.5 } });
        if (args.includes("range")) return JSON.stringify({ ranges: { "1/8": 101, "1/4": 102, "1/2": 104, "1x": 108 } });
        if (args.includes("angles")) return JSON.stringify({ angles: { "1x1": 105, "2x1": 110 } });
        return "{}";
      case "glm_client.cjs":
        return "GLM says: looks bullish";
      case "tv_trade_executor.cjs":
        return JSON.stringify({ pineScript: "// buy script", status: "sent" });
      default:
        return "{}";
    }
  }

  // Override TV methods that use execFile directly (not via runEngine)
  async tvQuote(symbol: string) {
    return { symbol, price: 104500, change: 500, changePercent: 0.48, volume: 1234, high: 105000, low: 103000 };
  }

  async tvCheckConnection() { return true; }
  async glmCheckConnection() { return true; }
}

describe("PiAgent", () => {
  let agent: MockPiAgent;

  beforeEach(() => {
    agent = new MockPiAgent({ engineDir: "/test/engines" });
  });

  it("creates instance with custom config", () => {
    expect(agent).toBeDefined();
    expect(agent.config.engineDir).toBe("/test/engines");
    expect(agent.config.timeout).toBe(30000);
  });

  it("extends default config with overrides", () => {
    const custom = new PiAgent({ timeout: 60000 });
    expect(custom.config.timeout).toBe(60000);
    expect(custom.config.engineDir).toContain("pi-agent");
  });

  it("gannAnalyze returns parsed result", async () => {
    const result = await agent.gannAnalyze({
      symbol: "BTCUSD",
      price: 104500,
      pivots: [
        { price: 100000, time: 1000000, type: "low" },
        { price: 108000, time: 2000000, type: "high" },
      ],
      timeframe: "4H",
      trend: "up",
    });
    expect(result).toBeDefined();
    expect(result.action).toBe("BUY");
    expect(result.combinedScore).toBe(78);
  });

  it("gannLevels returns parsed result", async () => {
    const result = await agent.gannLevels({
      symbol: "BTCUSD",
      price: 104500,
      anchor: 92000,
    });
    expect(result).toBeDefined();
  });

  it("gannPlanetary returns parsed result", async () => {
    const result = await agent.gannPlanetary();
    expect(result).toBeDefined();
    expect(result.mercury).toBe(45);
  });

  it("gannRange returns parsed result", async () => {
    const result = await agent.gannRange({ high: 108000, low: 100000 });
    expect(result).toBeDefined();
    expect(result.ranges).toBeDefined();
  });

  it("gannS9 returns parsed result", async () => {
    const result = await agent.gannS9({ anchor: 100000, current: 104500 });
    expect(result).toBeDefined();
    expect(result.levels).toBeDefined();
  });

  it("gannAngles returns parsed result", async () => {
    const result = await agent.gannAngles({
      pivot: 100000, bars: 100, current: 104500, direction: "up",
    });
    expect(result).toBeDefined();
    expect(result.angles).toBeDefined();
  });

  it("tradeSignal combines Gann + Fib and adds metadata", async () => {
    const result = await agent.tradeSignal({
      symbol: "ETHUSD",
      price: 3200,
      pivots: [
        { price: 3000, time: 1000000, type: "low" },
        { price: 3400, time: 2000000, type: "high" },
        { price: 3100, time: 3000000, type: "low" },
        { price: 3200, time: 4000000, type: "high" },
      ],
      timeframe: "1H",
      trend: "up",
    });
    expect(result).toBeDefined();
    expect(result.symbol).toBe("ETHUSD");
    expect(result.price).toBe(3200);
    expect(result.timestamp).toBeDefined();
  });

  it("fibAnalyze calls master_bridge for fib data", async () => {
    const result = await agent.fibAnalyze({
      price: 3200,
      swings: [
        { price: 3000, type: "low" },
        { price: 3400, type: "high" },
      ],
    });
    expect(result).toBeDefined();
  });

  it("glmAsk returns answer with cost", async () => {
    const result = await agent.glmAsk({ question: "What is the trend?" });
    expect(result).toBeDefined();
    expect(result.answer).toContain("GLM");
    expect(result.cost).toBe("local-0");
  });

  it("tvQuote returns quote data", async () => {
    const result = await agent.tvQuote("BTCUSD");
    expect(result).toBeDefined();
    expect(result.symbol).toBe("BTCUSD");
    expect(result.price).toBe(104500);
  });

  it("tvExecuteTrade records position", async () => {
    const result = await agent.tvExecuteTrade({
      direction: "buy",
      price: 104500,
      sl: 104000,
      tp: 105000,
      symbol: "BTCUSD",
    });
    expect(result).toBeDefined();
    const positions = agent.getPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].symbol).toBe("BTCUSD");
    expect(positions[0].side).toBe("buy");
  });

  it("positions tracking works", () => {
    agent.recordPosition({ symbol: "ETHUSD", side: "sell", qty: 1, entry: 3200, mark: 3150, tp: 3100, sl: 3300, pnl: -50 });
    const positions = agent.getPositions();
    expect(positions).toHaveLength(1);
    expect(positions[0].symbol).toBe("ETHUSD");

    agent.closePosition("ETHUSD", "sell");
    expect(agent.getPositions()).toHaveLength(0);
  });

  it("position update replaces existing", () => {
    agent.recordPosition({ symbol: "BTCUSD", side: "buy", qty: 1, entry: 104500, mark: 104600, tp: 105000, sl: 104000, pnl: 100 });
    agent.recordPosition({ symbol: "BTCUSD", side: "buy", qty: 2, entry: 104500, mark: 104700, tp: 105200, sl: 103900, pnl: 200 });
    expect(agent.getPositions()).toHaveLength(1);
    expect(agent.getPositions()[0].qty).toBe(2);
  });

  it("trade history tracking works", () => {
    const signal = {
      action: "BUY", confidence: "HIGH", combinedScore: 80,
      stopLoss: 100, takeProfit: 200, riskReward: 2, signals: ["TEST"],
      symbol: "BTCUSD", price: 104500, timeframe: "4H", trend: "up", timestamp: new Date().toISOString(),
    };
    agent.recordTrade(signal, "filled");
    const history = agent.getTradeHistory();
    expect(history).toHaveLength(1);
    expect(history[0].outcome).toBe("filled");
    expect(history[0].symbol).toBe("BTCUSD");
  });

  it("status returns engine availability", async () => {
    const status = await agent.status();
    expect(status).toBeDefined();
    // MockPiAgent overrides glmCheckConnection + tvCheckConnection to return true
    // enginesAvailable depends on existsSync which won't find /test/engines
    expect(typeof status.enginesAvailable).toBe("boolean");
    expect(status.glmAvailable).toBe(true);
    expect(status.tvMcpAvailable).toBe(true);
    expect(typeof status.openPositions).toBe("number");
  });

  it("closePosition is idempotent", () => {
    agent.closePosition("NOTEXIST", "buy");
    expect(agent.getPositions()).toHaveLength(0);
  });

  it("getTradeHistory returns copy", () => {
    const history = agent.getTradeHistory();
    history.push({ action: "FAKE", confidence: "LOW", combinedScore: 0, stopLoss: 0, takeProfit: 0, riskReward: 0, signals: [], symbol: "X", price: 0, timeframe: "1H", trend: "up", timestamp: "", outcome: "test" });
    expect(agent.getTradeHistory()).toHaveLength(0);
  });

  it("getPositions returns copy", () => {
    const positions = agent.getPositions();
    positions.push({ symbol: "X", side: "buy", qty: 1, entry: 0, mark: 0, tp: 0, sl: 0, pnl: 0 });
    expect(agent.getPositions()).toHaveLength(0);
  });
});
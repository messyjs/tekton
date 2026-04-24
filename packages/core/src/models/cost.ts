import { EXPANDED_PROVIDERS, MODEL_PRICING } from "./providers-expanded.js";

// ── Cost Tracker ──────────────────────────────────────────────────────

export interface CostEntry {
  timestamp: Date;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  routingMode: string;
  complexityScore: number;
}

export interface CostReport {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Record<string, { cost: number; inputTokens: number; outputTokens: number; calls: number }>;
  byProvider: Record<string, { cost: number; calls: number }>;
  byDay: Record<string, number>;
  savings: CostSavings;
}

export interface CostSavings {
  /** Cost if all calls went to the deep model */
  withoutRouting: number;
  /** Actual cost with routing */
  withRouting: number;
  /** Amount saved */
  saved: number;
  /** Percentage saved */
  savedPercent: number;
}

const DEEP_MODEL = "gemma3:27b";
const DEEP_COST_PER_1K = 0.0; // Local model

export class CostTracker {
  private entries: CostEntry[] = [];
  private pricing: Record<string, { input: number; output: number }>;

  constructor(pricing?: Record<string, { input: number; output: number }>) {
    this.pricing = pricing ?? MODEL_PRICING;
  }

  /**
   * Record a cost entry.
   */
  record(entry: Omit<CostEntry, "cost">): CostEntry {
    const cost = this.estimateCost(entry.model, entry.inputTokens, entry.outputTokens);
    const fullEntry: CostEntry = { ...entry, cost };
    this.entries.push(fullEntry);
    return fullEntry;
  }

  /**
   * Estimate cost for a model given token counts.
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.pricing[model];
    if (!pricing) {
      // Default: use provider's costPer1K or $0.001/1K as fallback
      for (const provider of Object.values(EXPANDED_PROVIDERS)) {
        const modelConfig = provider.models.find(m => m.id === model);
        if (modelConfig) {
          const inputCost = (provider.costPer1KInput ?? 0.001) * (inputTokens / 1000);
          const outputCost = (provider.costPer1KOutput ?? 0.002) * (outputTokens / 1000);
          return inputCost + outputCost;
        }
      }
      // Ultimate fallback
      return (inputTokens + outputTokens) * 0.001 / 1000;
    }

    const inputCost = pricing.input * (inputTokens / 1000);
    const outputCost = pricing.output * (outputTokens / 1000);
    return inputCost + outputCost;
  }

  /**
   * Get total cost since a given date.
   */
  getTotalCost(since?: Date): number {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;
    return entries.reduce((sum, e) => sum + e.cost, 0);
  }

  /**
   * Get cost broken down by model.
   */
  getCostByModel(since?: Date): Record<string, { cost: number; calls: number; inputTokens: number; outputTokens: number }> {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;
    const result: Record<string, { cost: number; calls: number; inputTokens: number; outputTokens: number }> = {};

    for (const entry of entries) {
      if (!result[entry.model]) {
        result[entry.model] = { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0 };
      }
      result[entry.model].cost += entry.cost;
      result[entry.model].calls += 1;
      result[entry.model].inputTokens += entry.inputTokens;
      result[entry.model].outputTokens += entry.outputTokens;
    }

    return result;
  }

  /**
   * Get cost broken down by provider.
   */
  getCostByProvider(since?: Date): Record<string, { cost: number; calls: number }> {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;
    const result: Record<string, { cost: number; calls: number }> = {};

    for (const entry of entries) {
      if (!result[entry.provider]) {
        result[entry.provider] = { cost: 0, calls: 0 };
      }
      result[entry.provider].cost += entry.cost;
      result[entry.provider].calls += 1;
    }

    return result;
  }

  /**
   * Get cost broken down by day.
   */
  getCostByDay(since?: Date): Record<string, number> {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;
    const result: Record<string, number> = {};

    for (const entry of entries) {
      const day = entry.timestamp.toISOString().split("T")[0];
      result[day] = (result[day] ?? 0) + entry.cost;
    }

    return result;
  }

  /**
   * Calculate cost savings from routing.
   * Compares actual cost vs. cost if all calls went to the deep model.
   */
  getCostSavings(since?: Date): CostSavings {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;

    let withRouting = 0;
    let withoutRouting = 0;

    for (const entry of entries) {
      // Actual cost
      withRouting += entry.cost;

      // Hypothetical cost if this had gone to the deep model
      const deepPricing = this.pricing[DEEP_MODEL];
      const deepInputCost = (deepPricing?.input ?? 0) * (entry.inputTokens / 1000);
      const deepOutputCost = (deepPricing?.output ?? 0) * (entry.outputTokens / 1000);
      withoutRouting += deepInputCost + deepOutputCost;
    }

    // If the deep model is local (free), use the most expensive external model as comparison
    if (withoutRouting === 0 && entries.length > 0) {
      // Use Claude Opus as "worst case" comparison
      const fallbackPricing = this.pricing["claude-opus-4-5"] ?? { input: 0.015, output: 0.075 };
      for (const entry of entries) {
        withoutRouting += fallbackPricing.input * (entry.inputTokens / 1000);
        withoutRouting += fallbackPricing.output * (entry.outputTokens / 1000);
      }
    }

    const saved = withoutRouting - withRouting;
    const savedPercent = withoutRouting > 0 ? (saved / withoutRouting) * 100 : 0;

    return { withoutRouting, withRouting, saved, savedPercent };
  }

  /**
   * Generate a full cost report.
   */
  getReport(since?: Date): CostReport {
    const entries = since ? this.entries.filter(e => e.timestamp >= since) : this.entries;

    const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
    const totalInputTokens = entries.reduce((sum, e) => sum + e.inputTokens, 0);
    const totalOutputTokens = entries.reduce((sum, e) => sum + e.outputTokens, 0);

    return {
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      byModel: this.getCostByModel(since),
      byProvider: this.getCostByProvider(since),
      byDay: this.getCostByDay(since),
      savings: this.getCostSavings(since),
    };
  }

  /**
   * Get the number of recorded entries.
   */
  get entryCount(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get entries, optionally filtered by date range.
   */
  getEntries(since?: Date): CostEntry[] {
    return since ? this.entries.filter(e => e.timestamp >= since) : [...this.entries];
  }
}
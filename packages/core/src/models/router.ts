import { scoreComplexity } from "./complexity.js";
import { RoutingRulesEngine, DEFAULT_ROUTING_RULES, type RoutingRule } from "./rules-engine.js";
import { CostTracker } from "./cost.js";
import { MODEL_PRICING } from "./providers-expanded.js";

export interface RoutingConfig {
  fastModel: string;
  fastProvider: string;
  deepModel: string;
  deepProvider: string;
  fallbackChain: Array<{ model: string; provider: string }>;
  complexityThreshold: number;
  simpleThreshold: number;
}

export interface RoutingContext {
  prompt: string;
  tokenCount: number;
  hasCodeBlocks: boolean;
  matchingSkills: string[];
  userOverride?: string;
  sessionComplexityHistory: number[];
}

export interface RoutingDecision {
  model: string;
  provider: string;
  reason: string;
  complexityScore: number;
  estimatedCost: number;
  /** Whether this decision was made by a routing rule */
  ruleMatch?: string;
}

export type RoutingMode = "auto" | "fast" | "deep" | "rules";

export class ModelRouter {
  private config: RoutingConfig;
  private mode: RoutingMode = "auto";
  private recentDecisions: RoutingDecision[] = [];
  private maxHistory = 100;
  private rulesEngine: RoutingRulesEngine;
  private costTracker: CostTracker;

  constructor(config: RoutingConfig, options?: { rules?: RoutingRule[] }) {
    this.config = config;
    this.rulesEngine = new RoutingRulesEngine(options?.rules ?? DEFAULT_ROUTING_RULES);
    this.costTracker = new CostTracker(MODEL_PRICING);
  }

  route(context: RoutingContext): RoutingDecision {
    // Manual override always wins
    if (context.userOverride) {
      const decision: RoutingDecision = {
        model: context.userOverride,
        provider: "manual",
        reason: "User-specified model override",
        complexityScore: 0,
        estimatedCost: this.costTracker.estimateCost(context.userOverride, context.tokenCount, context.tokenCount * 2),
      };
      this.recordDecision(decision);
      return decision;
    }

    const complexity = scoreComplexity(context);
    let model: string = this.config.fastModel;
    let provider: string = this.config.fastProvider;
    let reason: string = "Default routing";
    let ruleMatch: string | undefined;

    // In rules mode, check rules first
    if (this.mode === "rules" || this.mode === "auto") {
      const ruleResult = this.rulesEngine.evaluate(context);
      if (ruleResult) {
        // Resolve "fast" and "deep" to actual model names
        if (ruleResult.model === "fast") {
          model = this.config.fastModel;
          provider = this.config.fastProvider;
        } else if (ruleResult.model === "deep") {
          model = this.config.deepModel;
          provider = this.config.deepProvider;
        } else {
          model = ruleResult.model;
          provider = ruleResult.provider;
        }
        reason = ruleResult.reason;
        ruleMatch = ruleResult.rule?.id;

        // If not in rules mode, only use rule result if in auto mode and it's a high-priority rule
        if (this.mode === "auto" && ruleResult.rule && ruleResult.rule.priority < 50) {
          // Low-priority rules don't override in auto mode
          // Fall through to complexity-based routing
          model = "";
        } else {
          const decision: RoutingDecision = {
            model,
            provider,
            reason,
            complexityScore: complexity,
            estimatedCost: this.costTracker.estimateCost(model, context.tokenCount, context.tokenCount * 2),
            ruleMatch,
          };
          this.recordDecision(decision);
          return decision;
        }
      }
    }

    // Complexity-based routing
    switch (this.mode) {
      case "fast":
        model = this.config.fastModel;
        provider = this.config.fastProvider;
        reason = "Routing mode set to fast";
        break;
      case "deep":
        model = this.config.deepModel;
        provider = this.config.deepProvider;
        reason = "Routing mode set to deep";
        break;
      case "rules":
        // If rules mode and no rule matched, fall back to complexity
        if (!model) {
          model = this.config.fastModel;
          provider = this.config.fastProvider;
          reason = `No rule matched, defaulting to fast model (complexity ${complexity.toFixed(2)})`;
        }
        break;
      case "auto":
      default: {
        if (!model) {
          if (complexity >= this.config.complexityThreshold) {
            model = this.config.deepModel;
            provider = this.config.deepProvider;
            reason = `Complexity ${complexity.toFixed(2)} ≥ threshold ${this.config.complexityThreshold}`;
          } else if (complexity <= this.config.simpleThreshold) {
            model = this.config.fastModel;
            provider = this.config.fastProvider;
            reason = `Complexity ${complexity.toFixed(2)} ≤ threshold ${this.config.simpleThreshold}`;
          } else {
            model = this.config.fastModel;
            provider = this.config.fastProvider;
            reason = `Complexity ${complexity.toFixed(2)} in middle range, defaulting to fast`;
          }
        }
        break;
      }
    }

    const decision: RoutingDecision = {
      model,
      provider,
      reason,
      complexityScore: complexity,
      estimatedCost: this.costTracker.estimateCost(model, context.tokenCount, context.tokenCount * 2),
      ruleMatch,
    };

    this.recordDecision(decision);
    return decision;
  }

  setMode(mode: RoutingMode): void {
    this.mode = mode;
  }

  getMode(): RoutingMode {
    return this.mode;
  }

  getRecentDecisions(limit?: number): RoutingDecision[] {
    const n = limit ?? 10;
    return this.recentDecisions.slice(-n);
  }

  /** Get the rules engine for direct rule manipulation */
  getRulesEngine(): RoutingRulesEngine {
    return this.rulesEngine;
  }

  /** Get the cost tracker for cost reporting */
  getCostTracker(): CostTracker {
    return this.costTracker;
  }

  private recordDecision(decision: RoutingDecision): void {
    this.recentDecisions.push(decision);
    if (this.recentDecisions.length > this.maxHistory) {
      this.recentDecisions.shift();
    }
  }
}
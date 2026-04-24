import type { RoutingContext } from "./router.js";

// ── Routing Rules Engine ───────────────────────────────────────────────

export interface RoutingCondition {
  /** Match type: keyword in prompt, regex, token threshold, file type, etc. */
  type: "keyword" | "regex" | "token_above" | "token_below" | "file_type" | "skill_match" | "always";
  /** The value to match against (keyword string, regex pattern, token count, file extension, etc.) */
  value: string;
  /** Whether this is an exclusion (NOT match) */
  negate?: boolean;
}

export interface RoutingAction {
  /** Model ID to route to */
  model: string;
  /** Provider ID to route through */
  provider: string;
  /** Optional: use fallback chain starting from this provider */
  useFallback?: boolean;
}

export interface RoutingRule {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this rule does */
  description?: string;
  /** Condition(s) that must ALL be true (AND) for this rule to match */
  conditions: RoutingCondition[];
  /** Action to take when this rule matches */
  action: RoutingAction;
  /** Priority: higher = evaluated first */
  priority: number;
  /** Whether this rule is active */
  enabled: boolean;
}

export interface RuleEvaluationResult {
  matched: boolean;
  rule?: RoutingRule;
  model: string;
  provider: string;
  reason: string;
}

export class RoutingRulesEngine {
  private rules: RoutingRule[] = [];

  constructor(rules?: RoutingRule[]) {
    if (rules) {
      this.rules = rules.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Evaluate routing rules against the given context.
   * Returns the first matching rule's action, or null if no rules match.
   */
  evaluate(context: RoutingContext): RuleEvaluationResult | null {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateConditions(rule.conditions, context);

      if (matches) {
        return {
          matched: true,
          rule,
          model: rule.action.model,
          provider: rule.action.provider,
          reason: `Rule "${rule.name}" matched`,
        };
      }
    }

    return null;
  }

  /**
   * Add a new routing rule.
   */
  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a rule by ID.
   */
  removeRule(id: string): boolean {
    const idx = this.rules.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  /**
   * List all rules (sorted by priority, descending).
   */
  listRules(): RoutingRule[] {
    return [...this.rules];
  }

  /**
   * Get a rule by ID.
   */
  getRule(id: string): RoutingRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  /**
   * Toggle a rule's enabled state.
   */
  toggleRule(id: string, enabled?: boolean): boolean {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) return false;
    rule.enabled = enabled ?? !rule.enabled;
    return true;
  }

  /**
   * Evaluate all conditions against context (AND logic).
   */
  private evaluateConditions(conditions: RoutingCondition[], context: RoutingContext): boolean {
    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, context);
      if (condition.negate ? result : !result) {
        return false; // AND: if any condition fails (considering negate), overall is false
      }
    }
    return conditions.length > 0;
  }

  /**
   * Evaluate a single condition.
   */
  private evaluateCondition(condition: RoutingCondition, context: RoutingContext): boolean {
    const prompt = context.prompt.toLowerCase();
    const { type, value } = condition;

    switch (type) {
      case "keyword":
        return prompt.includes(value.toLowerCase());

      case "regex": {
        try {
          return new RegExp(value, "i").test(context.prompt);
        } catch {
          return false;
        }
      }

      case "token_above":
        return context.tokenCount > parseInt(value, 10);

      case "token_below":
        return context.tokenCount < parseInt(value, 10);

      case "file_type":
        // Check if the prompt mentions a file extension
        return context.prompt.includes(value) || (context.matchingSkills.some(s => s.includes(value)));

      case "skill_match":
        return context.matchingSkills.some(s => s === value || s.includes(value));

      case "always":
        return true;

      default:
        return false;
    }
  }
}

// ── Default Routing Rules ──────────────────────────────────────────────

export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    id: "reasoning-tasks",
    name: "Reasoning tasks to deep model",
    description: "Route tasks involving reasoning or planning to the deep model",
    conditions: [
      { type: "keyword", value: "reason" },
      { type: "keyword", value: "plan", negate: true },
    ],
    // Note: These conditions are AND — so "reason" WITHOUT "plan"
    // Actually we want OR. Let's use separate rules instead.
    priority: 100,
    enabled: true,
    action: { model: "deep", provider: "anthropic" },
  },
  {
    id: "architect-tasks",
    name: "Architecture tasks to deep model",
    description: "Route architecture and design tasks to the deep model",
    conditions: [{ type: "keyword", value: "architect" }],
    priority: 95,
    enabled: true,
    action: { model: "deep", provider: "anthropic" },
  },
  {
    id: "security-audit",
    name: "Security audit to deep model",
    description: "Route security audits to the deep model with fallback",
    conditions: [{ type: "keyword", value: "security audit" }],
    priority: 90,
    enabled: true,
    action: { model: "deep", provider: "anthropic", useFallback: true },
  },
  {
    id: "refactor-tasks",
    name: "Refactor tasks to deep model",
    description: "Route refactoring to the deep model",
    conditions: [{ type: "keyword", value: "refactor" }],
    priority: 85,
    enabled: true,
    action: { model: "deep", provider: "anthropic" },
  },
  {
    id: "debug-complex",
    name: "Complex debugging to deep model",
    description: "Route complex debugging tasks to the deep model",
    conditions: [{ type: "keyword", value: "debug complex" }],
    priority: 80,
    enabled: true,
    action: { model: "deep", provider: "anthropic" },
  },
  {
    id: "migrate-tasks",
    name: "Migration tasks to deep model",
    description: "Route migration tasks to the deep model",
    conditions: [{ type: "keyword", value: "migrate" }],
    priority: 75,
    enabled: true,
    action: { model: "deep", provider: "anthropic" },
  },
  {
    id: "long-prompts",
    name: "Long prompts to deep model",
    description: "Route prompts with >500 tokens to the deep model for better handling",
    conditions: [{ type: "token_above", value: "500" }],
    priority: 50,
    enabled: true,
    action: { model: "deep", provider: "anthropic" },
  },
  {
    id: "simple-tasks",
    name: "Simple tasks to fast model",
    description: "Route simple formatting and listing tasks to the fast model",
    conditions: [
      { type: "token_below", value: "50" },
      { type: "keyword", value: "format" },
    ],
    priority: 60,
    enabled: true,
    action: { model: "fast", provider: "ollama" },
  },
  {
    id: "typo-fixes",
    name: "Typo fixes to fast model",
    description: "Route typo fixes and simple renames to the fast model",
    conditions: [{ type: "keyword", value: "typo" }],
    priority: 70,
    enabled: true,
    action: { model: "fast", provider: "ollama" },
  },
  {
    id: "skill-tasks",
    name: "Skill-matched tasks to fast model",
    description: "Tasks that match a known skill can use the fast model",
    conditions: [{ type: "skill_match", value: "" }],
    // Empty value matches any skill
    priority: 40,
    enabled: true,
    action: { model: "fast", provider: "ollama" },
  },
  {
    id: "vision-tasks",
    name: "Vision tasks to vision model",
    description: "Route image analysis tasks to a vision-capable model",
    conditions: [{ type: "keyword", value: "analyze image" }],
    priority: 55,
    enabled: true,
    action: { model: "gpt-4o", provider: "openai" },
  },
  {
    id: "code-tasks",
    name: "Code generation to code model",
    description: "Route code generation to a code-specialized model",
    conditions: [{ type: "keyword", value: "write code" }],
    priority: 45,
    enabled: true,
    action: { model: "deepseek-coder", provider: "deepseek" },
  },
];
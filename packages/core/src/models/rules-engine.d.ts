import type { RoutingContext } from "./router.js";
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
export declare class RoutingRulesEngine {
    private rules;
    constructor(rules?: RoutingRule[]);
    /**
     * Evaluate routing rules against the given context.
     * Returns the first matching rule's action, or null if no rules match.
     */
    evaluate(context: RoutingContext): RuleEvaluationResult | null;
    /**
     * Add a new routing rule.
     */
    addRule(rule: RoutingRule): void;
    /**
     * Remove a rule by ID.
     */
    removeRule(id: string): boolean;
    /**
     * List all rules (sorted by priority, descending).
     */
    listRules(): RoutingRule[];
    /**
     * Get a rule by ID.
     */
    getRule(id: string): RoutingRule | undefined;
    /**
     * Toggle a rule's enabled state.
     */
    toggleRule(id: string, enabled?: boolean): boolean;
    /**
     * Evaluate all conditions against context (AND logic).
     */
    private evaluateConditions;
    /**
     * Evaluate a single condition.
     */
    private evaluateCondition;
}
export declare const DEFAULT_ROUTING_RULES: RoutingRule[];
//# sourceMappingURL=rules-engine.d.ts.map
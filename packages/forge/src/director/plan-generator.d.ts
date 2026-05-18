import type { ProductBrief, ProductDomain, ProductionPlan } from "../types.js";
/**
 * Generate a ProductionPlan from brief and domains.
 *
 * Uses the provided LLM call for task breakdown, or falls back
 * to role-based template task generation.
 */
export declare function generatePlan(brief: ProductBrief, domains: ProductDomain[], callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<ProductionPlan>;
//# sourceMappingURL=plan-generator.d.ts.map
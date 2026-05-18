import type { ProductBrief, DirectorDecision } from "../types.js";
/**
 * Evaluate a ProductBrief against director criteria.
 *
 * Uses the provided LLM call function for scoring, or falls back
 * to heuristic scoring based on brief content analysis.
 */
export declare function evaluateBrief(brief: ProductBrief, callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<DirectorDecision>;
//# sourceMappingURL=evaluator.d.ts.map
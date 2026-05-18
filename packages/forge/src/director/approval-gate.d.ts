import type { ProductBrief, DirectorDecision } from "../types.js";
export interface ApprovalGateConfig {
    maxRevisions: number;
    callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>;
}
/**
 * Evaluate a brief through the full approval pipeline.
 */
export declare function evaluate(brief: ProductBrief, config?: ApprovalGateConfig): Promise<DirectorDecision>;
//# sourceMappingURL=approval-gate.d.ts.map
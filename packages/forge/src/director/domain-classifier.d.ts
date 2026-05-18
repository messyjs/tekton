import type { ProductBrief, ProductDomain } from "../types.js";
/**
 * Classify a ProductBrief into product domains.
 *
 * Stage 1: Uses keyword matching from the domain registry.
 * Stage 2: Optionally confirms with LLM.
 */
export declare function classifyDomains(brief: ProductBrief, callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<ProductDomain[]>;
//# sourceMappingURL=domain-classifier.d.ts.map
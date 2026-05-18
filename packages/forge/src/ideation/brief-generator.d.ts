import type { ProductBrief } from "../types.js";
/**
 * Generate a ProductBrief from a conversation transcript.
 *
 * Uses the provided LLM call function, or falls back to template extraction.
 * Validates output and retries once on failure.
 */
export declare function generateBrief(transcript: string, callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<ProductBrief>;
//# sourceMappingURL=brief-generator.d.ts.map
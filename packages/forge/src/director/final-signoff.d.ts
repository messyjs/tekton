/**
 * Final Signoff — Reviews QA results against the original brief.
 *
 * Checks that all artifacts are at "testing" or "release" status
 * and that QA signoffs exist for all artifacts.
 */
import type { ForgeManifest, ProductBrief } from "../types.js";
export interface SignoffResult {
    approved: boolean;
    notes: string;
    sendBack?: string[];
}
/**
 * Perform final signoff review on a completed product.
 *
 * Checks artifact statuses and QA signoffs, then optionally
 * calls LLM for acceptance criteria verification.
 */
export declare function finalSignoff(manifest: ForgeManifest, brief: ProductBrief, callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>): Promise<SignoffResult>;
//# sourceMappingURL=final-signoff.d.ts.map
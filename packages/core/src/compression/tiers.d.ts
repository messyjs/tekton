import type { CompressionTier } from "./caveman.js";
export interface TierContext {
    source: string;
    destination: string;
    isSubAgent: boolean;
}
export declare function detectTier(context: TierContext): CompressionTier;
//# sourceMappingURL=tiers.d.ts.map
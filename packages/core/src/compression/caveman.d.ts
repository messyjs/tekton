export type CompressionTier = "none" | "lite" | "full" | "ultra";
export declare function compress(text: string, tier: CompressionTier): string;
export declare function decompress(text: string): string;
export declare function getCompressionRatio(original: string, compressed: string): number;
export declare function estimateTokens(text: string): number;
//# sourceMappingURL=caveman.d.ts.map
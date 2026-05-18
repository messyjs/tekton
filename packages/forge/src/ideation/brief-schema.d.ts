export interface BriefValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validate a ProductBrief against its TypeBox schema.
 */
export declare function validateBrief(data: unknown): BriefValidationResult;
//# sourceMappingURL=brief-schema.d.ts.map
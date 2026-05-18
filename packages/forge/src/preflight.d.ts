import type { ProductDomain, PreflightResult } from "./types.js";
/**
 * Check preflight requirements for a single domain.
 *
 * Loads the domain config, checks required and optional tools,
 * and returns a PreflightResult.
 */
export declare function checkDomain(domain: ProductDomain): Promise<PreflightResult>;
/**
 * Check preflight for multiple domains.
 * Merges results across all domains.
 */
export declare function checkMultipleDomains(domains: ProductDomain[]): Promise<PreflightResult>;
//# sourceMappingURL=preflight.d.ts.map
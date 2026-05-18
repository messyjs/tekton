import type { TeamTemplate, ProductDomain } from "./types.js";
declare class DomainRegistry {
    private _domains;
    private _loaded;
    /** Get all domain templates as a Map */
    get domains(): Map<string, TeamTemplate>;
    private loaded;
    /** Load all domain configs from disk */
    load(): void;
    /** Get a specific domain template by name */
    get(name: string): TeamTemplate | undefined;
    /** List all available domain names */
    list(): string[];
    /** Get all domain templates */
    all(): TeamTemplate[];
    /** Check if a domain exists */
    has(name: string): boolean;
    /** Match domains to a product brief based on keyword analysis */
    match(brief: {
        title?: string;
        problemStatement?: string;
        technicalApproach?: string;
        domains?: ProductDomain[];
    }): ProductDomain[];
    /** Get the full team template for a domain */
    getTeamTemplate(domain: string): TeamTemplate | undefined;
    /** Force reload of domain configs */
    reload(): void;
}
export declare function loadDomains(): Map<string, TeamTemplate>;
export declare function getDomain(name: string): TeamTemplate | undefined;
export declare function matchDomains(brief: {
    title?: string;
    problemStatement?: string;
    technicalApproach?: string;
    domains?: ProductDomain[];
}): ProductDomain[];
export declare function getTeamTemplate(domain: string): TeamTemplate | undefined;
export declare function listDomains(): string[];
export { DomainRegistry };
//# sourceMappingURL=domain-registry.d.ts.map
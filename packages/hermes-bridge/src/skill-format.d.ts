export interface Skill {
    name: string;
    description: string;
    version?: string;
    license?: string;
    compatibility?: string;
    metadata?: {
        tekton?: {
            tags?: string[];
            category?: string;
            confidence?: number;
            fallback_for_toolsets?: string[];
            requires_toolsets?: string[];
        };
        hermes?: Record<string, unknown>;
        [key: string]: unknown;
    };
    allowedTools?: string;
    body: string;
    directory: string;
    source: "local" | "external" | "bundled" | "hub";
    enabled: boolean;
    references: string[];
    scripts: string[];
    assets: string[];
}
export interface CreateSkillInput {
    name: string;
    description: string;
    body: string;
    version?: string;
    metadata?: Skill["metadata"];
    allowedTools?: string;
}
export type SkillUpdate = Partial<Omit<Skill, "name" | "directory">>;
export interface SkillSummary {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    confidence?: number;
    enabled: boolean;
    source: Skill["source"];
}
export declare function parseSkillMd(content: string): Omit<Skill, "directory" | "source" | "enabled">;
export declare function writeSkillMd(skill: Pick<Skill, "name" | "description" | "version" | "metadata" | "body" | "allowedTools">): string;
export declare function validateSkill(skill: Partial<Skill>): {
    valid: boolean;
    errors: string[];
};
export declare function scanSkillDirectory(dir: string): Pick<Skill, "references" | "scripts" | "assets">;
export declare function slugifySkillName(description: string): string;
//# sourceMappingURL=skill-format.d.ts.map
import { type Skill, type CreateSkillInput, type SkillUpdate, type SkillSummary } from "./skill-format.js";
export interface SkillManagerConfig {
    primaryDir: string;
    externalDirs: string[];
}
export declare class SkillManager {
    private primaryDir;
    private externalDirs;
    private cache;
    private dirty;
    private usageTracker;
    private usagePath;
    constructor(config: SkillManagerConfig);
    listSkills(): SkillSummary[];
    searchSkills(query: string): SkillSummary[];
    getSkill(name: string): Skill | undefined;
    getSkillReference(name: string, filePath: string): string | undefined;
    createSkill(input: CreateSkillInput): Skill;
    updateSkill(name: string, update: SkillUpdate): Skill;
    patchSkill(name: string, oldString: string, newString: string): Skill;
    deleteSkill(name: string): void;
    writeSkillFile(name: string, filePath: string, content: string): void;
    removeSkillFile(name: string, filePath: string): void;
    exportSkill(name: string): string;
    importSkill(dirPath: string): Skill;
    toggleSkill(name: string, enabled: boolean): void;
    recordUsage(name: string, success: boolean): void;
    getConfidence(name: string): number;
    rescanExternalDirs(): void;
    isHermesCompatible(skill: Skill): boolean;
    private ensureCache;
    private loadFromDirectory;
    private saveSkill;
    private rescanSkill;
    private loadUsage;
    private saveUsage;
}
//# sourceMappingURL=skill-manager.d.ts.map
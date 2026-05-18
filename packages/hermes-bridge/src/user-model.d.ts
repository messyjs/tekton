export interface TaskSummary {
    description: string;
    timestamp: string;
    success: boolean;
    toolCallCount: number;
    hadErrors: boolean;
    skillsUsed: string[];
}
export interface TaskPattern {
    pattern: string;
    frequency: number;
    lastSeen: string;
}
export interface Correction {
    original: string;
    corrected: string;
    timestamp: string;
    context?: string;
}
export interface FeedbackEntry {
    type: "positive" | "negative";
    context: string;
    timestamp: string;
}
export interface UserModel {
    preferences: Record<string, string>;
    corrections: Correction[];
    commonPatterns: TaskPattern[];
    techStack: string[];
    workingHours: string;
    preferredTools: string[];
    avoidedApproaches: string[];
    recentTaskSummary: string;
}
export declare class UserModelManager {
    private path;
    private cache;
    private dirty;
    constructor(filePath: string);
    getModel(): UserModel;
    recordTaskCompletion(task: TaskSummary): void;
    recordCorrection(original: string, corrected: string, context?: string): void;
    recordPreference(key: string, value: string): void;
    recordFeedback(type: "positive" | "negative", context: string): void;
    getPreferences(): Record<string, string>;
    getCommonPatterns(limit?: number): TaskPattern[];
    getTechStack(): string[];
    getRecentCorrections(limit?: number): Correction[];
    toPromptContext(): string;
    flush(): void;
    private defaultModel;
    private parseUserModel;
    private serializeModel;
}
//# sourceMappingURL=user-model.d.ts.map
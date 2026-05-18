export interface UserModel {
    preferences: Record<string, string>;
    corrections: Array<{
        original: string;
        corrected: string;
        timestamp: string;
    }>;
    commonTasks: Array<{
        pattern: string;
        frequency: number;
    }>;
    techStack: string[];
    workingHours: string;
}
export declare class MemoryManager {
    private tektonHome;
    private memoryPath;
    private userModelPath;
    private contextDir;
    private memoryCache;
    private userModelCache;
    private contextCaches;
    private dirty;
    constructor(tektonHome: string);
    getMemory(): string;
    addMemory(entry: string, category?: string): void;
    searchMemory(query: string): string[];
    clearMemory(): void;
    getUserModel(): UserModel;
    updateUserModel(update: Partial<UserModel>): void;
    getProjectContext(cwd: string): string;
    updateProjectContext(cwd: string, context: string): void;
    flush(): Promise<void>;
    enforceLimit(file: string, maxChars?: number): void;
    private contextKey;
    private contextPath;
    private parseUserModel;
    private serializeUserModel;
    private summarizeOldest;
    private truncateToChars;
}
//# sourceMappingURL=memory-manager.d.ts.map
export interface SessionSearchResult {
    sessionId: string;
    timestamp: string;
    snippet: string;
    rank: number;
}
export interface SessionSummary {
    sessionId: string;
    startTime: string;
    endTime: string;
    messageCount: number;
    summary: string;
}
export declare class SessionSearcher {
    private db;
    constructor(dbPath: string);
    private init;
    search(query: string, limit?: number): SessionSearchResult[];
    getRecentSessions(limit?: number): SessionSummary[];
    recordSessionStart(sessionId: string): void;
    recordMessage(sessionId: string, role: string, content: string): void;
    close(): void;
}
//# sourceMappingURL=session-search.d.ts.map
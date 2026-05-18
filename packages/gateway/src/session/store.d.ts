import type { GatewaySession, SessionKey, PlatformName } from "../types.js";
export interface SessionStoreConfig {
    dbPath: string;
}
export declare class SessionStore {
    private db;
    constructor(config: SessionStoreConfig);
    /** Get or create a session for a user on a platform */
    getOrCreateSession(key: SessionKey): GatewaySession;
    /** Update session fields */
    updateSession(key: SessionKey, updates: Partial<GatewaySession>): void;
    /** Increment message count for a session */
    incrementMessageCount(key: SessionKey): void;
    /** Store a message */
    addMessage(key: SessionKey, direction: "inbound" | "outbound", text: string, platform: PlatformName): void;
    /** Get recent messages for a session */
    getRecentMessages(key: SessionKey, limit?: number): Array<{
        direction: string;
        text: string;
        timestamp: number;
    }>;
    /** List all sessions */
    listSessions(): GatewaySession[];
    /** Find sessions by platform */
    findSessions(platform: PlatformName): GatewaySession[];
    /** Delete a session and its messages */
    deleteSession(key: SessionKey): void;
    /** Close the database */
    close(): void;
    private makeKey;
    private rowToSession;
}
//# sourceMappingURL=store.d.ts.map
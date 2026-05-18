export interface CavememResult {
    id: string;
    content: string;
    kind: string;
    timestamp: string;
    relevance: number;
}
export interface CavememEntry {
    id: string;
    kind: string;
    content: string;
    timestamp: string;
}
export interface CavememObservation {
    id: string;
    kind: string;
    content: string;
    sessionId: string;
    timestamp: string;
    metadata: Record<string, string>;
}
export interface CavememSession {
    id: string;
    startTime: string;
    endTime: string;
    entryCount: number;
}
export declare class CavememBridge {
    constructor();
    private checkAvailability;
    isAvailable(): boolean;
    search(_query: string, _limit?: number): Promise<CavememResult[]>;
    timeline(_sessionId: string, _limit?: number): Promise<CavememEntry[]>;
    getObservations(_ids: string[], _expand?: boolean): Promise<CavememObservation[]>;
    store(_observation: {
        content: string;
        kind: string;
        sessionId: string;
    }): Promise<void>;
    listSessions(_limit?: number): Promise<CavememSession[]>;
}
//# sourceMappingURL=cavemem-bridge.d.ts.map
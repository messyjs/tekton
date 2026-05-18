export declare const DEFAULT_CONFIG: {
    identity: {
        soul: string;
        name: string;
        soulPath: string;
        memoryPath: string;
        userModelPath: string;
        maxMemoryChars: number;
        maxUserModelChars: number;
        maxContextChars: number;
    };
    models: {
        fast: {
            model: string;
            provider: string;
        };
        deep: {
            model: string;
            provider: string;
        };
        fallbackChain: Array<{
            model: string;
            provider: string;
        }>;
    };
    routing: {
        mode: "auto";
        complexityThreshold: number;
        simpleThreshold: number;
        escalationKeywords: string[];
        simpleKeywords: string[];
    };
    compression: {
        enabled: boolean;
        defaultTier: "full";
    };
    learning: {
        enabled: boolean;
        autoExtract: boolean;
        complexityThreshold: number;
    };
    contextHygiene: {
        maxTurns: number;
        compactPercent: number;
        pruneAfter: number;
    };
    telemetry: {
        enabled: boolean;
        dbPath: string;
    };
    budget: {
        dailyLimit: number | null;
        sessionLimit: number | null;
        warnPercent: number;
    };
    dashboard: {
        port: number;
        autoStart: boolean;
        host: string;
        refreshIntervalMs: number;
    };
    gateway: {
        platforms: string[];
        tokens: Record<string, string>;
    };
    voice: {
        stt: string;
        tts: string;
        providers: Record<string, string>;
        recordKey: string;
        maxRecordingSeconds: number;
        autoTTS: boolean;
        silenceThreshold: number;
        silenceDuration: number;
        gatewayVoice: boolean;
    };
    terminal: {
        backend: string;
        cwd: string;
        timeout: number;
    };
    skills: {
        dirs: string[];
        externalDirs: string[];
    };
    docling: {
        enabled: boolean;
        mode: "http";
        port: number;
    };
    agents: {
        maxAgents: number;
        idleTimeoutMs: number;
        taskTimeoutMs: number;
        concurrencyLimit: number;
    };
    memory: {
        provider: string;
        path: string;
    };
    forge: {
        enabled: boolean;
        projectsDir: string;
        maxConcurrentAgents: number;
        defaultSessionLimit: number;
        scribeModel: string;
    };
    contextEngineer: {
        enabled: boolean;
        model: string;
        rawWindowSize: number;
        rewriteInterval: number;
        maxPrecisionLogTokens: number;
        maxRollingContextTokens: number;
        fallbackToCompression: string;
    };
    knowledge: {
        enabled: boolean;
        storePath: string;
        indexPath: string;
        autoInject: boolean;
        maxInjectTokens: number;
        maxInjectChunks: number;
        embeddingModel: string;
        topics: Record<string, string[]>;
    };
    session: {
        contextMode: "context-engineer";
    };
};
//# sourceMappingURL=defaults.d.ts.map
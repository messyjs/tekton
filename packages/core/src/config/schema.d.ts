export declare const CONFIG_SCHEMA: import("@sinclair/typebox").TObject<{
    identity: import("@sinclair/typebox").TObject<{
        soul: import("@sinclair/typebox").TString;
        name: import("@sinclair/typebox").TString;
        soulPath: import("@sinclair/typebox").TString;
        memoryPath: import("@sinclair/typebox").TString;
        userModelPath: import("@sinclair/typebox").TString;
        maxMemoryChars: import("@sinclair/typebox").TNumber;
        maxUserModelChars: import("@sinclair/typebox").TNumber;
        maxContextChars: import("@sinclair/typebox").TNumber;
    }>;
    models: import("@sinclair/typebox").TObject<{
        fast: import("@sinclair/typebox").TObject<{
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
        }>;
        deep: import("@sinclair/typebox").TObject<{
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
        }>;
        fallbackChain: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            model: import("@sinclair/typebox").TString;
            provider: import("@sinclair/typebox").TString;
        }>>;
    }>;
    routing: import("@sinclair/typebox").TObject<{
        mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"auto">, import("@sinclair/typebox").TLiteral<"fast">, import("@sinclair/typebox").TLiteral<"deep">, import("@sinclair/typebox").TLiteral<"rules">]>;
        complexityThreshold: import("@sinclair/typebox").TNumber;
        simpleThreshold: import("@sinclair/typebox").TNumber;
        escalationKeywords: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        simpleKeywords: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    compression: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        defaultTier: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"none">, import("@sinclair/typebox").TLiteral<"lite">, import("@sinclair/typebox").TLiteral<"full">, import("@sinclair/typebox").TLiteral<"ultra">]>;
    }>;
    learning: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        autoExtract: import("@sinclair/typebox").TBoolean;
        complexityThreshold: import("@sinclair/typebox").TNumber;
    }>;
    contextHygiene: import("@sinclair/typebox").TObject<{
        maxTurns: import("@sinclair/typebox").TNumber;
        compactPercent: import("@sinclair/typebox").TNumber;
        pruneAfter: import("@sinclair/typebox").TNumber;
    }>;
    telemetry: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        dbPath: import("@sinclair/typebox").TString;
    }>;
    budget: import("@sinclair/typebox").TObject<{
        dailyLimit: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
        sessionLimit: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
        warnPercent: import("@sinclair/typebox").TNumber;
    }>;
    dashboard: import("@sinclair/typebox").TObject<{
        port: import("@sinclair/typebox").TNumber;
        autoStart: import("@sinclair/typebox").TBoolean;
        host: import("@sinclair/typebox").TString;
        refreshIntervalMs: import("@sinclair/typebox").TNumber;
    }>;
    gateway: import("@sinclair/typebox").TObject<{
        platforms: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        tokens: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>;
    }>;
    voice: import("@sinclair/typebox").TObject<{
        stt: import("@sinclair/typebox").TString;
        tts: import("@sinclair/typebox").TString;
        providers: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TString>;
    }>;
    terminal: import("@sinclair/typebox").TObject<{
        backend: import("@sinclair/typebox").TString;
        cwd: import("@sinclair/typebox").TString;
        timeout: import("@sinclair/typebox").TNumber;
    }>;
    skills: import("@sinclair/typebox").TObject<{
        dirs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        externalDirs: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    agents: import("@sinclair/typebox").TObject<{
        maxAgents: import("@sinclair/typebox").TNumber;
        idleTimeoutMs: import("@sinclair/typebox").TNumber;
        taskTimeoutMs: import("@sinclair/typebox").TNumber;
        concurrencyLimit: import("@sinclair/typebox").TNumber;
    }>;
    memory: import("@sinclair/typebox").TObject<{
        provider: import("@sinclair/typebox").TString;
        path: import("@sinclair/typebox").TString;
    }>;
    forge: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        projectsDir: import("@sinclair/typebox").TString;
        maxConcurrentAgents: import("@sinclair/typebox").TNumber;
        defaultSessionLimit: import("@sinclair/typebox").TNumber;
        scribeModel: import("@sinclair/typebox").TString;
    }>;
    contextEngineer: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        model: import("@sinclair/typebox").TString;
        rawWindowSize: import("@sinclair/typebox").TNumber;
        rewriteInterval: import("@sinclair/typebox").TNumber;
        maxPrecisionLogTokens: import("@sinclair/typebox").TNumber;
        maxRollingContextTokens: import("@sinclair/typebox").TNumber;
        fallbackToCompression: import("@sinclair/typebox").TString;
    }>;
    knowledge: import("@sinclair/typebox").TObject<{
        enabled: import("@sinclair/typebox").TBoolean;
        storePath: import("@sinclair/typebox").TString;
        indexPath: import("@sinclair/typebox").TString;
        autoInject: import("@sinclair/typebox").TBoolean;
        maxInjectTokens: import("@sinclair/typebox").TNumber;
        maxInjectChunks: import("@sinclair/typebox").TNumber;
        embeddingModel: import("@sinclair/typebox").TString;
        topics: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>;
    session: import("@sinclair/typebox").TObject<{
        contextMode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"context-engineer">, import("@sinclair/typebox").TLiteral<"caveman">, import("@sinclair/typebox").TLiteral<"raw">]>;
    }>;
}>;
//# sourceMappingURL=schema.d.ts.map
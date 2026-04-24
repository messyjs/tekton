export const DEFAULT_CONFIG = {
  identity: {
    soul: "Tekton — adaptive coding agent",
    name: "tekton",
    soulPath: "~/.tekton/SOUL.md",
    memoryPath: "~/.tekton/MEMORY.md",
    userModelPath: "~/.tekton/USER.md",
    maxMemoryChars: 4000,
    maxUserModelChars: 2000,
    maxContextChars: 2000,
  },
  models: {
    fast: {
      model: "gemma3:12b",
      provider: "ollama",
    },
    deep: {
      model: "gemma3:27b",
      provider: "ollama",
    },
    fallbackChain: [] as Array<{ model: string; provider: string }>,
  },
  routing: {
    mode: "auto" as const,
    complexityThreshold: 0.6,
    simpleThreshold: 0.3,
    escalationKeywords: [] as string[],
    simpleKeywords: [] as string[],
  },
  compression: {
    enabled: true,
    defaultTier: "full" as const,
  },
  learning: {
    enabled: true,
    autoExtract: true,
    complexityThreshold: 0.7,
  },
  contextHygiene: {
    maxTurns: 50,
    compactPercent: 0.75,
    pruneAfter: 30,
  },
  telemetry: {
    enabled: true,
    dbPath: "~/.tekton/telemetry.db",
  },
  budget: {
    dailyLimit: null as number | null,
    sessionLimit: null as number | null,
    warnPercent: 80,
  },
  dashboard: {
    port: 7890,
    autoStart: false,
    host: "127.0.0.1",
    refreshIntervalMs: 5000,
  },
  gateway: {
    platforms: [] as string[],
    tokens: {} as Record<string, string>,
  },
  voice: {
    stt: "local",
    tts: "edge",
    providers: {} as Record<string, string>,
    recordKey: "ctrl+b",
    maxRecordingSeconds: 120,
    autoTTS: false,
    silenceThreshold: 200,
    silenceDuration: 3.0,
    gatewayVoice: false,
  },
  terminal: {
    backend: "local",
    cwd: "",
    timeout: 30000,
  },
  skills: {
    dirs: [] as string[],
    externalDirs: [] as string[],
  },
  docling: {
    enabled: true as boolean,
    mode: "http" as const,
    port: 7701,
  },
  agents: {
    maxAgents: 4,
    idleTimeoutMs: 60000,
    taskTimeoutMs: 120000,
    concurrencyLimit: 4,
  },
  memory: {
    provider: "sqlite",
    path: "~/.tekton/memory.db",
  },
  forge: {
    enabled: false as boolean,
    projectsDir: "~/.tekton/forge-projects",
    maxConcurrentAgents: 4,
    defaultSessionLimit: 20,
    scribeModel: "gemini-flash",
  },
  contextEngineer: {
    enabled: true as boolean,
    model: "gemini-flash",
    rawWindowSize: 12,
    rewriteInterval: 10,
    maxPrecisionLogTokens: 2000,
    maxRollingContextTokens: 3000,
    fallbackToCompression: "caveman-compact",  // used when CE disabled
  },
  knowledge: {
    enabled: false as boolean,
    storePath: "~/.tekton/knowledge/",
    indexPath: "~/.tekton/knowledge/index/",
    autoInject: true as boolean,
    maxInjectTokens: 1500,
    maxInjectChunks: 3,
    embeddingModel: "text-embedding-3-small",
    topics: {} as Record<string, string[]>,
  },
  session: {
    contextMode: "context-engineer" as const,
  },
};
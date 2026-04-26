import { Type } from "@sinclair/typebox";

export const CONFIG_SCHEMA = Type.Object({
  identity: Type.Object({
    soul: Type.String({ default: "Tekton Agent — adaptive coding agent that learns" }),
    name: Type.String({ default: "tekton" }),
    soulPath: Type.String({ default: "~/.tekton/SOUL.md" }),
    memoryPath: Type.String({ default: "~/.tekton/MEMORY.md" }),
    userModelPath: Type.String({ default: "~/.tekton/USER.md" }),
    maxMemoryChars: Type.Number({ default: 4000 }),
    maxUserModelChars: Type.Number({ default: 2000 }),
    maxContextChars: Type.Number({ default: 2000 }),
  }),
  models: Type.Object({
    fast: Type.Object({
      model: Type.String({ default: "gemma3:12b" }),
      provider: Type.String({ default: "ollama" }),
    }),
    deep: Type.Object({
      model: Type.String({ default: "gemma3:27b" }),
      provider: Type.String({ default: "ollama" }),
    }),
    fallbackChain: Type.Array(Type.Object({
      model: Type.String(),
      provider: Type.String(),
    }), { default: [] }),
  }),
  routing: Type.Object({
    mode: Type.Union([Type.Literal("auto"), Type.Literal("fast"), Type.Literal("deep"), Type.Literal("rules")], { default: "auto" }),
    complexityThreshold: Type.Number({ default: 0.6 }),
    simpleThreshold: Type.Number({ default: 0.3 }),
    escalationKeywords: Type.Array(Type.String(), { default: [] }),
    simpleKeywords: Type.Array(Type.String(), { default: [] }),
  }),
  compression: Type.Object({
    enabled: Type.Boolean({ default: true }),
    defaultTier: Type.Union([Type.Literal("none"), Type.Literal("lite"), Type.Literal("full"), Type.Literal("ultra")], { default: "full" }),
  }),
  learning: Type.Object({
    enabled: Type.Boolean({ default: true }),
    autoExtract: Type.Boolean({ default: true }),
    complexityThreshold: Type.Number({ default: 0.7 }),
  }),
  contextHygiene: Type.Object({
    maxTurns: Type.Number({ default: 50 }),
    compactPercent: Type.Number({ default: 0.75 }),
    pruneAfter: Type.Number({ default: 30 }),
  }),
  telemetry: Type.Object({
    enabled: Type.Boolean({ default: true }),
    dbPath: Type.String({ default: "~/.tekton/telemetry.db" }),
  }),
  budget: Type.Object({
    dailyLimit: Type.Union([Type.Number(), Type.Null()], { default: null }),
    sessionLimit: Type.Union([Type.Number(), Type.Null()], { default: null }),
    warnPercent: Type.Number({ default: 80 }),
  }),
  dashboard: Type.Object({
    port: Type.Number({ default: 7890 }),
    autoStart: Type.Boolean({ default: false }),
    host: Type.String({ default: "127.0.0.1" }),
    refreshIntervalMs: Type.Number({ default: 5000 }),
  }),
  gateway: Type.Object({
    platforms: Type.Array(Type.String(), { default: [] }),
    tokens: Type.Record(Type.String(), Type.String(), { default: {} }),
  }),
  voice: Type.Object({
    stt: Type.String({ default: "" }),
    tts: Type.String({ default: "" }),
    providers: Type.Record(Type.String(), Type.String(), { default: {} }),
  }),
  terminal: Type.Object({
    backend: Type.String({ default: "local" }),
    cwd: Type.String({ default: "" }),
    timeout: Type.Number({ default: 30000 }),
  }),
  skills: Type.Object({
    dirs: Type.Array(Type.String(), { default: [] }),
    externalDirs: Type.Array(Type.String(), { default: [] }),
  }),
  agents: Type.Object({
    maxAgents: Type.Number({ default: 4 }),
    idleTimeoutMs: Type.Number({ default: 60000 }),
    taskTimeoutMs: Type.Number({ default: 120000 }),
    concurrencyLimit: Type.Number({ default: 4 }),
  }),
  memory: Type.Object({
    provider: Type.String({ default: "sqlite" }),
    path: Type.String({ default: "~/.tekton/memory.db" }),
  }),
  forge: Type.Object({
    enabled: Type.Boolean({ default: false }),
    projectsDir: Type.String({ default: "~/.tekton/forge-projects" }),
    maxConcurrentAgents: Type.Number({ default: 4 }),
    defaultSessionLimit: Type.Number({ default: 20 }),
    scribeModel: Type.String({ default: "gemini-flash" }),
  }),
  contextEngineer: Type.Object({
    enabled: Type.Boolean({ default: true }),
    model: Type.String({ default: "gemini-flash" }),
    rawWindowSize: Type.Number({ default: 12 }),
    rewriteInterval: Type.Number({ default: 10 }),
    maxPrecisionLogTokens: Type.Number({ default: 2000 }),
    maxRollingContextTokens: Type.Number({ default: 3000 }),
    fallbackToCompression: Type.String({ default: "caveman-compact" }),
  }),
  knowledge: Type.Object({
    enabled: Type.Boolean({ default: false }),
    storePath: Type.String({ default: "~/.tekton/knowledge/" }),
    indexPath: Type.String({ default: "~/.tekton/knowledge/index/" }),
    autoInject: Type.Boolean({ default: true }),
    maxInjectTokens: Type.Number({ default: 1500 }),
    maxInjectChunks: Type.Number({ default: 3 }),
    embeddingModel: Type.String({ default: "text-embedding-3-small" }),
    topics: Type.Record(Type.String(), Type.Array(Type.String()), { default: {} }),
  }),
  session: Type.Object({
    contextMode: Type.Union([Type.Literal("context-engineer"), Type.Literal("caveman"), Type.Literal("raw")], { default: "context-engineer" }),
  }),
});
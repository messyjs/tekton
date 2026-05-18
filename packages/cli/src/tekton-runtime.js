import { createAgentSessionFromServices, createAgentSessionServices, SessionManager, getAgentDir, } from "@mariozechner/pi-coding-agent";
import { ModelRouter, SoulManager, PersonalityManager, TelemetryTracker, MemoryManager, AgentPool, } from "@tekton/core";
import { setGlobalPool } from "@tekton/tools";
import { HermesBridge } from "@tekton/hermes-bridge";
import { createTektonResourceLoader, createTektonResourceLoaderOptions } from "./resource-loader.js";
import { createTektonTools } from "./tools/tekton-tools.js";
import path from "node:path";
import { execSync } from "node:child_process";
// ── Global subsystems (set after runtime creation) ─────────────────
let _tektonSubsystems = null;
let _doclingProcess = null;
export function getTektonSubsystems() {
    return _tektonSubsystems;
}
// ── Docling sidecar lifecycle ─────────────────────────────────────────
/**
 * Start the Docling sidecar if enabled and installed.
 */
async function startDoclingSidecar(config, tektonHome) {
    const doclingCfg = config.docling;
    if (!doclingCfg?.enabled)
        return;
    const mode = doclingCfg.mode ?? "http";
    const port = doclingCfg.port ?? 7701;
    // Check if tekton-docling is installed
    let installed = false;
    try {
        const result = execSync(process.platform === "win32"
            ? "python -m tekton_docling --version 2>nul || pip show tekton-docling 2>nul"
            : "python -m tekton_docling --version 2>/dev/null || pip show tekton-docling 2>/dev/null", { encoding: "utf-8", timeout: 5000, stdio: "pipe" });
        if (result)
            installed = true;
    }
    catch {
        // Not installed
    }
    if (!installed) {
        console.log("[Tekton] Docling service not installed. Rich document parsing disabled. Install with: pip install tekton-docling");
        return;
    }
    if (mode === "http") {
        // Check if already running
        try {
            const resp = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
            if (resp.ok) {
                console.log(`[Tekton] Docling sidecar already running on port ${port}`);
                return;
            }
        }
        catch {
            // Not running, start it
        }
        console.log(`[Tekton] Starting Docling sidecar on port ${port}...`);
        const { spawn } = await import("node:child_process");
        const proc = spawn("tekton-docling", ["--mode", "http", "--port", String(port)], {
            detached: true,
            stdio: "ignore",
        });
        proc.unref();
        _doclingProcess = proc;
        // Wait for health check
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                const resp = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2000) });
                if (resp.ok) {
                    console.log(`[Tekton] Docling sidecar started successfully on port ${port}`);
                    return;
                }
            }
            catch {
                continue;
            }
        }
        console.warn("[Tekton] Docling sidecar did not become healthy within 30s");
    }
}
/**
 * Stop the Docling sidecar on shutdown.
 */
function stopDoclingSidecar() {
    if (_doclingProcess) {
        console.log("[Tekton] Stopping Docling sidecar...");
        _doclingProcess.kill("SIGTERM");
        _doclingProcess = null;
    }
}
// ── Runtime factory ─────────────────────────────────────────────────
export function createTektonRuntimeFactory(parsedArgs, config, tektonHome) {
    return async ({ cwd, sessionManager, sessionStartEvent }) => {
        // 1. Initialize Tekton subsystems
        const bridgeConfig = {
            tektonHome,
            skillDirs: [...(config.skills?.dirs ?? []), ...(config.skills?.externalDirs ?? [])],
        };
        const hermesBridge = new HermesBridge(bridgeConfig);
        const soul = new SoulManager(tektonHome);
        const personality = new PersonalityManager(soul);
        const memory = new MemoryManager(tektonHome);
        // Apply personality preset from CLI flag
        if (parsedArgs.tekton.personality) {
            personality.setOverlay(parsedArgs.tekton.personality);
        }
        // Apply soul override from CLI flag
        if (parsedArgs.tekton.soul) {
            const fs = await import("node:fs");
            const soulContent = fs.readFileSync(parsedArgs.tekton.soul, "utf-8");
            soul.setSoul(soulContent);
        }
        const modelRouter = new ModelRouter({
            fastModel: config.models.fast.model,
            fastProvider: config.models.fast.provider,
            deepModel: config.models.deep.model,
            deepProvider: config.models.deep.provider,
            fallbackChain: config.models.fallbackChain,
            complexityThreshold: config.routing.complexityThreshold,
            simpleThreshold: config.routing.simpleThreshold,
        });
        // Apply route mode from CLI flag
        modelRouter.setMode(parsedArgs.tekton.route);
        // Honor --no-learning flag — pause Hermes bridge
        if (parsedArgs.tekton.noLearning) {
            hermesBridge.setPaused(true);
        }
        const telemetry = new TelemetryTracker(path.join(tektonHome, "telemetry.db"));
        // Initialize agent pool with ModelRouter for real execution
        const agentPool = new AgentPool({
            maxAgents: config.agents?.maxAgents ?? 4,
            idleTimeoutMs: config.agents?.idleTimeoutMs ?? 60000,
            taskTimeoutMs: config.agents?.taskTimeoutMs ?? 120000,
            concurrencyLimit: config.agents?.concurrencyLimit ?? 4,
        }, {}, modelRouter);
        // Store globally for access from modes
        _tektonSubsystems = {
            hermesBridge, modelRouter, telemetry, soul, personality, memory, agentPool,
        };
        // Set global pool for delegate_task tool
        setGlobalPool(agentPool);
        // 2. Create custom resource loader
        const resourceLoaderConfig = {
            cwd,
            tektonHome,
            parsedArgs,
            config,
            hermesBridge,
            modelRouter,
            soul,
            personality,
            memory,
            telemetry,
        };
        const resourceLoader = createTektonResourceLoader(resourceLoaderConfig);
        await resourceLoader.reload();
        // 3. Create Pi services with custom resource loader
        const services = await createAgentSessionServices({
            cwd,
            agentDir: getAgentDir(),
            resourceLoaderOptions: createTektonResourceLoaderOptions(resourceLoaderConfig),
        });
        // 4. Create Tekton custom tools (with agent pool)
        const customTools = createTektonTools(hermesBridge, memory, agentPool);
        // 5. Build model selection from CLI flags --provider/--model
        const modelSelection = buildModelSelection(parsedArgs, services.modelRegistry);
        // 6. Create session with custom tools, model selection, and thinking level
        const sessionResult = await createAgentSessionFromServices({
            services,
            sessionManager,
            sessionStartEvent,
            customTools,
            model: modelSelection,
            thinkingLevel: parsedArgs.pi.thinking,
        });
        return {
            ...sessionResult,
            services,
            diagnostics: services.diagnostics,
        };
    };
}
/**
 * Create a Tekton runtime from parsed args. This is the main entry point
 * for starting any mode (interactive, print, rpc).
 */
export async function createTektonRuntime(parsedArgs, config, tektonHome) {
    const { createAgentSessionRuntime } = await import("@mariozechner/pi-coding-agent");
    const factory = createTektonRuntimeFactory(parsedArgs, config, tektonHome);
    const cwd = process.cwd();
    const sessionManager = SessionManager.create(cwd);
    // Use default agentDir (resolves via PI_CODING_AGENT_DIR env var → ~/.pi/agent)
    // This ensures the Pi SDK reads auth.json/models.json/settings.json correctly.
    const agentDir = getAgentDir();
    const runtime = await createAgentSessionRuntime(factory, {
        cwd,
        agentDir,
        sessionManager,
    });
    // Start Docling sidecar if configured
    await startDoclingSidecar(config, tektonHome);
    // Register shutdown handler
    process.on("SIGTERM", () => { stopDoclingSidecar(); });
    process.on("SIGINT", () => { stopDoclingSidecar(); });
    process.on("exit", () => { stopDoclingSidecar(); });
    return runtime;
}
/** Resolve a Model object from --provider and --model CLI flags using the model registry. */
function buildModelSelection(parsedArgs, modelRegistry) {
    const provider = parsedArgs.pi.provider;
    const modelId = parsedArgs.pi.model;
    if (provider && modelId) {
        return modelRegistry.find(provider, modelId);
    }
    if (modelId) {
        // Try to find the model across all providers
        const all = modelRegistry.getAvailable();
        return all.find((m) => m.id === modelId);
    }
    return undefined;
}
//# sourceMappingURL=tekton-runtime.js.map
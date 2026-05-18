import { runRpcMode, SessionManager, createAgentSessionRuntime, getAgentDir, } from "@mariozechner/pi-coding-agent";
import { createTektonRuntimeFactory } from "../tekton-runtime.js";
// ── RPC mode (JSON-RPC via stdin/stdout) ─────────────────────────────
export async function startRpcMode(config, parsed, tektonHome) {
    const factory = createTektonRuntimeFactory(parsed, config, tektonHome);
    const cwd = process.cwd();
    const runtime = await createAgentSessionRuntime(factory, {
        cwd,
        agentDir: getAgentDir(),
        sessionManager: SessionManager.inMemory(cwd),
    });
    await runRpcMode(runtime);
}
//# sourceMappingURL=rpc.js.map
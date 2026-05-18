import { runPrintMode, SessionManager, createAgentSessionRuntime, getAgentDir, } from "@mariozechner/pi-coding-agent";
import { createTektonRuntimeFactory } from "../tekton-runtime.js";
// ── Print mode (single-shot, non-interactive) ────────────────────────
export async function startPrintMode(config, parsed, tektonHome) {
    if (!parsed.initialMessage) {
        console.error("Print mode requires a message argument.");
        process.exit(1);
    }
    const factory = createTektonRuntimeFactory(parsed, config, tektonHome);
    const cwd = process.cwd();
    const runtime = await createAgentSessionRuntime(factory, {
        cwd,
        agentDir: getAgentDir(),
        sessionManager: parsed.pi.noSession ? SessionManager.inMemory(cwd) : SessionManager.create(cwd),
    });
    await runPrintMode(runtime, {
        mode: "text",
        initialMessage: parsed.initialMessage,
    });
}
//# sourceMappingURL=print.js.map
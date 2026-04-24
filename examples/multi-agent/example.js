// Multi-Agent — Sub-agent delegation via SCP
import { encodeSCP, decodeSCP } from "@tekton/core";
async function main() {
    console.log("⚡ Tekton Multi-Agent SCP Example\n");
    // Delegate a task to a sub-agent
    const delegate = {
        type: "delegate",
        task_id: "task-001",
        from: "orchestrator",
        to: "code-reviewer",
        task: "Review the authentication module for security vulnerabilities",
        priority: "high",
        skill_hint: "security-audit",
        tools: ["filesystem", "code"],
        timeout_ms: 60000,
    };
    const encoded = encodeSCP(delegate);
    console.log("Encoded delegate message:");
    console.log(encoded.slice(0, 100) + "...\n");
    // Decode on the receiving end
    const decoded = decodeSCP(encoded);
    console.log("Decoded message:");
    console.log(`  Type: ${decoded.type}`);
    console.log(`  From: ${decoded.from}`);
    console.log(`  To: ${decoded.to}`);
    console.log(`  Task: ${decoded.task}`);
    console.log(`  Priority: ${decoded.priority}\n`);
    // Simulate a result message
    const result = {
        type: "result",
        task_id: "task-001",
        from: "code-reviewer",
        status: "ok",
        result: "Found 3 security issues: SQL injection in login, missing CSRF token, unvalidated redirect",
        tokens_used: 1500,
        model_used: "gemma3:12b",
        duration_ms: 3500,
    };
    const resultEncoded = encodeSCP(result);
    const resultDecoded = decodeSCP(resultEncoded);
    console.log("Result message:");
    console.log(`  Status: ${resultDecoded.status}`);
    console.log(`  Tokens used: ${resultDecoded.tokens_used}`);
    console.log(`  Duration: ${resultDecoded.duration_ms}ms`);
}
main().catch(console.error);
//# sourceMappingURL=example.js.map
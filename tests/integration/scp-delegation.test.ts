/**
 * Integration Test — SCP delegation round-trip
 */
import { describe, it, expect } from "vitest";
import { encodeSCP, decodeSCP } from "@tekton/core";

describe("SCP Delegation Integration", () => {
  it("round-trips a delegate message", () => {
    const msg = {
      type: "delegate" as const,
      task_id: "task-001",
      from: "orchestrator",
      to: "worker-alpha",
      task: "Implement user authentication module",
      priority: "high" as const,
    };
    const encoded = encodeSCP(msg);
    const decoded = decodeSCP(encoded);
    expect(decoded.type).toBe("delegate");
    expect(decoded.from).toBe("orchestrator");
    expect(decoded.to).toBe("worker-alpha");
    expect(decoded.task).toBe("Implement user authentication module");
  });

  it("round-trips a result message", () => {
    const response = {
      type: "result" as const,
      task_id: "task-001",
      from: "worker-alpha",
      status: "ok" as const,
      result: "Authentication module implemented",
      tokens_used: 1500,
      model_used: "gemma3:12b",
      duration_ms: 3000,
    };
    const encoded = encodeSCP(response);
    const decoded = decodeSCP(encoded);
    expect(decoded.type).toBe("result");
    expect(decoded.status).toBe("ok");
  });

  it("round-trips a skill query", () => {
    const query = {
      type: "skill-query" as const,
      from: "orchestrator",
      query: "code review",
      top_k: 3,
    };
    const encoded = encodeSCP(query);
    const decoded = decodeSCP(encoded);
    expect(decoded.type).toBe("skill-query");
    expect(decoded.query).toBe("code review");
  });

  it("round-trips a skill response", () => {
    const response = {
      type: "skill-response" as const,
      from: "skill-registry",
      skills: [
        { name: "code-review", description: "Reviews code for quality", confidence: 0.92 },
        { name: "security-audit", description: "Security analysis", confidence: 0.78 },
      ],
    };
    const encoded = encodeSCP(response);
    const decoded = decodeSCP(encoded);
    expect(decoded.type).toBe("skill-response");
    expect(decoded.skills.length).toBe(2);
  });

  it("round-trips a status message", () => {
    const status = {
      type: "status" as const,
      from: "worker-alpha",
      state: "idle" as const,
    };
    const encoded = encodeSCP(status);
    const decoded = decodeSCP(encoded);
    expect(decoded.type).toBe("status");
    expect(decoded.state).toBe("idle");
  });

  it("round-trips an error message", () => {
    const error = {
      type: "error" as const,
      task_id: "task-001",
      from: "worker-alpha",
      code: "TIMEOUT",
      message: "Task timed out after 30 seconds",
      recoverable: true,
    };
    const encoded = encodeSCP(error);
    const decoded = decodeSCP(encoded);
    expect(decoded.type).toBe("error");
    expect(decoded.code).toBe("TIMEOUT");
    expect(decoded.recoverable).toBe(true);
  });

  it("handles large payloads through SCP", () => {
    const msg = {
      type: "delegate" as const,
      task_id: "task-large",
      from: "orchestrator",
      to: "worker",
      task: "Analyze the following code: " + "x".repeat(5000),
      priority: "normal" as const,
    };
    const encoded = encodeSCP(msg);
    const decoded = decodeSCP(encoded);
    expect(decoded.task.length).toBeGreaterThan(5000);
  });
});
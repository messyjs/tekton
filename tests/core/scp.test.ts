import { describe, it, expect } from "vitest";
import { encodeSCP, decodeSCP } from "../../packages/core/src/scp/codec.ts";
import { validateSCP } from "../../packages/core/src/scp/validate.ts";
import type { SCPDelegate, SCPResult, SCPError, SCPStatus, SCPSkillQuery, SCPSkillResponse } from "../../packages/core/src/scp/types.ts";

describe("SCP Codec", () => {
  const delegate: SCPDelegate = {
    type: "delegate",
    task_id: "t1",
    from: "tekton",
    to: "model",
    task: "Build the feature",
    priority: "high",
  };

  const result: SCPResult = {
    type: "result",
    task_id: "t1",
    from: "model",
    status: "ok",
    result: "Feature built",
    tokens_used: 150,
    model_used: "gemma3:27b",
    duration_ms: 2500,
  };

  const error: SCPError = {
    type: "error",
    task_id: "t2",
    from: "model",
    code: "TIMEOUT",
    message: "Request timed out",
    recoverable: true,
  };

  const status: SCPStatus = {
    type: "status",
    from: "tekton",
    state: "busy",
    current_task: "t3",
    tokens_remaining: 50000,
  };

  const skillQuery: SCPSkillQuery = {
    type: "skill-query",
    from: "tekton",
    query: "refactor React components",
    top_k: 3,
  };

  const skillResponse: SCPSkillResponse = {
    type: "skill-response",
    from: "skills",
    skills: [
      { name: "react-refactor", description: "Refactor React", confidence: 0.9 },
    ],
  };

  it("encodes and decodes delegate messages", () => {
    const encoded = encodeSCP(delegate);
    const decoded = decodeSCP(encoded);
    expect(decoded).toEqual(delegate);
  });

  it("encodes and decodes result messages", () => {
    const encoded = encodeSCP(result);
    const decoded = decodeSCP(encoded);
    expect(decoded).toEqual(result);
  });

  it("encodes and decodes error messages", () => {
    const encoded = encodeSCP(error);
    const decoded = decodeSCP(encoded);
    expect(decoded).toEqual(error);
  });

  it("encodes and decodes status messages", () => {
    const encoded = encodeSCP(status);
    const decoded = decodeSCP(encoded);
    expect(decoded).toEqual(status);
  });

  it("encodes and decodes skill-query messages", () => {
    const encoded = encodeSCP(skillQuery);
    const decoded = decodeSCP(encoded);
    expect(decoded).toEqual(skillQuery);
  });

  it("encodes and decodes skill-response messages", () => {
    const encoded = encodeSCP(skillResponse);
    const decoded = decodeSCP(encoded);
    expect(decoded).toEqual(skillResponse);
  });

  it("round-trips all message types", () => {
    const messages = [delegate, result, error, status, skillQuery, skillResponse];
    for (const msg of messages) {
      const encoded = encodeSCP(msg);
      const decoded = decodeSCP(encoded);
      expect(decoded).toEqual(msg);
    }
  });

  it("throws on invalid JSON", () => {
    expect(() => decodeSCP("not json")).toThrow();
  });

  it("throws on invalid SCP message", () => {
    expect(() => decodeSCP('{"type":"unknown"}')).toThrow();
  });
});

describe("SCP Validation", () => {
  it("validates correct delegate message", () => {
    const result = validateSCP({
      type: "delegate",
      task_id: "t1",
      from: "tekton",
      to: "model",
      task: "Do something",
      priority: "high",
    });
    expect(result.valid).toBe(true);
  });

  it("validates correct result message", () => {
    const result = validateSCP({
      type: "result",
      task_id: "t1",
      from: "model",
      status: "ok",
      result: "Done",
      tokens_used: 100,
      model_used: "gemma3:27b",
      duration_ms: 500,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects null input", () => {
    const result = validateSCP(null);
    expect(result.valid).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = validateSCP("string");
    expect(result.valid).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = validateSCP({
      type: "delegate",
      from: "tekton",
    });
    expect(result.valid).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it("rejects invalid priority value", () => {
    const result = validateSCP({
      type: "delegate",
      task_id: "t1",
      from: "tekton",
      to: "model",
      task: "Do something",
      priority: "urgent",
    });
    expect(result.valid).toBe(false);
  });

  it("accepts optional fields missing", () => {
    const result = validateSCP({
      type: "delegate",
      task_id: "t1",
      from: "tekton",
      to: "model",
      task: "Do something",
      priority: "normal",
    });
    expect(result.valid).toBe(true);
  });
});
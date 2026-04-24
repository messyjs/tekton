import { describe, it, expect, vi } from "vitest";
import { CavememBridge } from "../../../packages/core/src/memory/cavemem-bridge.ts";

describe("CavememBridge", () => {
  it("reports unavailable when cavemem is not installed", () => {
    const bridge = new CavememBridge();
    // In test environment, cavemem won't be installed
    expect(bridge.isAvailable()).toBe(false);
  });

  it("returns empty search results when unavailable", async () => {
    const bridge = new CavememBridge();
    const results = await bridge.search("test query");
    expect(results).toEqual([]);
  });

  it("returns empty timeline when unavailable", async () => {
    const bridge = new CavememBridge();
    const timeline = await bridge.timeline("session-1");
    expect(timeline).toEqual([]);
  });

  it("returns empty observations when unavailable", async () => {
    const bridge = new CavememBridge();
    const observations = await bridge.getObservations(["id1", "id2"]);
    expect(observations).toEqual([]);
  });

  it("store() completes without error when unavailable", async () => {
    const bridge = new CavememBridge();
    await expect(
      bridge.store({ content: "test", kind: "observation", sessionId: "sess-1" }),
    ).resolves.toBeUndefined();
  });

  it("returns empty sessions list when unavailable", async () => {
    const bridge = new CavememBridge();
    const sessions = await bridge.listSessions();
    expect(sessions).toEqual([]);
  });
});
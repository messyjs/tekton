/**
 * Tests for read_file graceful fallback when Docling sidecar is down.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFileTool } from "../../src/toolsets/file/file.js";
import { resetHealthCache } from "../../src/toolsets/file/docling-client.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const mockContext = {
  cwd: process.cwd(),
  taskId: "test",
  tektonHome: os.homedir() + "/.tekton",
  env: {},
};

describe("read_file fallback when sidecar is down", () => {
  beforeEach(() => {
    resetHealthCache();
  });

  it("should return fallback warning for .pdf when sidecar is down", async () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "fallback-test.pdf");
    fs.writeFileSync(tmpFile, "%PDF-1.4 fake content");

    try {
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );

      expect(result.content).toContain("Rich document detected");
      expect(result.content).toContain("Docling service not running");
      expect(result.content).toContain("pip install tekton-docling");
      // Should still include raw content
      expect(result.content).toContain("fake content");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("should return fallback warning for .xlsx when sidecar is down", async () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "fallback-test.xlsx");
    fs.writeFileSync(tmpFile, "PK xlsx fake data");

    try {
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );

      expect(result.content).toContain("Docling service not running");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("should work normally for plain text when sidecar is down", async () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "fallback-plain.txt");
    fs.writeFileSync(tmpFile, "Just plain text content");

    try {
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );

      expect(result.content).toContain("Just plain text content");
      expect(result.content).not.toContain("Docling");
      expect(result.isError).toBeFalsy();
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
/**
 * Tests for read_file delegating rich documents to Docling sidecar.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileTool } from "../../src/toolsets/file/file.js";
import { isDoclingAvailable, resetHealthCache } from "../../src/toolsets/file/docling-client.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const mockContext = {
  cwd: process.cwd(),
  taskId: "test",
  tektonHome: os.homedir() + "/.tekton",
  env: {},
};

describe("read_file with rich document detection", () => {
  beforeEach(() => {
    resetHealthCache();
  });

  it("should detect .pdf as a rich document", async () => {
    // Create a temporary .pdf file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "test-docling.pdf");
    fs.writeFileSync(tmpFile, "%PDF-1.4 fake content");

    try {
      // When Docling is not available, should fall back with warning
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );

      // Should include the fallback warning since sidecar is not running
      expect(result.content).toContain("Docling");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("should detect .docx as a rich document", async () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "test-docling.docx");
    fs.writeFileSync(tmpFile, "PK fake docx");

    try {
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );
      expect(result.content).toContain("Docling");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("should detect .pptx as a rich document", async () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "test-docling.pptx");
    fs.writeFileSync(tmpFile, "PK fake pptx");

    try {
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );
      expect(result.content).toContain("Docling");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it("should NOT treat .txt as a rich document", async () => {
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, "test-plain.txt");
    fs.writeFileSync(tmpFile, "Hello plain text");

    try {
      const result = await readFileTool.execute(
        { path: tmpFile },
        mockContext,
      );
      expect(result.content).toContain("Hello plain text");
      expect(result.content).not.toContain("Docling");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});
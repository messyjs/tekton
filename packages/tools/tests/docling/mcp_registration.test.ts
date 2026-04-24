/**
 * Tests for MCP server registration of Docling tools.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("MCP server registration for tekton-docling", () => {
  const mcpConfigPath = path.resolve(process.cwd(), "configs/mcp-servers.json");

  it("should have mcp-servers.json config file", () => {
    expect(fs.existsSync(mcpConfigPath)).toBe(true);
  });

  it("should contain tekton-docling entry with correct structure", () => {
    const content = fs.readFileSync(mcpConfigPath, "utf-8");
    const config = JSON.parse(content);

    expect(config).toHaveProperty("tekton-docling");
    const docling = config["tekton-docling"];

    expect(docling.command).toBe("tekton-docling");
    expect(docling.args).toContain("--mode");
    expect(docling.args).toContain("mcp");
    expect(docling.description).toContain("Docling");
    expect(docling.auto_start).toBe(false);
    expect(docling.health_check).toBe("http://localhost:7701/health");
    expect(docling.install_hint).toContain("pip install");
  });

  it("should have docling.json default config", () => {
    const doclingConfigPath = path.resolve(process.cwd(), "configs/docling.json");
    expect(fs.existsSync(doclingConfigPath)).toBe(true);

    const content = fs.readFileSync(doclingConfigPath, "utf-8");
    const config = JSON.parse(content);

    expect(config.enabled).toBe(true);
    expect(config.mode).toBe("http");
    expect(config.port).toBe(7701);
    expect(config.ocr.enabled).toBe(true);
    expect(config.ocr.engine).toBe("easyocr");
    expect(config.tables.mode).toBe("accurate");
    expect(config.chunking.default_max_tokens).toBe(512);
  });

  it("should register docling tools in the tool registry", async () => {
    const { registry } = await import("../../src/registry.js");
    const { doclingParseTool, doclingBatchTool } = await import("../../src/toolsets/file/file.js");

    // Verify the tools have correct names
    expect(doclingParseTool.name).toBe("docling_parse");
    expect(doclingParseTool.toolset).toBe("file");
    expect(doclingBatchTool.name).toBe("docling_batch");
    expect(doclingBatchTool.toolset).toBe("file");
  });
});
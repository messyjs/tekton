/**
 * Tests for the docling_parse tool.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { doclingParseTool } from "../../src/toolsets/file/file.js";
import { resetHealthCache } from "../../src/toolsets/file/docling-client.js";
const mockContext = {
    cwd: process.cwd(),
    taskId: "test",
    tektonHome: "/tmp/.tekton-test",
    env: {},
};
describe("docling_parse tool", () => {
    beforeEach(() => {
        resetHealthCache();
    });
    it("should return error when sidecar is not running", async () => {
        const result = await doclingParseTool.execute({ source: "/tmp/test.pdf" }, mockContext);
        expect(result.isError).toBe(true);
        expect(result.content).toContain("Docling service not running");
        expect(result.content).toContain("pip install tekton-docling");
    });
    it("should have correct tool metadata", () => {
        expect(doclingParseTool.name).toBe("docling_parse");
        expect(doclingParseTool.toolset).toBe("file");
        expect(doclingParseTool.description).toContain("PDF");
        expect(doclingParseTool.description).toContain("DOCX");
    });
    it("should support all output format parameters", () => {
        const params = doclingParseTool.parameters;
        // TypeBox Union produces [anyOf, ...] structure, not enum
        const formatProp = params.properties?.output_format;
        expect(formatProp).toBeDefined();
        // Verify the parameter exists and is a union/enum type
        expect(formatProp.anyOf || formatProp.enum).toBeDefined();
    });
    it("should support chunk parameter", () => {
        const params = doclingParseTool.parameters;
        expect(params.properties?.chunk).toBeDefined();
        expect(params.properties?.max_chunk_tokens).toBeDefined();
    });
    it("should support OCR and table_mode parameters", () => {
        const params = doclingParseTool.parameters;
        expect(params.properties?.ocr).toBeDefined();
        expect(params.properties?.table_mode).toBeDefined();
    });
});
//# sourceMappingURL=docling_parse_tool.test.js.map
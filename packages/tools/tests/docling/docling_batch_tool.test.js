/**
 * Tests for the docling_batch tool.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { doclingBatchTool } from "../../src/toolsets/file/file.js";
import { resetHealthCache } from "../../src/toolsets/file/docling-client.js";
const mockContext = {
    cwd: process.cwd(),
    taskId: "test",
    tektonHome: "/tmp/.tekton-test",
    env: {},
};
describe("docling_batch tool", () => {
    beforeEach(() => {
        resetHealthCache();
    });
    it("should return error when sidecar is not running", async () => {
        const result = await doclingBatchTool.execute({ sources: ["/tmp/doc1.pdf", "/tmp/doc2.docx"] }, mockContext);
        expect(result.isError).toBe(true);
        expect(result.content).toContain("Docling service not running");
    });
    it("should have correct tool metadata", () => {
        expect(doclingBatchTool.name).toBe("docling_batch");
        expect(doclingBatchTool.toolset).toBe("file");
        expect(doclingBatchTool.description).toContain("batch");
    });
    it("should require sources parameter", () => {
        const params = doclingBatchTool.parameters;
        expect(params.properties?.sources).toBeDefined();
        expect(params.required).toContain("sources");
    });
    it("should support output_format parameter", () => {
        const params = doclingBatchTool.parameters;
        // TypeBox Union produces anyOf structure, not simple enum
        const formatProp = params.properties?.output_format;
        expect(formatProp).toBeDefined();
        expect(formatProp.anyOf || formatProp.enum).toBeDefined();
    });
});
//# sourceMappingURL=docling_batch_tool.test.js.map
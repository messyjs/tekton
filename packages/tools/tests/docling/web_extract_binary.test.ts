/**
 * Tests for web_extract routing binary content through Docling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRichContentType, resetHealthCache } from "../../src/toolsets/file/docling-client.js";

describe("web_extract binary URL detection", () => {
  beforeEach(() => {
    resetHealthCache();
  });

  it("should identify PDF content type as rich", () => {
    expect(isRichContentType("application/pdf")).toBe(true);
  });

  it("should identify DOCX content type as rich", () => {
    expect(isRichContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });

  it("should identify PPTX content type as rich", () => {
    expect(isRichContentType("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe(true);
  });

  it("should identify XLSX content type as rich", () => {
    expect(isRichContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(true);
  });

  it("should identify image content types as rich", () => {
    expect(isRichContentType("image/png")).toBe(true);
    expect(isRichContentType("image/jpeg")).toBe(true);
    expect(isRichContentType("image/tiff")).toBe(true);
  });

  it("should NOT identify text/html as rich", () => {
    expect(isRichContentType("text/html")).toBe(false);
  });

  it("should NOT identify plain text as rich", () => {
    expect(isRichContentType("text/plain")).toBe(false);
  });

  it("should handle content-type with charset", () => {
    expect(isRichContentType("application/pdf; charset=utf-8")).toBe(true);
  });
});
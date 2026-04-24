# TEKTON PHASE 13 – Docling Document Intelligence Integration

Add Docling as Tekton's universal document processing backend. Docling is an MIT-licensed Python library that parses PDF, DOCX, PPTX, XLSX, HTML, images, audio, LaTeX, USPTO patents, JATS articles, XBRL reports, and scanned documents via OCR, outputting unified Markdown, HTML, JSON, or DocTags.

## Steps

1. Python sidecar package (packages/docling-service/)
2. Upgrade file toolset (read_file + docling_parse + docling_batch)
3. Upgrade web toolset (binary URL → Docling)
4. MCP server registration (configs/mcp-servers.json)
5. Default configuration (configs/docling.json)
6. CLI slash command (/tekton:docling)
7. Bundled skill (skills/productivity/docling/)
8. Dashboard Documents page
9. Startup integration (runtime.ts)
10. Tests (TypeScript + Python)
11. Documentation (docs/DOCLING.md, ARCHITECTURE.md, README.md)
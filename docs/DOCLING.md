# Docling Document Intelligence

## Overview

Tekton integrates [Docling](https://github.com/DS4SD/docling) as its universal document processing backend. Docling is an MIT-licensed Python library that parses PDF, DOCX, PPTX, XLSX, HTML, images, audio, LaTeX, USPTO patents, JATS articles, XBRL reports, and scanned documents via OCR, outputting unified Markdown, HTML, JSON, or DocTags.

Docling runs as a **Python sidecar service** that Tekton's Node.js tools communicate with over HTTP or MCP. This architecture ensures:
- No Python imports in the Node.js codebase
- Graceful degradation when Docling is not installed
- Independent scaling and lifecycle management

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Tekton (Node.js)                   │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐│
│  │read_file│  │web_extract│  │docling_parse/batch  ││
│  │  (auto) │  │  (auto)   │  │     (explicit)      ││
│  └────┬────┘  └─────┬────┘  └──────────┬──────────┘│
│       │             │                   │            │
│       └──────┬──────┴──────────────────┘            │
│              │    Docling Client (HTTP)              │
│              │                                      │
└──────────────┼──────────────────────────────────────┘
               │ HTTP (port 7701) / MCP (stdio)
┌──────────────┼──────────────────────────────────────┐
│              ▼     Docling Sidecar (Python)        │
│  ┌───────────────────────────────────────────────┐  │
│  │               FastAPI + MCP Server              │  │
│  │  /health  /formats  /parse  /chunk  /ocr     │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │                              │
│  ┌───────────────────┴───────────────────────────┐  │
│  │        TektonDocConverter                      │  │
│  │  DocumentConverter │ HierarchicalChunker       │  │
│  │  OCR (EasyOCR/Tesseract) │ Table Extraction   │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Installation

```bash
# Install the Docling sidecar
pip install -e packages/docling-service

# Or with OCR support
pip install -e "packages/docling-service[ocr]"

# Or with visual language model support
pip install -e "packages/docling-service[vlm]"
```

## Starting the Sidecar

### HTTP Mode (default)

```bash
tekton-docling --mode http --port 7701
```

The sidecar exposes a REST API on port 7701.

### MCP Mode (stdio)

```bash
tekton-docling --mode mcp
```

Communicates over JSON-RPC on stdin/stdout for MCP tool integration.

### Auto-start with Tekton

When `docling.enabled: true` in the config (default), Tekton's runtime will attempt to start the sidecar automatically on startup and stop it on shutdown.

## HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /health` | GET | Service status and capabilities |
| `GET /formats` | GET | List supported input formats |
| `POST /parse` | POST | Parse document to Markdown/HTML/JSON/DocTags |
| `POST /chunk` | POST | Chunk document into RAG-ready segments |
| `POST /ocr` | POST | OCR an image or scanned document |

### POST /parse

**Parameters (form-data):**
- `file` — Upload file (or `path` for local file path)
- `path` — Local file path (or `file` for upload)
- `output_format` — `markdown` | `html` | `json` | `doctags` (default: `markdown`)
- `ocr` — Enable OCR (default: `true`)
- `table_mode` — `accurate` | `fast` (default: `accurate`)

**Response:**
```json
{
  "source": "/path/to/document.pdf",
  "format": "markdown",
  "content": "# Document Title\n\n...",
  "success": true
}
```

## Supported Formats

| Format | Extension | OCR | Tables | Charts |
|--------|-----------|-----|--------|--------|
| PDF | .pdf | ✅ | ✅ | ✅ |
| Word | .docx | — | ✅ | — |
| Word (legacy) | .doc | ✅ | — | — |
| PowerPoint | .pptx | — | — | — |
| Excel | .xlsx | — | ✅ | — |
| OpenDocument Text | .odt | — | — | — |
| OpenDocument Presentation | .odp | — | — | — |
| OpenDocument Spreadsheet | .ods | — | ✅ | — |
| EPUB | .epub | — | — | — |
| RTF | .rtf | — | — | — |
| HTML | .html, .htm | — | — | — |
| LaTeX | .latex, .tex | — | — | — |
| PNG | .png | ✅ | — | — |
| JPEG | .jpg, .jpeg | ✅ | — | — |
| TIFF | .tiff | ✅ | — | — |
| BMP | .bmp | ✅ | — | — |
| USPTO Patents | .uspto | ✅ | — | — |
| JATS Articles | .jats | — | — | — |
| XBRL Reports | .xbrl | — | — | — |

## Configuration

Default config at `configs/docling.json`, copied to `~/.tekton/docling.json` on first run:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable Docling integration |
| `mode` | string | `"http"` | Server mode: `http` or `mcp` |
| `port` | number | `7701` | HTTP server port |
| `ocr.enabled` | boolean | `true` | Enable OCR for scanned pages |
| `ocr.engine` | string | `"easyocr"` | OCR engine: `easyocr` or `tesseract` |
| `ocr.languages` | array | `["en"]` | OCR language codes |
| `tables.mode` | string | `"accurate"` | Table extraction: `accurate` or `fast` |
| `vlm.enabled` | boolean | `false` | Enable visual language model |
| `vlm.model` | string | `"granite-docling"` | VLM model name |
| `chunking.default_max_tokens` | number | `512` | Default max tokens per chunk |
| `cache.enabled` | boolean | `true` | Cache results by file hash |
| `cache.dir` | string | `"~/.tekton/docling-cache"` | Cache directory |
| `cache.max_size_mb` | number | `500` | Max cache size in MB |
| `batch.max_concurrent` | number | `4` | Max concurrent batch jobs |

## Usage

### CLI Commands

```
/tekton:docling status    — Show sidecar status, version, capabilities
/tekton:docling parse <path> — Parse a document to Markdown
/tekton:docling start     — Start the sidecar service
/tekton:docling stop      — Stop the sidecar
/tekton:docling formats   — List supported input formats
/tekton:docling config    — Show current configuration
```

### Tool Invocation

```json
// Parse a document
{
  "tool": "docling_parse",
  "parameters": {
    "source": "/path/to/report.pdf",
    "output_format": "markdown",
    "ocr": true,
    "table_mode": "accurate"
  }
}

// Parse and chunk for RAG
{
  "tool": "docling_parse",
  "parameters": {
    "source": "/path/to/manual.pdf",
    "chunk": true,
    "max_chunk_tokens": 512
  }
}

// Batch parse
{
  "tool": "docling_batch",
  "parameters": {
    "sources": ["/path/to/doc1.pdf", "/path/to/doc2.docx"],
    "output_format": "markdown"
  }
}
```

### Automatic Routing

- `read_file("report.pdf")` → Detects `.pdf` extension, delegates to Docling
- `read_file("presentation.pptx")` → Detects `.pptx`, delegates to Docling
- `web_extract("https://example.com/doc.pdf")` → Detects binary Content-Type, delegates to Docling
- When Docling is not running → Falls back to plain text with a warning

## Troubleshooting

### Missing system dependencies for OCR
EasyOCR requires torch. If installation fails:
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -e "packages/docling-service[ocr]"
```

### GPU acceleration for VLM
For GraniteDocling visual language model:
```bash
pip install -e "packages/docling-service[vlm]"
# Ensure CUDA toolkit is installed for GPU
```

### Sidecar won't start
1. Check if port 7701 is already in use: `lsof -i:7701`
2. Check Python version: `python --version` (requires >= 3.10)
3. Check Docling installation: `python -m tekton_docling --version`

### Large PDFs causing memory issues
- Reduce `batch.max_concurrent` to 1 or 2
- Disable VLM if not needed
- Increase system memory or process smaller documents

## Performance Notes

- **Caching**: Results are cached by file hash (size + mtime) in `~/.tekton/docling-cache/`
- **Batch processing**: Up to 4 concurrent jobs by default; configurable via `batch.max_concurrent`
- **Memory usage**: Large PDFs (>100 pages) may require significant RAM; VLM mode requires GPU with 8GB+ VRAM
- **Health check**: The sidecar responds to `GET /health` within 3 seconds; Tekton caches health status for 30 seconds
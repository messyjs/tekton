# Tekton Docling Sidecar

Universal document parsing service for Tekton. Uses [Docling](https://github.com/DS4SD/docling) to convert PDF, DOCX, PPTX, XLSX, HTML, images, LaTeX, and scanned documents into clean Markdown, HTML, JSON, or DocTags.

## Installation

```bash
pip install -e ".[ocr]"
# Or with visual language model support:
pip install -e ".[ocr,vlm]"
```

## Running

### HTTP Mode (default, port 7701)

```bash
tekton-docling --mode http --port 7701
```

### MCP Mode (stdio)

```bash
tekton-docling --mode mcp
```

## API Endpoints (HTTP mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service status and capabilities |
| `/formats` | GET | List supported input formats |
| `/parse` | POST | Parse document to Markdown |
| `/chunk` | POST | Chunk document into segments |
| `/ocr` | POST | OCR an image file |

## Configuration

Copy `configs/docling.json` to `~/.tekton/docling.json` or let the service create defaults on first run.

## Graceful Fallback

When the sidecar is not running, Tekton's Node.js tools fall back to plain-text reads with a warning.
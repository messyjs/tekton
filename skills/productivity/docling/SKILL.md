---
name: docling
description: Parse, extract, and chunk documents (PDF, DOCX, PPTX, XLSX, images, LaTeX) into clean Markdown using Docling
version: 1.0.0
category: productivity
tags: [documents, pdf, ocr, tables, parsing, conversion]
requires_toolsets: [file]
config:
  ocr_languages:
    description: "OCR languages (ISO codes)"
    default: "en"
---

# Docling Document Intelligence Skill

Parse, extract, and chunk documents into clean structured Markdown using Tekton's Docling sidecar.

## Prerequisites

The Docling sidecar must be running:
```bash
pip install tekton-docling
tekton-docling --mode http --port 7701
```

Verify with: `/tekton:docling status`

## Usage Patterns

### Parse a single document
```bash
/tekton:docling parse report.pdf
/tekton:docling parse presentation.pptx --format html
```
Or use the `docling_parse` tool directly with parameters for `output_format`, `ocr`, `table_mode`, `chunk`, and `max_chunk_tokens`.

### Batch process a folder
Use `docling_batch` with an array of file paths:
```json
{
  "sources": ["/path/to/doc1.pdf", "/path/to/doc2.docx"],
  "output_format": "markdown"
}
```

### Extract tables from a PDF
The Docling converter's accurate table mode is enabled by default:
```json
{
  "source": "financials.pdf",
  "output_format": "markdown",
  "table_mode": "accurate"
}
```

### OCR a scanned image
```json
{
  "source": "scanned_invoice.png",
  "ocr": true,
  "output_format": "markdown"
}
```

### Chunk for RAG ingestion
```json
{
  "source": "manual.pdf",
  "chunk": true,
  "max_chunk_tokens": 512
}
```
Returns structured segments with metadata (headings, page numbers) for embedding.

### Convert between formats
```json
{
  "source": "dataset.xlsx",
  "output_format": "json"
}
```

## Supported Formats

| Extension | Description | OCR | Tables |
|-----------|-------------|-----|--------|
| .pdf | PDF documents | ✅ | ✅ |
| .docx | Word documents | — | ✅ |
| .pptx | PowerPoint | — | ✅ |
| .xlsx | Excel spreadsheets | — | ✅ |
| .doc | Legacy Word | ✅ | — |
| .html/.htm | HTML pages | — | — |
| .odt/.odp/.ods | OpenDocument | — | — |
| .epub | E-books | — | — |
| .rtf | Rich Text | — | — |
| .latex/.tex | LaTeX | — | — |
| .png/.jpg/.tiff | Images | ✅ | — |

## Configuration

Edit `~/.tekton/docling.json`:
- `ocr.enabled` — Enable OCR (default: true)
- `ocr.engine` — "easyocr" or "tesseract"
- `tables.mode` — "accurate" or "fast"
- `vlm.enabled` — Enable visual language model
- `cache.enabled` — Cache parsed results by file hash

## Graceful Fallback

When the Docling sidecar is not running:
- `read_file` falls back to plain-text read with a warning
- `docling_parse` and `docling_batch` return an error message with install instructions
- `web_extract` on binary URLs returns a message asking to install Docling
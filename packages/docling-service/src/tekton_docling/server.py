"""FastAPI + MCP dual-mode server for Tekton Docling sidecar.

Usage:
    tekton-docling --mode http --port 7701   # HTTP API server
    tekton-docling --mode mcp                # stdio MCP server
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path
from typing import Any, Literal

from .config import load_config
from .converter import TektonDocConverter
from .export import ExportFormat, export_document


# ── Globals (initialized on startup) ────────────────────────────────

_converter: TektonDocConverter | None = None
_config: dict[str, Any] = {}


def get_converter() -> TektonDocConverter:
    global _converter
    if _converter is None:
        _converter = TektonDocConverter(
            ocr_enabled=_config.get("ocr", {}).get("enabled", True),
            table_mode=_config.get("tables", {}).get("mode", "accurate"),
            vlm_enabled=_config.get("vlm", {}).get("enabled", False),
            cache_enabled=_config.get("cache", {}).get("enabled", True),
        )
    return _converter


# ── HTTP Server ──────────────────────────────────────────────────────

def create_app() -> "FastAPI":
    """Create the FastAPI application."""
    from fastapi import FastAPI, UploadFile, File, Form, HTTPException
    from fastapi.responses import JSONResponse

    app = FastAPI(title="Tekton Docling Sidecar", version="1.0.0")

    @app.get("/health")
    async def health():
        cap = {
            "ocr": _config.get("ocr", {}).get("enabled", True),
            "tables": True,
            "vlm": _config.get("vlm", {}).get("enabled", False),
            "cache": _config.get("cache", {}).get("enabled", True),
        }
        return {
            "status": "ok",
            "service": "tekton-docling",
            "version": "1.0.0",
            "capabilities": cap,
        }

    @app.get("/formats")
    async def formats():
        return {
            "formats": [
                {"extension": ".pdf", "description": "PDF documents", "ocr": True, "tables": True},
                {"extension": ".docx", "description": "Word documents"},
                {"extension": ".pptx", "description": "PowerPoint presentations"},
                {"extension": ".xlsx", "description": "Excel spreadsheets"},
                {"extension": ".doc", "description": "Legacy Word (via OCR)"},
                {"extension": ".html", "description": "HTML pages"},
                {"extension": ".htm", "description": "HTML pages"},
                {"extension": ".odt", "description": "OpenDocument Text"},
                {"extension": ".odp", "description": "OpenDocument Presentation"},
                {"extension": ".ods", "description": "OpenDocument Spreadsheet"},
                {"extension": ".epub", "description": "EPUB ebooks"},
                {"extension": ".rtf", "description": "Rich Text Format"},
                {"extension": ".latex", "description": "LaTeX"},
                {"extension": ".tex", "description": "TeX"},
                {"extension": ".png", "description": "PNG images", "ocr": True},
                {"extension": ".jpg", "description": "JPEG images", "ocr": True},
                {"extension": ".jpeg", "description": "JPEG images", "ocr": True},
                {"extension": ".tiff", "description": "TIFF images", "ocr": True},
                {"extension": ".bmp", "description": "BMP images", "ocr": True},
                {"extension": ".uspto", "description": "USPTO patents"},
                {"extension": ".jats", "description": "JATS articles"},
                {"extension": ".xbrl", "description": "XBRL reports"},
                {"extension": ".aspx", "description": "ASPX web pages"},
            ]
        }

    @app.post("/parse")
    async def parse(
        file: UploadFile | None = File(default=None),
        path: str = Form(default=""),
        output_format: str = Form(default="markdown"),
        ocr: bool = Form(default=True),
        table_mode: str = Form(default="accurate"),
    ):
        source = path or (await _save_upload(file) if file else "")
        if not source:
            raise HTTPException(status_code=400, detail="Provide 'file' upload or 'path' parameter")

        try:
            conv = get_converter()
            fmt: ExportFormat = output_format if output_format in ("markdown", "html", "json", "doctags") else "markdown"
            content = export_document(conv, source, output_format=fmt)
            return {"source": source, "format": fmt, "content": content, "success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/chunk")
    async def chunk(
        file: UploadFile | None = File(default=None),
        path: str = Form(default=""),
        max_tokens: int = Form(default=512),
    ):
        source = path or (await _save_upload(file) if file else "")
        if not source:
            raise HTTPException(status_code=400, detail="Provide 'file' upload or 'path' parameter")

        try:
            conv = get_converter()
            chunks = conv.to_chunks(source, max_tokens=max_tokens)
            return {"source": source, "chunks": chunks, "count": len(chunks), "success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/ocr")
    async def ocr_endpoint(
        file: UploadFile | None = File(default=None),
        path: str = Form(default=""),
    ):
        source = path or (await _save_upload(file) if file else "")
        if not source:
            raise HTTPException(status_code=400, detail="Provide 'file' upload or 'path' parameter")

        try:
            conv = get_converter()
            text = conv.to_markdown(source)
            return {"source": source, "text": text, "success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return app


async def _save_upload(file: UploadFile) -> str:
    """Save an uploaded file to a temp location and return the path."""
    suffix = Path(file.filename or "upload").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    content = await file.read()
    tmp.write(content)
    tmp.close()
    return tmp.name


# ── MCP Server (stdio) ──────────────────────────────────────────────

def run_mcp_server() -> None:
    """Run as a stdio MCP server with tool handlers."""
    # Simple JSON-RPC over stdio for MCP protocol
    # Docling exposes: docling_parse, docling_chunk, docling_ocr, docling_export

    def handle_request(request: dict) -> dict:
        method = request.get("method", "")
        req_id = request.get("id")
        params = request.get("params", {})

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "tekton-docling", "version": "1.0.0"},
                },
            }

        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "tools": [
                        {
                            "name": "docling_parse",
                            "description": "Parse a document into clean Markdown/HTML/JSON/DocTags using Docling",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string", "description": "File path or URL"},
                                    "output_format": {"type": "string", "enum": ["markdown", "html", "json", "doctags"], "default": "markdown"},
                                    "ocr": {"type": "boolean", "default": True},
                                    "table_mode": {"type": "string", "enum": ["fast", "accurate"], "default": "accurate"},
                                },
                                "required": ["source"],
                            },
                        },
                        {
                            "name": "docling_chunk",
                            "description": "Chunk a document into RAG-ready segments with metadata",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string", "description": "File path or URL"},
                                    "max_tokens": {"type": "integer", "default": 512},
                                },
                                "required": ["source"],
                            },
                        },
                        {
                            "name": "docling_ocr",
                            "description": "OCR an image or scanned document",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string", "description": "Image file path"},
                                },
                                "required": ["source"],
                            },
                        },
                        {
                            "name": "docling_export",
                            "description": "Export a document to a specified format",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "source": {"type": "string", "description": "File path or URL"},
                                    "output_format": {"type": "string", "enum": ["markdown", "html", "json", "doctags"], "default": "markdown"},
                                },
                                "required": ["source"],
                            },
                        },
                    ]
                },
            }

        elif method == "tools/call":
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            try:
                conv = get_converter()
                if tool_name == "docling_parse":
                    source = tool_args["source"]
                    fmt = tool_args.get("output_format", "markdown")
                    content = export_document(conv, source, output_format=fmt)
                    result_text = content if len(content) <= 50000 else content[:50000] + "\n\n[...truncated]"
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {"content": [{"type": "text", "text": result_text}]},
                    }
                elif tool_name == "docling_chunk":
                    source = tool_args["source"]
                    max_tokens = tool_args.get("max_tokens", 512)
                    chunks = conv.to_chunks(source, max_tokens=max_tokens)
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {"content": [{"type": "text", "text": json.dumps(chunks, default=str)}]},
                    }
                elif tool_name == "docling_ocr":
                    source = tool_args["source"]
                    text = conv.to_markdown(source)
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {"content": [{"type": "text", "text": text}]},
                    }
                elif tool_name == "docling_export":
                    source = tool_args["source"]
                    fmt = tool_args.get("output_format", "markdown")
                    content = export_document(conv, source, output_format=fmt)
                    result_text = content if len(content) <= 50000 else content[:50000] + "\n\n[...truncated]"
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {"content": [{"type": "text", "text": result_text}]},
                    }
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
                    }
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {"content": [{"type": "text", "text": f"Error: {str(e)}"}], "isError": True},
                }

        # notifications (no id) — just ack
        if req_id is None:
            return {"jsonrpc": "2.0", "result": {}}

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown method: {method}"},
        }

    # Read JSON-RPC from stdin, write to stdout
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except json.JSONDecodeError:
            sys.stderr.write(f"Invalid JSON: {line}\n")


# ── CLI Entry Point ─────────────────────────────────────────────────

def main() -> None:
    global _config
    parser = argparse.ArgumentParser(description="Tekton Docling Sidecar")
    parser.add_argument("--mode", choices=["http", "mcp"], default="http", help="Server mode: http or mcp (stdio)")
    parser.add_argument("--port", type=int, default=7701, help="HTTP server port (default: 7701)")
    parser.add_argument("--host", default="127.0.0.1", help="HTTP server host (default: 127.0.0.1)")
    args = parser.parse_args()

    _config = load_config()

    if args.mode == "http":
        import uvicorn
        app = create_app()
        uvicorn.run(app, host=args.host, port=args.port)
    elif args.mode == "mcp":
        run_mcp_server()


if __name__ == "__main__":
    main()
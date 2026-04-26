"""FastAPI + MCP dual-mode server for Tekton Browser Use sidecar.

Usage:
    tekton-browser-use --mode http --port 7702   # HTTP API server
    tekton-browser-use --mode mcp                # stdio MCP server
"""
from __future__ import annotations
import argparse
import asyncio
import json
import sys
import uuid
from typing import Any
from .config import load_config

_config: dict[str, Any] = {}
_tasks: dict[str, dict[str, Any]] = {}
_running_task_id: str | None = None

def _get_llm(config: dict[str, Any]):
    llm_cfg = config.get("llm", {})
    provider = llm_cfg.get("provider", "openai")
    model = llm_cfg.get("model", "gpt-4o-mini")
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, temperature=0.0)
    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, temperature=0.0)
    elif provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model, temperature=0.0)
    elif provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(model=model, temperature=0.0)
    else:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, temperature=0.0)

async def _run_task(task_id: str, task_description: str, max_steps: int) -> None:
    global _running_task_id
    task_info = _tasks[task_id]
    _running_task_id = task_id
    try:
        from browser_use import Agent, Browser, BrowserConfig
        llm = _get_llm(_config)
        browser_cfg = BrowserConfig(
            headless=_config.get("browser", {}).get("headless", True),
            disable_security=_config.get("browser", {}).get("disable_security", False),
        )
        browser = Browser(config=browser_cfg)
        agent = Agent(task=task_description, llm=llm, browser=browser, max_steps=max_steps)
        result = await agent.run()
        task_info["status"] = "completed"
        task_info["result"] = str(result) if result else "Task completed"
        task_info["success"] = True
        await browser.close()
    except ImportError:
        task_info["status"] = "failed"
        task_info["result"] = "browser-use not installed. Run: pip install browser-use && browser-use install"
        task_info["success"] = False
    except Exception as e:
        task_info["status"] = "failed"
        task_info["result"] = str(e)
        task_info["success"] = False
    finally:
        _running_task_id = None

def create_app():
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import Response
    app = FastAPI(title="Tekton Browser Use Sidecar", version="1.0.0")

    @app.get("/health")
    async def health():
        browser_available = False
        try:
            from browser_use import Browser
            browser_available = True
        except ImportError:
            pass
        llm_provider = _config.get("llm", {}).get("provider", "openai")
        llm_model = _config.get("llm", {}).get("model", "gpt-4o-mini")
        return {"status": "ok", "service": "tekton-browser-use", "version": "1.0.0",
                "browser_available": browser_available, "llm": {"provider": llm_provider, "model": llm_model},
                "running_task": _running_task_id}

    @app.post("/task")
    async def submit_task(request: dict):
        task_description = request.get("task", "")
        if not task_description:
            raise HTTPException(status_code=400, detail="Missing 'task' field")
        if _running_task_id:
            raise HTTPException(status_code=409, detail=f"Task {_running_task_id} is already running")
        task_id = str(uuid.uuid4())[:8]
        max_steps = request.get("max_steps", _config.get("max_steps", 50))
        _tasks[task_id] = {"task_id": task_id, "task": task_description, "status": "running", "result": None, "success": None, "max_steps": max_steps}
        asyncio.create_task(_run_task(task_id, task_description, max_steps))
        return {"task_id": task_id, "status": "running", "message": "Task started"}

    @app.get("/task/{task_id}")
    async def get_task(task_id: str):
        if task_id not in _tasks:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        return _tasks[task_id]

    @app.post("/cancel")
    async def cancel_task():
        global _running_task_id
        if not _running_task_id:
            return {"message": "No task running"}
        task_id = _running_task_id
        _tasks[task_id]["status"] = "cancelled"
        _tasks[task_id]["result"] = "Task cancelled by user"
        _running_task_id = None
        return {"task_id": task_id, "status": "cancelled"}

    @app.get("/screenshot")
    async def screenshot():
        try:
            from browser_use import Browser, BrowserConfig
            browser_cfg = BrowserConfig(headless=True)
            browser = Browser(config=browser_cfg)
            context = await browser.new_context()
            page = await context.get_current_page()
            screenshot_bytes = await page.screenshot()
            await browser.close()
            return Response(content=screenshot_bytes, media_type="image/png")
        except ImportError:
            raise HTTPException(status_code=503, detail="browser-use not installed")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/tasks")
    async def list_tasks():
        return {"tasks": list(_tasks.values())}

    return app

def run_mcp_server() -> None:
    async def _handle_task(task_description: str, max_steps: int = 50) -> str:
        task_id = str(uuid.uuid4())[:8]
        _tasks[task_id] = {"task_id": task_id, "task": task_description, "status": "running", "result": None, "success": None, "max_steps": max_steps}
        await _run_task(task_id, task_description, max_steps)
        result = _tasks[task_id]
        return json.dumps(result, default=str)

    def handle_request(request: dict) -> dict:
        method = request.get("method", "")
        req_id = request.get("id")
        params = request.get("params", {})
        if method == "initialize":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "serverInfo": {"name": "tekton-browser-use", "version": "1.0.0"}}}
        elif method == "tools/list":
            return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": [
                {"name": "browser_task", "description": "Submit a web browsing task for the AI agent to execute autonomously", "inputSchema": {"type": "object", "properties": {"task": {"type": "string", "description": "Description of what to do on the web"}, "max_steps": {"type": "integer", "default": 50}}, "required": ["task"]}},
                {"name": "browser_status", "description": "Check browser-use sidecar status", "inputSchema": {"type": "object", "properties": {}}}]}}
        elif method == "tools/call":
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            try:
                if tool_name == "browser_task":
                    import asyncio
                    result = asyncio.get_event_loop().run_until_complete(_handle_task(tool_args.get("task", ""), tool_args.get("max_steps", 50)))
                    return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": result}]}}
                elif tool_name == "browser_status":
                    browser_available = False
                    try:
                        import browser_use
                        browser_available = True
                    except ImportError:
                        pass
                    status = json.dumps({"service": "tekton-browser-use", "browser_available": browser_available})
                    return {"jsonrpc": "2.0", "id": req_id, "re

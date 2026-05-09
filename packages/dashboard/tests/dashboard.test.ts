/**
 * Dashboard Package Tests — Server, API, Types, SPA generation.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import { DashboardServer } from "../src/server/server.js";
import { DashboardAPI } from "../src/server/api.js";
import { generateDashboardHTML } from "../src/server/spa.js";
import { ChatManager } from "../src/server/chat.js";
import { DEFAULT_DASHBOARD_CONFIG, DASHBOARD_PAGES } from "../src/server/types.js";

// ── Types & Constants ────────────────────────────────────────────────

describe("Dashboard Types & Constants", () => {
  it("has correct DEFAULT_DASHBOARD_CONFIG", () => {
    expect(DEFAULT_DASHBOARD_CONFIG.port).toBe(7700);
    expect(DEFAULT_DASHBOARD_CONFIG.host).toBe("127.0.0.1");
    expect(DEFAULT_DASHBOARD_CONFIG.autoStart).toBe(false);
    expect(DEFAULT_DASHBOARD_CONFIG.refreshIntervalMs).toBe(5000);
    expect(DEFAULT_DASHBOARD_CONFIG.theme).toBe("dark");
  });

  it("DASHBOARD_PAGES has all expected pages", () => {
    const ids = DASHBOARD_PAGES.map(p => p.id);
    expect(ids).toContain("status");
    expect(ids).toContain("sessions");
    expect(ids).toContain("skills");
    expect(ids).toContain("terminal");
    expect(ids).toContain("files");
    expect(ids).toContain("kanban");
    expect(ids).toContain("swarm");
    expect(ids).toContain("routing");
    expect(ids).toContain("analytics");
    expect(ids).toContain("scp-traffic");
    expect(ids).toContain("config");
    expect(ids).toContain("training");
    expect(ids).toContain("memory");
    expect(ids).toContain("gateway");
    expect(ids).toContain("documents");
    expect(ids).toContain("forge");
    expect(ids).toContain("trading");
    expect(ids).toContain("conductor");
    expect(ids).toContain("models");
    expect(ids.length).toBe(20);
  });

  it("each page has icon and label", () => {
    for (const page of DASHBOARD_PAGES) {
      expect(page.id).toBeTruthy();
      expect(page.label).toBeTruthy();
      expect(page.icon).toBeTruthy();
      expect(page.icon.length).toBeGreaterThan(0);
    }
  });
});

// ── Dashboard API ────────────────────────────────────────────────────

describe("DashboardAPI", () => {
  let api: DashboardAPI;

  beforeEach(() => {
    api = new DashboardAPI();
  });

  it("creates API instance", () => {
    expect(api).toBeDefined();
  });

  it("getStatus returns default structure", async () => {
    // Create a mock Hono context
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getStatus(mockContext);
    const data = await response.json();
    expect(data.version).toBe("0.1.0");
    expect(data).toHaveProperty("uptimeMs");
    expect(data).toHaveProperty("model");
    expect(data).toHaveProperty("tokens");
    expect(data).toHaveProperty("compression");
    expect(data).toHaveProperty("skills");
    expect(data).toHaveProperty("agents");
    expect(data).toHaveProperty("learning");
    expect(data).toHaveProperty("gateway");
    expect(data).toHaveProperty("voice");
  });

  it("getSessions returns empty list without agent pool", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getSessions(mockContext);
    const data = await response.json();
    expect(data.sessions).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("getSkills returns empty list without skill manager", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getSkills(mockContext);
    const data = await response.json();
    expect(data.skills).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("getConfig returns default config", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getConfig(mockContext);
    const data = await response.json();
    expect(data.config).toBeDefined();
    expect(data.config.identity).toBeDefined();
    expect(data.config.models).toBeDefined();
  });

  it("getGatewayStatus returns empty when no gateway", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getGatewayStatus(mockContext);
    const data = await response.json();
    expect(data.running).toBe(false);
    expect(data.platforms).toEqual({});
  });

  it("getVoiceStatus returns default when no voice manager", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getVoiceStatus(mockContext);
    const data = await response.json();
    expect(data.enabled).toBe(false);
  });

  it("getRoutingLog returns empty array without telemetry", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getRoutingLog(mockContext);
    const data = await response.json();
    expect(data.entries).toEqual([]);
  });

  it("getAnalyticsTokens returns empty without telemetry", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getAnalyticsTokens(mockContext);
    const data = await response.json();
    expect(data.entries).toEqual([]);
    expect(data.totalTokens).toBe(0);
    expect(data.totalCost).toBe(0);
  });

  it("getTrainingStatus returns empty", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getTrainingStatus(mockContext);
    const data = await response.json();
    expect(data.running).toBe(false);
    expect(data.jobs).toEqual([]);
  });

  it("getMemory returns empty without memory manager", async () => {
    const mockJson = (data: any) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
    const mockContext = { json: mockJson, req: { param: () => "" } } as any;
    const response = api.getMemory(mockContext);
    const data = await response.json();
    expect(data.memory).toBe("");
    expect(data.userModel).toBe("");
    expect(data.sessions).toEqual([]);
  });
});

// ── ChatManager Tests ──────────────────────────────────────────────

describe("ChatManager", () => {
  it("creates a chat manager with default config", () => {
    const chat = new ChatManager();
    const config = chat.getConfig();
    expect(config.model).toBeDefined();
    expect(config.provider).toBeDefined();
    expect(config.maxTokens).toBe(4096);
    expect(config.temperature).toBe(0.3);
  });

  it("creates and lists conversations", () => {
    const chat = new ChatManager();
    const conv = chat.createConversation("Test Chat");
    expect(conv.id).toMatch(/^conv-/);
    expect(conv.title).toBe("Test Chat");

    const list = chat.listConversations();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(conv.id);
    expect(list[0].title).toBe("Test Chat");
  });

  it("creates conversation with auto-title", () => {
    const chat = new ChatManager();
    const conv = chat.createConversation();
    expect(conv.title).toBe("New Chat");
  });

  it("gets conversation by id", () => {
    const chat = new ChatManager();
    const conv = chat.createConversation("Find Me");
    const found = chat.getConversation(conv.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Find Me");
  });

  it("deletes conversation", () => {
    const chat = new ChatManager();
    const conv = chat.createConversation("Delete Me");
    const deleted = chat.deleteConversation(conv.id);
    expect(deleted).toBe(true);
    expect(chat.getConversation(conv.id)).toBeUndefined();
    expect(chat.listConversations()).toHaveLength(0);
  });

  it("updates config", () => {
    const chat = new ChatManager();
    const updated = chat.updateConfig({ model: "llama3:8b", temperature: 0.7 });
    expect(updated.model).toBe("llama3:8b");
    expect(updated.temperature).toBe(0.7);
  });

  it("limits conversation history to 50", () => {
    const chat = new ChatManager();
    for (let i = 0; i < 55; i++) {
      chat.createConversation(`Chat ${i}`);
    }
    const list = chat.listConversations();
    expect(list.length).toBeLessThanOrEqual(50);
  });

  it("sets active conversation", () => {
    const chat = new ChatManager();
    const conv = chat.createConversation("Active");
    chat.setActiveConversation(conv.id);
    const active = chat.getActiveConversation();
    expect(active).toBeDefined();
    expect(active!.title).toBe("Active");
  });

  it("ChatManager has stream-capable methods", () => {
    const chat = new ChatManager();
    expect(chat.createConversation).toBeDefined();
    expect(chat.getConfig).toBeDefined();
    expect(chat.sendMessage).toBeDefined();
    expect(chat.listConversations).toBeDefined();
  });
});

// ── TerminalManager Tests ──────────────────────────────────────────

import { TerminalManager } from "../src/server/terminal.js";

describe("TerminalManager", () => {
  it("creates a terminal manager", () => {
    const tm = new TerminalManager();
    expect(tm).toBeDefined();
  });

  it("reports availability status", () => {
    const tm = new TerminalManager();
    const stats = tm.getStats();
    expect(stats).toHaveProperty("available");
    expect(stats).toHaveProperty("activeSessions");
  });

  it("starts with zero sessions", () => {
    const tm = new TerminalManager();
    expect(tm.listSessions()).toEqual([]);
    expect(tm.getStats().activeSessions).toBe(0);
  });

  it("creates and lists a session", () => {
    const tm = new TerminalManager();
    const result = tm.createSession({ cols: 100, rows: 30 });
    if ("error" in result) {
      expect(result.error).toContain("node-pty");
    } else {
      expect(result.session.id).toMatch(/^term_/);
      expect(result.session.shell).toBeTruthy();
      expect(tm.listSessions()).toHaveLength(1);
      tm.killAll();
    }
  });

  it("kills a session", () => {
    const tm = new TerminalManager();
    const result = tm.createSession();
    if (!("error" in result)) {
      const id = result.session.id;
      expect(tm.kill(id)).toBe(true);
      expect(tm.listSessions()).toHaveLength(0);
    }
  });

  it("killAll removes all sessions", () => {
    const tm = new TerminalManager();
    const r1 = tm.createSession();
    const r2 = tm.createSession();
    if (!("error" in r1) && !("error" in r2)) {
      expect(tm.listSessions()).toHaveLength(2);
      const count = tm.killAll();
      expect(count).toBe(2);
      expect(tm.listSessions()).toHaveLength(0);
    }
  });

  it("returns false for nonexistent session operations", () => {
    const tm = new TerminalManager();
    expect(tm.write("nonexistent", "test")).toBe(false);
    expect(tm.resize("nonexistent", 80, 24)).toBe(false);
    expect(tm.kill("nonexistent")).toBe(false);
  });
});

// ── FileManager Tests ───────────────────────────────────────────────

import { FileManager } from "../src/server/files.js";

describe("FileManager", () => {
  it("creates a file manager with default root", () => {
    const fm = new FileManager();
    expect(fm).toBeDefined();
    expect(fm.getRootDir()).toBeTruthy();
  });

  it("lists the root directory", () => {
    const fm = new FileManager();
    const entries = fm.listDirectory(".");
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    // Root should have package.json
    const pkg = entries.find(e => e.name === "package.json");
    expect(pkg).toBeDefined();
    expect(pkg?.type).toBe("file");
  });

  it("lists subdirectories", () => {
    const fm = new FileManager();
    const entries = fm.listDirectory("packages");
    expect(entries.length).toBeGreaterThan(0);
    const core = entries.find(e => e.name === "core");
    expect(core).toBeDefined();
    expect(core?.type).toBe("directory");
  });

  it("reads a file", () => {
    const fm = new FileManager();
    const content = fm.readFile("package.json");
    expect(content.path).toBe("package.json");
    expect(content.encoding).toBe("utf-8");
    expect(content.language).toBe("json");
    expect(content.content).toContain("name");
  });

  it("writes and deletes a file", () => {
    const fm = new FileManager();
    const testPath = "test-fm-write.txt";
    const result = fm.writeFile(testPath, "hello test", "utf-8");
    expect(result.path).toBe(testPath);
    expect(result.size).toBeGreaterThan(0);

    // Read it back
    const read = fm.readFile(testPath);
    expect(read.content).toBe("hello test");

    // Delete it
    const del = fm.deletePath(testPath);
    expect(del.success).toBe(true);

    // Verify deleted
    expect(() => fm.readFile(testPath)).toThrow();
  });

  it("creates a directory and deletes it", () => {
    const fm = new FileManager();
    const testDir = "test-fm-dir";
    const result = fm.createDirectory(testDir);
    expect(result.success).toBe(true);

    // Verify it exists as a directory
    const stat = fm.statPath(testDir);
    expect(stat.isDirectory).toBe(true);

    // Delete it
    const del = fm.deletePath(testDir);
    expect(del.success).toBe(true);
  });

  it("renames a file", () => {
    const fm = new FileManager();
    const testPath1 = "test-fm-rename1.txt";
    const testPath2 = "test-fm-rename2.txt";
    fm.writeFile(testPath1, "rename test");

    const result = fm.renamePath(testPath1, testPath2);
    expect(result.success).toBe(true);

    // Old path gone, new path readable
    expect(() => fm.readFile(testPath1)).toThrow();
    const content = fm.readFile(testPath2);
    expect(content.content).toBe("rename test");

    // Cleanup
    fm.deletePath(testPath2);
  });

  it("prevents path traversal", () => {
    const fm = new FileManager();
    expect(() => fm.readFile("../../../etc/passwd")).toThrow(/traversal/i);
    expect(() => fm.listDirectory("../../.."))
      .toThrow(/traversal/i);
  });

  it("detects file language", () => {
    const fm = new FileManager();
    const ts = fm.readFile("packages/core/src/index.ts");
    expect(ts.language).toBe("typescript");
    const json = fm.readFile("package.json");
    expect(json.language).toBe("json");
  });
});

// ── SPA Generation ────────────────────────────────────────────────────

describe("SPA Generation", () => {
  it("generates HTML with all pages", () => {
    const html = generateDashboardHTML(DEFAULT_DASHBOARD_CONFIG);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Tekton Dashboard");
    expect(html).toContain("Status");
    expect(html).toContain("Sessions");
    expect(html).toContain("Skills");
    expect(html).toContain("Routing");
    expect(html).toContain("Analytics");
    expect(html).toContain("SCP Traffic");
    expect(html).toContain("Config");
    expect(html).toContain("Training");
    expect(html).toContain("Memory");
    expect(html).toContain("Gateway");
    expect(html).toContain("Terminal");
  });

  it("includes refresh interval from config", () => {
    const html = generateDashboardHTML({ ...DEFAULT_DASHBOARD_CONFIG, refreshIntervalMs: 10000 });
    expect(html).toContain("10000");
  });

  it("includes React and Tailwind CDN", () => {
    const html = generateDashboardHTML(DEFAULT_DASHBOARD_CONFIG);
    expect(html).toContain("react@18");
    expect(html).toContain("react-dom@18");
    expect(html).toContain("tailwindcss");
  });

  it("has dark theme styling", () => {
    const html = generateDashboardHTML(DEFAULT_DASHBOARD_CONFIG);
    expect(html).toContain("#0a0f1a");
    expect(html).toContain("#161b22");
  });
});

// ── Dashboard Server Integration ──────────────────────────────────────

describe("DashboardServer", () => {
  it("creates server with default config", () => {
    const server = new DashboardServer();
    expect(server.config.port).toBe(7700);
    expect(server.config.host).toBe("127.0.0.1");
    expect(server.getUrl()).toBe("http://127.0.0.1:7700");
  });

  it("creates server with custom config", () => {
    const server = new DashboardServer({ port: 8080, host: "0.0.0.0" });
    expect(server.config.port).toBe(8080);
    expect(server.config.host).toBe("0.0.0.0");
    expect(server.getUrl()).toBe("http://0.0.0.0:8080");
  });

  it("starts and stops server", async () => {
    const server = new DashboardServer({ port: 7891 });
    await server.start();
    // Verify server is responding
    const res = await fetch("http://127.0.0.1:7891/api/status");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.version).toBe("0.1.0");

    // Verify SPA is served
    const spaRes = await fetch("http://127.0.0.1:7891/");
    expect(spaRes.status).toBe(200);
    const html = await spaRes.text();
    expect(html).toContain("Tekton Dashboard");

    await server.stop();
  });

  it("serves API endpoints", async () => {
    const server = new DashboardServer({ port: 7892 });
    await server.start();

    const endpoints = [
      "/api/status",
      "/api/sessions",
      "/api/skills",
      "/api/routing/log",
      "/api/routing/rules",
      "/api/analytics/tokens",
      "/api/analytics/compression",
      "/api/analytics/cost",
      "/api/scp/traffic",
      "/api/config",
      "/api/training/status",
      "/api/memory",
      "/api/gateway/status",
      "/api/voice/status",
      "/api/models",
    ];

    for (const endpoint of endpoints) {
      const res = await fetch(`http://127.0.0.1:7892${endpoint}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toBeDefined();
    }

    await server.stop();
  });

  it("POST memory search works", async () => {
    const server = new DashboardServer({ port: 7893 });
    await server.start();

    const res = await fetch("http://127.0.0.1:7893/api/memory/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results).toBeDefined();

    await server.stop();
  });

  it("GET /api/models returns provider catalog", async () => {
    const server = new DashboardServer({ port: 7894 });
    await server.start();

    const res = await fetch("http://127.0.0.1:7894/api/models");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.providers).toBeDefined();
    expect(data.totalModels).toBeGreaterThan(0);
    expect(data.providers.length).toBeGreaterThan(0);
    // Check Ollama is present with our models
    const ollama = data.providers.find((p: any) => p.id === "ollama");
    expect(ollama).toBeDefined();
    expect(ollama.models.length).toBeGreaterThanOrEqual(10); // 10 models on workstation
    // Verify models are in the catalog
    const ollamaIds = ollama.models.map((m: any) => m.id);
    expect(ollamaIds).toContain("gemma4:26b");
    expect(ollamaIds).toContain("glm-4.7-flash:latest");
    expect(ollamaIds).toContain("granite4.1:8b");

    await server.stop();
  });
});

import { KanbanManager } from "../src/server/kanban.js";
import path from "node:path";
import os from "node:os";

describe("KanbanManager", () => {
  let km: KanbanManager;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `kanban-test-${Date.now()}`);
    km = new KanbanManager(tmpDir);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  it("creates a board", () => {
    const board = km.createBoard("Test Board", "A test board");
    expect(board.id).toMatch(/^board_/);
    expect(board.title).toBe("Test Board");
    expect(board.description).toBe("A test board");
    expect(board.cards).toHaveLength(0);
    expect(board.lanes).toEqual(["backlog", "ready", "running", "review", "done"]);
  });

  it("lists boards", () => {
    km.createBoard("Board 1");
    km.createBoard("Board 2");
    const boards = km.listBoards();
    expect(boards).toHaveLength(2);
    expect(boards.map(b => b.title)).toContain("Board 1");
    expect(boards.map(b => b.title)).toContain("Board 2");
  });

  it("gets a board by ID", () => {
    const created = km.createBoard("My Board");
    const fetched = km.getBoard(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe("My Board");
  });

  it("returns undefined for nonexistent board", () => {
    expect(km.getBoard("nonexistent")).toBeUndefined();
  });

  it("deletes a board", () => {
    const board = km.createBoard("To Delete");
    expect(km.deleteBoard(board.id)).toBe(true);
    expect(km.getBoard(board.id)).toBeUndefined();
  });

  it("adds a card to a board", () => {
    const board = km.createBoard("Card Test");
    const card = km.addCard(board.id, {
      title: "My Task",
      description: "Do something",
      lane: "backlog",
      priority: 2,
      tags: ["feature", "urgent"],
    });
    expect(card).toBeDefined();
    expect(card!.id).toMatch(/^card_/);
    expect(card!.title).toBe("My Task");
    expect(card!.lane).toBe("backlog");
    expect(card!.priority).toBe(2);
    expect(card!.tags).toEqual(["feature", "urgent"]);
  });

  it("moves a card between lanes", () => {
    const board = km.createBoard("Move Test");
    const card = km.addCard(board.id, { title: "Move Me", lane: "backlog" });
    const moved = km.moveCard(board.id, card!.id, "running");
    expect(moved).toBeDefined();
    expect(moved!.lane).toBe("running");
  });

  it("updates a card", () => {
    const board = km.createBoard("Update Test");
    const card = km.addCard(board.id, { title: "Original" });
    const updated = km.updateCard(board.id, card!.id, { title: "Updated", priority: 3 });
    expect(updated).toBeDefined();
    expect(updated!.title).toBe("Updated");
    expect(updated!.priority).toBe(3);
  });

  it("deletes a card", () => {
    const board = km.createBoard("Delete Card Test");
    const card = km.addCard(board.id, { title: "Bye" });
    expect(km.deleteCard(board.id, card!.id)).toBe(true);
    const fetched = km.getBoard(board.id);
    expect(fetched!.cards).toHaveLength(0);
  });

  it("gets cards by lane", () => {
    const board = km.createBoard("Lane Test");
    km.addCard(board.id, { title: "Task 1", lane: "backlog" });
    km.addCard(board.id, { title: "Task 2", lane: "backlog" });
    km.addCard(board.id, { title: "Task 3", lane: "running" });
    const backlog = km.getCardsByLane(board.id, "backlog");
    expect(backlog).toHaveLength(2);
    const running = km.getCardsByLane(board.id, "running");
    expect(running).toHaveLength(1);
  });

  it("sets completedAt when card moves to done", () => {
    const board = km.createBoard("Done Test");
    const card = km.addCard(board.id, { title: "Finish Me", lane: "backlog" });
    const done = km.moveCard(board.id, card!.id, "done");
    expect(done!.completedAt).toBeTruthy();
  });

  it("persists boards to disk", () => {
    const board = km.createBoard("Persist Test");
    km.addCard(board.id, { title: "Persist Me", lane: "ready" });

    // Create a fresh manager to read from disk
    const km2 = new KanbanManager(tmpDir);
    const loaded = km2.getBoard(board.id);
    expect(loaded).toBeDefined();
    expect(loaded!.title).toBe("Persist Test");
    expect(loaded!.cards).toHaveLength(1);
    expect(loaded!.cards[0].title).toBe("Persist Me");
  });

  it("returns null for addCard on nonexistent board", () => {
    const card = km.addCard("nonexistent", { title: "Ghost" });
    expect(card).toBeNull();
  });

  it("returns null for moveCard on nonexistent card", () => {
    const board = km.createBoard("Move Fail");
    const moved = km.moveCard(board.id, "nonexistent", "done");
    expect(moved).toBeNull();
  });

  it("provides lane info utility", () => {
    const info = KanbanManager.getLaneInfo("running");
    expect(info.label).toBe("Running");
    expect(info.color).toBe("#3fb950");
    expect(info.icon).toBe("play");
  });

  it("provides priority label utility", () => {
    expect(KanbanManager.getPriorityLabel(0)).toBe("low");
    expect(KanbanManager.getPriorityLabel(1)).toBe("normal");
    expect(KanbanManager.getPriorityLabel(2)).toBe("high");
    expect(KanbanManager.getPriorityLabel(3)).toBe("critical");
  });
});
// ── AuthManager Tests ──────────────────────────────────────────────

import { AuthManager } from "../src/server/auth.js";

describe("AuthManager", () => {
  it("creates with default config (auth disabled)", () => {
    const auth = new AuthManager();
    expect(auth.enabled).toBe(false);
  });

  it("creates with auth enabled", () => {
    const auth = new AuthManager({ enabled: true });
    expect(auth.enabled).toBe(true);
  });

  it("hashes passwords consistently", () => {
    const hash1 = AuthManager.hashPassword("test123");
    const hash2 = AuthManager.hashPassword("test123");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("verifies correct password", () => {
    const auth = new AuthManager({ enabled: true });
    expect(auth.verifyPassword("admin")).toBe(true);
  });

  it("rejects wrong password", () => {
    const auth = new AuthManager({ enabled: true });
    expect(auth.verifyPassword("wrong")).toBe(false);
  });

  it("login creates a session", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.login("admin", "admin");
    expect(result.success).toBe(true);
    expect(result.token).toBeTruthy();
    expect(result.csrfToken).toBeTruthy();
  });

  it("login fails with wrong password", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.login("admin", "wrong");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid password");
  });

  it("validates session token", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.login("admin", "admin");
    const session = auth.validateSession(result.token!);
    expect(session).toBeTruthy();
    expect(session!.username).toBe("admin");
  });

  it("rejects invalid session token", () => {
    const auth = new AuthManager({ enabled: true });
    const session = auth.validateSession("invalid_token");
    expect(session).toBeNull();
  });

  it("logout removes session", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.login("admin", "admin");
    expect(auth.logout(result.token!)).toBe(true);
    expect(auth.validateSession(result.token!)).toBeNull();
  });

  it("validates CSRF token", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.login("admin", "admin");
    expect(auth.validateCSRF(result.token!, result.csrfToken!)).toBe(true);
    expect(auth.validateCSRF(result.token!, "wrong_csrf")).toBe(false);
  });

  it("change password works", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.changePassword("admin", "newpass");
    expect(result.success).toBe(true);
    expect(auth.verifyPassword("newpass")).toBe(true);
    expect(auth.verifyPassword("admin")).toBe(false);
  });

  it("change password rejects wrong current password", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.changePassword("wrong", "newpass");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Current password incorrect");
  });

  it("change password rejects short new password", () => {
    const auth = new AuthManager({ enabled: true });
    const result = auth.changePassword("admin", "ab");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Password must be at least 4 characters");
  });

  it("lists sessions", () => {
    const auth = new AuthManager({ enabled: true });
    auth.login("admin", "admin");
    auth.login("admin", "admin");
    const sessions = auth.listSessions();
    expect(sessions).toHaveLength(2);
  });

  it("auth middleware skips when disabled", async () => {
    const auth = new AuthManager({ enabled: false });
    const middleware = auth.authMiddleware();
    let nextCalled = false;
    await middleware({ req: { path: "/api/status" } }, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});

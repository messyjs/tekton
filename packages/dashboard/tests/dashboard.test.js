/**
 * Dashboard Package Tests — Server, API, Types, SPA generation.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { DashboardServer } from "../src/server/server.js";
import { DashboardAPI } from "../src/server/api.js";
import { generateDashboardHTML } from "../src/server/spa.js";
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
        expect(ids).toContain("routing");
        expect(ids).toContain("analytics");
        expect(ids).toContain("scp-traffic");
        expect(ids).toContain("config");
        expect(ids).toContain("training");
        expect(ids).toContain("memory");
        expect(ids).toContain("gateway");
        expect(ids).toContain("documents");
        expect(ids.length).toBe(12);
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
    let api;
    beforeEach(() => {
        api = new DashboardAPI();
    });
    it("creates API instance", () => {
        expect(api).toBeDefined();
    });
    it("getStatus returns default structure", async () => {
        // Create a mock Hono context
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
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
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getSessions(mockContext);
        const data = await response.json();
        expect(data.sessions).toEqual([]);
        expect(data.total).toBe(0);
    });
    it("getSkills returns empty list without skill manager", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getSkills(mockContext);
        const data = await response.json();
        expect(data.skills).toEqual([]);
        expect(data.total).toBe(0);
    });
    it("getConfig returns default config", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getConfig(mockContext);
        const data = await response.json();
        expect(data.config).toBeDefined();
        expect(data.config.identity).toBeDefined();
        expect(data.config.models).toBeDefined();
    });
    it("getGatewayStatus returns empty when no gateway", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getGatewayStatus(mockContext);
        const data = await response.json();
        expect(data.running).toBe(false);
        expect(data.platforms).toEqual({});
    });
    it("getVoiceStatus returns default when no voice manager", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getVoiceStatus(mockContext);
        const data = await response.json();
        expect(data.enabled).toBe(false);
    });
    it("getRoutingLog returns empty array without telemetry", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getRoutingLog(mockContext);
        const data = await response.json();
        expect(data.entries).toEqual([]);
    });
    it("getAnalyticsTokens returns empty without telemetry", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getAnalyticsTokens(mockContext);
        const data = await response.json();
        expect(data.entries).toEqual([]);
        expect(data.totalTokens).toBe(0);
        expect(data.totalCost).toBe(0);
    });
    it("getTrainingStatus returns empty", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getTrainingStatus(mockContext);
        const data = await response.json();
        expect(data.running).toBe(false);
        expect(data.jobs).toEqual([]);
    });
    it("getMemory returns empty without memory manager", async () => {
        const mockJson = (data) => new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
        const mockContext = { json: mockJson, req: { param: () => "" } };
        const response = api.getMemory(mockContext);
        const data = await response.json();
        expect(data.memory).toBe("");
        expect(data.userModel).toBe("");
        expect(data.sessions).toEqual([]);
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
    });
    it("includes refresh interval from config", () => {
        const html = generateDashboardHTML({ ...DEFAULT_DASHBOARD_CONFIG, refreshIntervalMs: 10000 });
        expect(html).toContain("10000");
    });
    it("includes React and Tailwind CDN", () => {
        const html = generateDashboardHTML(DEFAULT_DASHBOARD_CONFIG);
        expect(html).toContain("react@19");
        expect(html).toContain("react-dom@19");
        expect(html).toContain("tailwindcss");
    });
    it("has dark theme styling", () => {
        const html = generateDashboardHTML(DEFAULT_DASHBOARD_CONFIG);
        expect(html).toContain("#0f172a");
        expect(html).toContain("#1e293b");
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
});
//# sourceMappingURL=dashboard.test.js.map
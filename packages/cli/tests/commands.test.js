import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommandRegistry, featureState } from "../src/commands/registry.js";
import { parseArgs, hasJsonFlag, formatBox, formatTable, truncate } from "../src/commands/types.js";
import { createFullCommandRegistry } from "../src/commands/index.js";
import { HermesBridge } from "@tekton/hermes-bridge";
import { ModelRouter, SoulManager, PersonalityManager, MemoryManager, TelemetryTracker } from "@tekton/core";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
// ── Mock factories ───────────────────────────────────────────────────
function createTmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "tekton-cmd-"));
}
function createMockCommandContext() {
    const tmpDir = createTmpDir();
    const bridge = new HermesBridge({ tektonHome: tmpDir });
    const router = new ModelRouter({
        fastModel: "test-fast",
        fastProvider: "test",
        deepModel: "test-deep",
        deepProvider: "test",
        fallbackChain: [],
        complexityThreshold: 0.6,
        simpleThreshold: 0.3,
    });
    return {
        hermesBridge: bridge,
        modelRouter: router,
        soul: new SoulManager(tmpDir),
        personality: new PersonalityManager(new SoulManager(tmpDir)),
        memory: new MemoryManager(tmpDir),
        telemetry: new TelemetryTracker(path.join(tmpDir, "telemetry.db")),
        config: {
            identity: { name: "tekton" },
            models: { fast: { model: "test-fast", provider: "test" }, deep: { model: "test-deep", provider: "test" }, fallbackChain: [] },
            routing: { mode: "auto", complexityThreshold: 0.6, simpleThreshold: 0.3, escalationKeywords: [], simpleKeywords: [] },
            compression: { enabled: true, defaultTier: "full" },
            learning: { enabled: true, autoExtract: true, complexityThreshold: 0.7 },
            contextHygiene: { maxTurns: 50, compactPercent: 0.75, pruneAfter: 30 },
            telemetry: { enabled: true, dbPath: path.join(tmpDir, "telemetry.db") },
            budget: { dailyLimit: null, sessionLimit: null, warnPercent: 80 },
            dashboard: { port: 7890, autoStart: false },
            gateway: { platforms: [], tokens: {} },
            voice: { stt: "", tts: "", providers: {} },
            terminal: { backend: "local", cwd: "", timeout: 30000 },
            skills: { dirs: [], externalDirs: [] },
            memory: { provider: "sqlite", path: path.join(tmpDir, "memory.db") },
        },
        tektonHome: tmpDir,
    };
}
function createMockPiCtx() {
    const messages = [];
    return {
        ui: {
            notify: vi.fn((msg) => { messages.push(msg); }),
            confirm: vi.fn(() => Promise.resolve(true)),
            input: vi.fn(() => Promise.resolve("test")),
            select: vi.fn(() => Promise.resolve("0")),
        },
        messages,
        cwd: "/tmp",
        hasUI: true,
    };
}
// ── Arg Parsing ──────────────────────────────────────────────────────
describe("Command Arg Parsing", () => {
    it("parses empty args", () => {
        const args = parseArgs("");
        expect(args.subcommand).toBe("");
        expect(args.positional).toEqual([]);
        expect(args.flags).toEqual({});
    });
    it("parses subcommand", () => {
        const args = parseArgs("list");
        expect(args.subcommand).toBe("list");
        expect(args.positional).toEqual([]);
    });
    it("parses subcommand with positional args", () => {
        const args = parseArgs("search my query term");
        expect(args.subcommand).toBe("search");
        expect(args.positional).toEqual(["my", "query", "term"]);
    });
    it("parses --json flag", () => {
        const args = parseArgs("status --json");
        expect(args.subcommand).toBe("status");
        expect(args.flags.json).toBe(true);
        expect(args.positional).toEqual([]);
    });
    it("parses -j short flag", () => {
        const args = parseArgs("status -j");
        expect(args.flags.j).toBe(true);
        expect(hasJsonFlag(args)).toBe(true);
    });
    it("parses --force flag", () => {
        const args = parseArgs("forget skill-name --force");
        expect(args.subcommand).toBe("forget");
        expect(args.positional).toEqual(["skill-name"]);
        expect(args.flags.force).toBe(true);
    });
    it("parses flag with value", () => {
        const args = parseArgs("file --tier full");
        expect(args.subcommand).toBe("file");
        expect(args.flags.tier).toBe("full");
    });
    it("parses quoted strings", () => {
        const args = parseArgs('add "this is a memory entry" --category notes');
        expect(args.subcommand).toBe("add");
        expect(args.positional).toEqual(["this is a memory entry"]);
        expect(args.flags.category).toBe("notes");
    });
    it("hasJsonFlag detects both --json and -j", () => {
        expect(hasJsonFlag(parseArgs("--json"))).toBe(true);
        expect(hasJsonFlag(parseArgs("-j"))).toBe(true);
        expect(hasJsonFlag(parseArgs(""))).toBe(false);
    });
    it("preserves raw args", () => {
        const raw = "search pattern --json --category code";
        const args = parseArgs(raw);
        expect(args.raw).toBe(raw);
    });
});
// ── Output Formatting ────────────────────────────────────────────────
describe("Output Formatting", () => {
    it("formatBox creates bordered output", () => {
        const result = formatBox("Title", [["Key", "Value"], ["Name", "Test"]]);
        expect(result).toContain("Title");
        expect(result).toContain("Key");
        expect(result).toContain("Value");
        expect(result).toContain("╔");
        expect(result).toContain("╚");
    });
    it("formatTable creates table output", () => {
        const result = formatTable(["Name", "Value"], [["foo", "bar"], ["baz", "qux"]]);
        expect(result).toContain("Name");
        expect(result).toContain("Value");
        expect(result).toContain("foo");
        expect(result).toContain("─");
    });
    it("truncate short strings unchanged", () => {
        expect(truncate("hello", 10)).toBe("hello");
    });
    it("truncate long strings with ellipsis", () => {
        expect(truncate("hello world this is a very long string", 10)).toBe("hello w...");
    });
});
// ── Command Registry ──────────────────────────────────────────────────
describe("Command Registry", () => {
    let registry;
    beforeEach(() => {
        registry = new CommandRegistry();
    });
    it("registers commands", () => {
        const cmd = {
            name: "test",
            description: "Test command",
            handler: async () => { },
        };
        registry.register(cmd);
        expect(registry.get("test")).toBe(cmd);
    });
    it("lists registered commands", () => {
        registry.register({ name: "a", description: "A", handler: async () => { } });
        registry.register({ name: "b", description: "B", handler: async () => { } });
        expect(registry.list()).toHaveLength(2);
    });
    it("throws on duplicate registration", () => {
        registry.register({ name: "test", description: "Test", handler: async () => { } });
        expect(() => registry.register({ name: "test", description: "Test", handler: async () => { } })).toThrow();
    });
    it("generates help for a command", () => {
        registry.register({
            name: "tekton:skills",
            description: "Manage skills",
            subcommands: { list: "List skills", search: "Search skills" },
            handler: async () => { },
        });
        const help = registry.getHelp(registry.get("tekton:skills"));
        expect(help).toContain("tekton:skills");
        expect(help).toContain("list");
        expect(help).toContain("search");
    });
    it("generates full help listing", () => {
        registry.register({ name: "tekton", description: "Status", handler: async () => { } });
        registry.register({ name: "tekton:route", description: "Routing", handler: async () => { } });
        const fullHelp = registry.getFullHelp();
        expect(fullHelp).toContain("tekton");
        expect(fullHelp).toContain("tekton:route");
        expect(fullHelp).toContain("Commands");
    });
});
// ── Full Command Registry ─────────────────────────────────────────────
describe("Full Command Registry (all 24 commands)", () => {
    it("registers all built-in commands", () => {
        const registry = createFullCommandRegistry();
        const commands = registry.list();
        const expectedNames = [
            "tekton",
            "tekton:status",
            "tekton:on",
            "tekton:off",
            "tekton:dashboard",
            "tekton:route",
            "tekton:models",
            "tekton:skills",
            "tekton:compress",
            "tekton:tokens",
            "tekton:memory",
            "tekton:agents",
            "tekton:config",
            "tekton:learn",
            "tekton:train",
            "tekton:gpu",
            "tekton:cron",
            "tekton:voice",
            "tekton:personality",
            "tekton:soul",
            "tekton:help",
            "tekton:gateway",
            "tekton:docling",
            "tekton:forge",
        ];
        expect(commands.length).toBe(expectedNames.length);
        for (const name of expectedNames) {
            const cmd = registry.get(name);
            expect(cmd).toBeDefined();
            expect(cmd.name).toBe(name);
            expect(cmd.description.length).toBeGreaterThan(0);
            expect(typeof cmd.handler).toBe("function");
        }
    });
    it("registers all commands with Pi extension API", () => {
        const ctx = createMockCommandContext();
        const registry = createFullCommandRegistry();
        const mockPi = {
            registerCommand: vi.fn(),
            on: vi.fn(),
        };
        registry.registerAll(mockPi, ctx);
        // Should have called registerCommand for each command
        expect(mockPi.registerCommand).toHaveBeenCalledTimes(registry.list().length);
        // Verify command names
        const calls = mockPi.registerCommand.mock.calls;
        const registeredNames = calls.map((call) => call[0]);
        for (const name of registeredNames) {
            const cmd = registry.get(name);
            expect(cmd).toBeDefined();
        }
    });
});
// ── Command Handler Tests ─────────────────────────────────────────────
describe("Command Handlers", () => {
    let ctx;
    let piCtx;
    beforeEach(() => {
        ctx = createMockCommandContext();
        piCtx = createMockPiCtx();
    });
    describe("/tekton (status dashboard)", () => {
        it("shows status dashboard with --json flag", async () => {
            const registry = createFullCommandRegistry();
            const cmd = registry.get("tekton");
            const args = { subcommand: "", positional: [], flags: { json: true }, raw: "--json" };
            const mockPi = { registerCommand: vi.fn() };
            await cmd.handler(args, ctx, mockPi, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            const parsed = JSON.parse(output);
            expect(parsed).toHaveProperty("model");
            expect(parsed).toHaveProperty("route");
            expect(parsed).toHaveProperty("skills");
            expect(parsed).toHaveProperty("learning");
        });
        it("shows formatted status without --json", async () => {
            const registry = createFullCommandRegistry();
            const cmd = registry.get("tekton");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("Model");
            expect(output).toContain("Route");
        });
    });
    describe("/tekton:route", () => {
        it("shows current route with no args", async () => {
            const cmd = createFullCommandRegistry().get("tekton:route");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("auto");
        });
        it("changes route mode", async () => {
            const cmd = createFullCommandRegistry().get("tekton:route");
            const args = { subcommand: "deep", positional: [], flags: {}, raw: "deep" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(ctx.modelRouter.getMode()).toBe("deep");
        });
    });
    describe("/tekton:learn", () => {
        it("shows status with no args", async () => {
            const cmd = createFullCommandRegistry().get("tekton:learn");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
        });
        it("pauses learning", async () => {
            const cmd = createFullCommandRegistry().get("tekton:learn");
            const args = { subcommand: "pause", positional: [], flags: {}, raw: "pause" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(ctx.hermesBridge.getStatus().isPaused).toBe(true);
        });
        it("resumes learning", async () => {
            ctx.hermesBridge.setPaused(true);
            const cmd = createFullCommandRegistry().get("tekton:learn");
            const args = { subcommand: "resume", positional: [], flags: {}, raw: "resume" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(ctx.hermesBridge.getStatus().isPaused).toBe(false);
        });
    });
    describe("/tekton:on and /tekton:off", () => {
        it("enables all layers", async () => {
            const cmd = createFullCommandRegistry().get("tekton:on");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(featureState.routing).toBe(true);
            expect(featureState.learning).toBe(true);
            expect(featureState.compression).toBe(true);
            expect(ctx.modelRouter.getMode()).toBe("auto");
        });
        it("disables all layers", async () => {
            const cmd = createFullCommandRegistry().get("tekton:off");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(featureState.routing).toBe(false);
            expect(featureState.learning).toBe(false);
            expect(featureState.compression).toBe(false);
            expect(ctx.modelRouter.getMode()).toBe("fast");
        });
    });
    describe("/tekton:personality", () => {
        it("sets overlay to a preset", async () => {
            const cmd = createFullCommandRegistry().get("tekton:personality");
            const args = { subcommand: "set", positional: ["teacher"], flags: {}, raw: "set teacher" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(ctx.personality.hasOverlay()).toBe(true);
        });
        it("clears overlay", async () => {
            ctx.personality.setOverlay("teacher");
            const cmd = createFullCommandRegistry().get("tekton:personality");
            const args = { subcommand: "clear", positional: [], flags: {}, raw: "clear" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(ctx.personality.hasOverlay()).toBe(false);
        });
        it("lists available presets", async () => {
            const cmd = createFullCommandRegistry().get("tekton:personality");
            const args = { subcommand: "list", positional: [], flags: {}, raw: "list" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("teacher");
            expect(output).toContain("pragmatic");
        });
    });
    describe("/tekton:memory", () => {
        it("adds memory entry", async () => {
            const cmd = createFullCommandRegistry().get("tekton:memory");
            const args = { subcommand: "add", positional: ["test", "memory"], flags: {}, raw: "add test memory" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            expect(ctx.memory.getMemory()).toContain("test memory");
        });
        it("searches memory", async () => {
            ctx.memory.addMemory("hello world");
            const cmd = createFullCommandRegistry().get("tekton:memory");
            const args = { subcommand: "search", positional: ["hello"], flags: {}, raw: "search hello" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("hello");
        });
        it("shows memory", async () => {
            ctx.memory.addMemory("test entry");
            const cmd = createFullCommandRegistry().get("tekton:memory");
            const args = { subcommand: "show", positional: [], flags: {}, raw: "show" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
        });
    });
    describe("/tekton:config", () => {
        it("shows config overview", async () => {
            const cmd = createFullCommandRegistry().get("tekton:config");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("test-fast");
        });
        it("shows config as JSON with --json flag", async () => {
            const cmd = createFullCommandRegistry().get("tekton:config");
            const args = { subcommand: "export", positional: [], flags: {}, raw: "export" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            const parsed = JSON.parse(output);
            expect(parsed).toHaveProperty("models");
        });
    });
    describe("/tekton:help", () => {
        it("shows all commands", async () => {
            const registry = createFullCommandRegistry();
            const cmd = registry.get("tekton:help");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("tekton");
            expect(output).toContain("Commands");
        });
        it("shows help for specific command", async () => {
            const registry = createFullCommandRegistry();
            const cmd = registry.get("tekton:help");
            const args = { subcommand: "route", positional: [], flags: {}, raw: "route" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("tekton:route");
        });
    });
    describe("train command (full implementation)", () => {
        it("shows help when no subcommand", async () => {
            const cmd = createFullCommandRegistry().get("tekton:train");
            const args = { subcommand: "", positional: [], flags: {}, raw: "" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("Training Management");
        });
        it("shows stub message for agents", async () => {
            const cmd = createFullCommandRegistry().get("tekton:agents");
            const args = { subcommand: "list", positional: [], flags: {}, raw: "list" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
        });
        it("shows stub message for voice status", async () => {
            const cmd = createFullCommandRegistry().get("tekton:voice");
            const args = { subcommand: "status", positional: [], flags: {}, raw: "status" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
        });
        it("shows stub message for cron list", async () => {
            const cmd = createFullCommandRegistry().get("tekton:cron");
            const args = { subcommand: "list", positional: [], flags: {}, raw: "list" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
        });
    });
    describe("destructive action guards", () => {
        it("requires --force for memory forget", async () => {
            const cmd = createFullCommandRegistry().get("tekton:memory");
            const args = { subcommand: "forget", positional: [], flags: {}, raw: "forget" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("--force");
        });
        it("clears memory with --force", async () => {
            ctx.memory.addMemory("something to forget");
            const cmd = createFullCommandRegistry().get("tekton:memory");
            const args = { subcommand: "forget", positional: [], flags: { force: true }, raw: "forget --force" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(ctx.memory.getMemory().trim()).toBe("");
        });
        it("requires --force for config reset", async () => {
            const cmd = createFullCommandRegistry().get("tekton:config");
            const args = { subcommand: "reset", positional: [], flags: {}, raw: "reset" };
            await cmd.handler(args, ctx, {}, piCtx);
            expect(piCtx.ui.notify).toHaveBeenCalled();
            const output = piCtx.ui.notify.mock.calls[0][0];
            expect(output).toContain("--force");
        });
    });
});
//# sourceMappingURL=commands.test.js.map
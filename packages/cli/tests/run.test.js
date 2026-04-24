import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseArgs, getTektonHome, initTektonHome } from "../src/run.js";
// ── parseArgs tests ──────────────────────────────────────────────────
describe("parseArgs", () => {
    it("parses no arguments with defaults", () => {
        const result = parseArgs([]);
        expect(result.showHelp).toBe(false);
        expect(result.pi.continue).toBe(false);
        expect(result.pi.mode).toBe("interactive");
        expect(result.tekton.route).toBe("auto");
        expect(result.tekton.compress).toBe("full");
        expect(result.tekton.noLearning).toBe(false);
        expect(result.initialMessage).toBeNull();
    });
    it("parses --help", () => {
        expect(parseArgs(["--help"]).showHelp).toBe(true);
    });
    it("parses -h", () => {
        expect(parseArgs(["-h"]).showHelp).toBe(true);
    });
    // ── Pi flags ──
    it("parses -c/--continue", () => {
        expect(parseArgs(["-c"]).pi.continue).toBe(true);
        expect(parseArgs(["--continue"]).pi.continue).toBe(true);
    });
    it("parses --resume with file", () => {
        expect(parseArgs(["--resume", "sess.jsonl"]).pi.resume).toBe("sess.jsonl");
    });
    it("parses --print", () => {
        const r = parseArgs(["--print"]);
        expect(r.pi.print).toBe(true);
        expect(r.pi.mode).toBe("print");
    });
    it("parses --mode", () => {
        expect(parseArgs(["--mode", "rpc"]).pi.mode).toBe("rpc");
    });
    it("rejects invalid mode", () => {
        expect(() => parseArgs(["--mode", "invalid"])).toThrow("Invalid mode");
    });
    it("parses --provider", () => {
        expect(parseArgs(["--provider", "anthropic"]).pi.provider).toBe("anthropic");
    });
    it("parses --model", () => {
        expect(parseArgs(["--model", "claude-sonnet-4"]).pi.model).toBe("claude-sonnet-4");
    });
    it("parses --thinking", () => {
        expect(parseArgs(["--thinking", "high"]).pi.thinking).toBe("high");
    });
    it("rejects invalid thinking level", () => {
        expect(() => parseArgs(["--thinking", "ultra"])).toThrow("Invalid thinking level");
    });
    it("parses --tools with comma-separated list", () => {
        expect(parseArgs(["--tools", "read,bash,edit"]).pi.tools).toEqual(["read", "bash", "edit"]);
    });
    it("parses --no-session", () => {
        expect(parseArgs(["--no-session"]).pi.noSession).toBe(true);
    });
    it("parses --session", () => {
        expect(parseArgs(["--session", "/tmp/s.jsonl"]).pi.session).toBe("/tmp/s.jsonl");
    });
    // ── Tekton flags ──
    it("parses --route with all valid modes", () => {
        for (const mode of ["auto", "fast", "deep", "rules"]) {
            expect(parseArgs(["--route", mode]).tekton.route).toBe(mode);
        }
    });
    it("rejects invalid route", () => {
        expect(() => parseArgs(["--route", "turbo"])).toThrow("Invalid route");
    });
    it("parses --compress with all valid tiers", () => {
        for (const tier of ["off", "lite", "full", "ultra"]) {
            expect(parseArgs(["--compress", tier]).tekton.compress).toBe(tier);
        }
    });
    it("rejects invalid compress tier", () => {
        expect(() => parseArgs(["--compress", "mega"])).toThrow("Invalid compression");
    });
    it("parses --no-learning", () => {
        expect(parseArgs(["--no-learning"]).tekton.noLearning).toBe(true);
    });
    it("parses --dashboard", () => {
        expect(parseArgs(["--dashboard"]).tekton.dashboard).toBe(true);
    });
    it("parses --dashboard-port", () => {
        expect(parseArgs(["--dashboard-port", "9999"]).tekton.dashboardPort).toBe(9999);
    });
    it("parses --no-dashboard", () => {
        expect(parseArgs(["--no-dashboard"]).tekton.noDashboard).toBe(true);
    });
    it("parses --soul", () => {
        expect(parseArgs(["--soul", "/path/to/soul.md"]).tekton.soul).toBe("/path/to/soul.md");
    });
    it("parses --personality", () => {
        expect(parseArgs(["--personality", "teacher"]).tekton.personality).toBe("teacher");
    });
    it("parses --toolsets", () => {
        expect(parseArgs(["--toolsets", "terminal,file,web"]).tekton.toolsets).toEqual(["terminal", "file", "web"]);
    });
    it("parses --gateway", () => {
        expect(parseArgs(["--gateway"]).tekton.gateway).toBe(true);
    });
    it("parses --voice", () => {
        expect(parseArgs(["--voice"]).tekton.voice).toBe(true);
    });
    it("parses positional argument as initial message", () => {
        expect(parseArgs(["hello"]).initialMessage).toBe("hello");
    });
    it("parses mixed flags and positional", () => {
        const r = parseArgs(["--route", "fast", "--compress", "ultra", "hello"]);
        expect(r.tekton.route).toBe("fast");
        expect(r.tekton.compress).toBe("ultra");
        expect(r.initialMessage).toBe("hello");
    });
    it("all flags together", () => {
        const r = parseArgs([
            "-c", "--resume", "sess.jsonl", "-p",
            "--provider", "anthropic", "--model", "claude-sonnet-4",
            "--thinking", "high", "--tools", "read,bash",
            "--route", "deep", "--compress", "ultra",
            "--no-learning", "--dashboard", "--dashboard-port", "9090",
            "--personality", "reviewer", "--toolsets", "terminal,file",
        ]);
        expect(r.pi.continue).toBe(true);
        expect(r.pi.resume).toBe("sess.jsonl");
        expect(r.pi.print).toBe(true);
        expect(r.pi.provider).toBe("anthropic");
        expect(r.pi.model).toBe("claude-sonnet-4");
        expect(r.pi.thinking).toBe("high");
        expect(r.pi.tools).toEqual(["read", "bash"]);
        expect(r.tekton.route).toBe("deep");
        expect(r.tekton.compress).toBe("ultra");
        expect(r.tekton.noLearning).toBe(true);
        expect(r.tekton.dashboard).toBe(true);
        expect(r.tekton.dashboardPort).toBe(9090);
        expect(r.tekton.personality).toBe("reviewer");
        expect(r.tekton.toolsets).toEqual(["terminal", "file"]);
    });
});
// ── getTektonHome tests ─────────────────────────────────────────────
describe("getTektonHome", () => {
    const originalEnv = process.env.TEKTON_HOME;
    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env.TEKTON_HOME;
        }
        else {
            process.env.TEKTON_HOME = originalEnv;
        }
    });
    it("returns TEKTON_HOME env var when set", () => {
        process.env.TEKTON_HOME = "/custom/tekton";
        expect(getTektonHome()).toBe("/custom/tekton");
    });
    it("returns ~/.tekton when TEKTON_HOME not set", () => {
        delete process.env.TEKTON_HOME;
        expect(getTektonHome()).toBe(path.join(os.homedir(), ".tekton"));
    });
});
// ── initTektonHome tests ────────────────────────────────────────────
describe("initTektonHome", () => {
    let tmpDir;
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tekton-init-"));
    });
    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });
    it("creates required directories", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        initTektonHome(tektonHome);
        expect(fs.existsSync(tektonHome)).toBe(true);
        expect(fs.existsSync(path.join(tektonHome, "skills"))).toBe(true);
        expect(fs.existsSync(path.join(tektonHome, "sessions"))).toBe(true);
        expect(fs.existsSync(path.join(tektonHome, "cron"))).toBe(true);
    });
    it("creates SOUL.md with default content when missing", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        initTektonHome(tektonHome);
        const soulPath = path.join(tektonHome, "SOUL.md");
        expect(fs.existsSync(soulPath)).toBe(true);
        expect(fs.readFileSync(soulPath, "utf-8")).toContain("Tekton");
    });
    it("does not overwrite existing SOUL.md", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        fs.mkdirSync(tektonHome, { recursive: true });
        fs.writeFileSync(path.join(tektonHome, "SOUL.md"), "Custom soul", "utf-8");
        initTektonHome(tektonHome);
        expect(fs.readFileSync(path.join(tektonHome, "SOUL.md"), "utf-8")).toBe("Custom soul");
    });
    it("creates empty MEMORY.md", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        initTektonHome(tektonHome);
        expect(fs.readFileSync(path.join(tektonHome, "MEMORY.md"), "utf-8")).toBe("");
    });
    it("creates empty USER.md", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        initTektonHome(tektonHome);
        expect(fs.readFileSync(path.join(tektonHome, "USER.md"), "utf-8")).toBe("");
    });
    it("creates config.yaml with defaults", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        initTektonHome(tektonHome);
        expect(fs.readFileSync(path.join(tektonHome, "config.yaml"), "utf-8")).toContain("tekton");
    });
    it("is idempotent", () => {
        const tektonHome = path.join(tmpDir, ".tekton");
        initTektonHome(tektonHome);
        initTektonHome(tektonHome);
        expect(fs.readFileSync(path.join(tektonHome, "SOUL.md"), "utf-8")).toContain("Tekton");
    });
});
//# sourceMappingURL=run.test.js.map
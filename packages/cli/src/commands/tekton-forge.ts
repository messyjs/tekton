/**
 * /tekton:forge — Forge project management commands.
 *
 * Commands:
 *   /tekton:forge          — Show status (enabled/disabled, project count)
 *   /tekton:forge enable   — Enable Forge, create projects directory
 *   /tekton:forge disable  — Disable Forge
 *   /tekton:forge new      — Start new product (non-interactive with brief)
 *   /tekton:forge status   — Current project status
 *   /tekton:forge resume   — Resume project
 *   /tekton:forge list     — List all projects
 *   /tekton:forge check    — Preflight check for domain tools
 */
import type { CommandRegistration, CommandContext } from "./types.js";
import { loadConfig } from "@tekton/core";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { ForgeRuntime, type ForgeRuntimeConfig } from "@tekton/forge";
import { checkDomain, checkMultipleDomains } from "@tekton/forge";
import type { ProductDomain } from "@tekton/forge";

// ── Helpers ──────────────────────────────────────────────────────────────

function getTektonHome(): string {
  return process.env.TEKTON_HOME ?? join(os.homedir(), ".tekton");
}

function getConfigPath(): string {
  return join(getTektonHome(), "config.yaml");
}

function isForgeEnabled(tektonHome?: string): boolean {
  try {
    const home = tektonHome ?? getTektonHome();
    const config = loadConfig(home) as any;
    return config?.forge?.enabled ?? false;
  } catch {
    return false;
  }
}

function setForgeEnabled(enabled: boolean): void {
  const home = getTektonHome();
  if (!existsSync(home)) {
    mkdirSync(home, { recursive: true });
  }

  const configPath = getConfigPath();
  let configContent = "";
  if (existsSync(configPath)) {
    configContent = readFileSync(configPath, "utf-8");
  }

  // Append or update the forge.enabled line
  const lines = configContent.split("\n").filter(l => !l.startsWith("forge.enabled:"));
  lines.push(`forge.enabled: ${enabled}`);
  writeFileSync(configPath, lines.join("\n"), "utf-8");

  // Ensure projects directory exists
  const projectsDir = join(home, "forge-projects");
  if (!existsSync(projectsDir)) {
    mkdirSync(projectsDir, { recursive: true });
  }
}

function getForgeRuntime(tektonHome?: string): ForgeRuntime {
  const home = tektonHome ?? getTektonHome();
  const projectsDir = join(home, "forge-projects");

  return new ForgeRuntime({
    enabled: true,
    projectsDir,
  });
}

// ── Command registration ──────────────────────────────────────────────────

export function createForgeCommand(): CommandRegistration {
  return {
    name: "tekton:forge",
    description: "Forge — autonomous product engineering system",
    subcommands: {
      enable: "Enable Forge and create projects directory",
      disable: "Disable Forge",
      new: "Start a new Forge project (provide brief as argument)",
      status: "Show current project status",
      resume: "Resume a Forge project (provide project ID)",
      list: "List all Forge projects",
      check: "Run preflight check (provide domain as argument)",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const subcommand = args.positional[0];
      const tektonHome = ctx?.tektonHome ?? getTektonHome();

      // No subcommand: show status
      if (!subcommand) {
        const enabled = isForgeEnabled(tektonHome);
        const runtime = getForgeRuntime(tektonHome);
        const projects = runtime.listProjects();

        piCtx.ui.notify(
          `Forge: ${enabled ? "✅ Enabled" : "❌ Disabled"}\n\nProjects: ${projects.length}\n${projects.map(p => `  ${p.id} — ${p.phase}${p.title ? ` (${p.title})` : ""}${p.error ? ` ⚠️ ${p.error}` : ""}`).join("\n")}\n\nUse /tekton:forge enable to activate, /tekton:forge disable to deactivate.\nUse /tekton:forge new <brief> to start a project.`
        );
        return;
      }

      // enable
      if (subcommand === "enable") {
        setForgeEnabled(true);
        piCtx.ui.notify("✅ Forge enabled. Projects directory: ~/.tekton/forge-projects");
        return;
      }

      // disable
      if (subcommand === "disable") {
        setForgeEnabled(false);
        piCtx.ui.notify("❌ Forge disabled.");
        return;
      }

      // All other commands require Forge to be enabled
      if (!isForgeEnabled(tektonHome)) {
        piCtx.ui.notify("Forge is not enabled. Run /tekton:forge enable to activate.");
        return;
      }

      // new — start a new project
      if (subcommand === "new") {
        const brief = args.positional.slice(1).join(" ").trim();
        if (!brief) {
          piCtx.ui.notify("Please provide a brief description. Usage: /tekton:forge new <brief description>");
          return;
        }

        const runtime = getForgeRuntime(tektonHome);
        try {
          const projectId = await runtime.newProject(brief);
          const status = runtime.getProjectStatus(projectId);
          const phase = status?.currentPhase ?? "unknown";
          const error = status?.error;

          if (error) {
            piCtx.ui.notify(`⚠️ Project ${projectId} halted at phase "${phase}": ${error}`);
            return;
          }

          piCtx.ui.notify(`✅ Project ${projectId} created! Phase: ${phase}\n\nUse /tekton:forge status ${projectId} to check progress.`);
          return;
        } catch (e) {
          piCtx.ui.notify(`❌ Error creating project: ${(e as Error).message}`);
          return;
        }
      }

      // status — show project status
      if (subcommand === "status") {
        const projectId = args.positional[1];
        const runtime = getForgeRuntime(tektonHome);

        if (projectId) {
          const status = runtime.getProjectStatus(projectId);
          if (!status) {
            piCtx.ui.notify(`Project "${projectId}" not found.`);
            return;
          }

          piCtx.ui.notify(
            `Project: ${status.projectId}\nPhase: ${status.currentPhase}\nTitle: ${status.brief?.title ?? "N/A"}\nDomains: ${status.brief?.domains?.join(", ") ?? "N/A"}\nTask Cards: ${status.taskCards.length}\nQA Verdict: ${status.qaVerdict ?? "pending"}\n${status.error ? `Error: ${status.error}` : ""}`
          );
          return;
        }

        // No project ID — show all projects
        const projects = runtime.listProjects();
        if (projects.length === 0) {
          piCtx.ui.notify("No Forge projects yet. Use /tekton:forge new <brief> to start one.");
          return;
        }

        piCtx.ui.notify(
          projects.map(p => `${p.id}  ${p.phase}  ${p.title ?? ""}  ${p.error ? "⚠️ " + p.error : ""}`).join("\n")
        );
        return;
      }

      // resume — resume a project
      if (subcommand === "resume") {
        const projectId = args.positional[1];
        if (!projectId) {
          piCtx.ui.notify("Usage: /tekton:forge resume <project-id>");
          return;
        }

        const runtime = getForgeRuntime(tektonHome);
        try {
          const state = await runtime.resumeProject(projectId);
          piCtx.ui.notify(
            `Resumed project ${projectId} at phase "${state.currentPhase}".\n${state.error ? `Error: ${state.error}` : ""}`
          );
          return;
        } catch (e) {
          piCtx.ui.notify(`❌ Error resuming project: ${(e as Error).message}`);
          return;
        }
      }

      // list — list projects
      if (subcommand === "list") {
        const runtime = getForgeRuntime(tektonHome);
        const projects = runtime.listProjects();

        if (projects.length === 0) {
          piCtx.ui.notify("No Forge projects yet.");
          return;
        }

        piCtx.ui.notify(
          projects.map(p => `${p.id}  ${p.phase}  ${p.title ?? ""}`).join("\n")
        );
        return;
      }

      // check — preflight check
      if (subcommand === "check") {
        const domain = args.positional[1];
        if (!domain) {
          piCtx.ui.notify("Usage: /tekton:forge check <domain>\n\nAvailable domains: vst-audio, web-app, windows-desktop, unreal-engine, android, ios, cad-physical, html-static, cross-platform");
          return;
        }

        try {
          const result = await checkDomain(domain as ProductDomain);

          const lines = [
            `Domain: ${domain}`,
            `Ready: ${result.ready ? "✅ Yes" : "❌ No"}`,
          ];

          if (result.missing.length > 0) {
            lines.push(`Missing required tools: ${result.missing.join(", ")}`);
          }
          if (result.warnings.length > 0) {
            lines.push(`Warnings: ${result.warnings.join("; ")}`);
          }
          if (result.ready && result.missing.length === 0 && result.warnings.length === 0) {
            lines.push("All tools available! 🎉");
          }

          piCtx.ui.notify(lines.join("\n"));
          return;
        } catch (e) {
          piCtx.ui.notify(`❌ Preflight check error: ${(e as Error).message}`);
          return;
        }
      }

      piCtx.ui.notify(`Unknown Forge subcommand: ${subcommand}\n\nAvailable: enable, disable, new, status, resume, list, check`);
    },
  };
}
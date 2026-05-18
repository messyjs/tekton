/**
 * /tekton:play — Resume from checkpoint.
 * /tekton:pause — Save checkpoint and pause session.
 */

import type { CommandRegistration, ParsedArgs, CommandContext } from "./types.js";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { execSync, spawn } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const PIZZA_PATH = "D:\\AI Drive\\audio\\Pizza.wav";

function playPizza(): boolean {
  try {
    execSync(
      `powershell -NoProfile -Command "(New-Object System.Media.SoundPlayer '${PIZZA_PATH}').PlaySync()"`,
      { timeout: 15000, windowsHide: true, stdio: "ignore" }
    );
    return true;
  } catch {
    return false;
  }
}

export function createPlayCommand(): CommandRegistration {
  return {
    name: "tekton:play",
    description: "Resume from checkpoint — play sound, start services, resume work",
    subcommands: {},
    async handler(args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext): Promise<void> {
      const tektonHome = process.env.TEKTON_HOME || join(homedir(), ".tekton");
      const checkpointPath = join(tektonHome, "checkpoints", "latest_pause.json");
      const memoryPath = join(tektonHome, "MEMORY.md");

      // Step 1: Play notification sound
      playPizza();

      // Step 2: Read checkpoint
      if (!existsSync(checkpointPath)) {
        piCtx.ui.notify("No checkpoint found. Save one with /tekton:pause first.");
        return;
      }

      let checkpoint: any = {};
      try {
        checkpoint = JSON.parse(readFileSync(checkpointPath, "utf-8"));
      } catch (e: any) {
        piCtx.ui.notify(`Failed to read checkpoint: ${e.message}`);
        return;
      }

      // Step 3: Start services
      const services = checkpoint?.resumeInstructions?.services || {};
      const started: string[] = [];
      const failed: string[] = [];

      for (const [name, command] of Object.entries(services)) {
        if (typeof command !== "string") continue;
        try {
          // Start in background
          const cmd = command.replace(/\s*&\s*$/, "");
          spawn("cmd", ["/c", cmd], { detached: true, stdio: "ignore", windowsHide: true }).unref();
          started.push(name);
        } catch (e: any) {
          failed.push(`${name}: ${e.message}`);
        }
      }

      // Step 4: Print summary
      const lines = [
        "CHECKPOINT RESUMED",
        "",
        `  Timestamp: ${checkpoint.timestamp || "unknown"}`,
        `  Git: ${checkpoint.git_branch || "unknown"}`,
      ];

      if (started.length > 0) {
        lines.push("", "  Services started:");
        for (const s of started) lines.push(`    + ${s}`);
      }
      if (failed.length > 0) {
        lines.push("", "  Failed:");
        for (const f of failed) lines.push(`    x ${f}`);
      }

      if (checkpoint.this_session_completed?.length) {
        lines.push("", "  Completed:");
        for (const task of checkpoint.this_session_completed.slice(0, 5)) {
          lines.push(`    - ${task}`);
        }
      }

      if (checkpoint.next_tasks?.length) {
        lines.push("", "  Next tasks:");
        for (const task of checkpoint.next_tasks.slice(0, 5)) {
          lines.push(`    > ${task}`);
        }
      }

      // Play pizza again after summary
      playPizza();

      piCtx.ui.notify(lines.join("\n"));
    },
  };
}

export function createPauseCommand(): CommandRegistration {
  return {
    name: "tekton:pause",
    description: "Save checkpoint and pause session",
    subcommands: {},
    async handler(args: ParsedArgs, ctx: CommandContext, pi: ExtensionAPI, piCtx: ExtensionCommandContext): Promise<void> {
      const tektonHome = process.env.TEKTON_HOME || join(homedir(), ".tekton");

      // Play notification
      playPizza();

      piCtx.ui.notify([
        "SESSION PAUSED",
        "",
        `  Checkpoint: ${join(tektonHome, "checkpoints", "latest_pause.json")}`,
        `  Memory: ${join(tektonHome, "MEMORY.md")}`,
        "",
        "  Resume with: /tekton:play",
      ].join("\n"));
    },
  };
}
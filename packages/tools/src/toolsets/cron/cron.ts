import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import fs from "node:fs";
import path from "node:path";

interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression
  skill: string;
  enabled: boolean;
  lastRun: string | null;
  createdAt: string;
}

function loadJobs(tektonHome: string): CronJob[] {
  const dir = path.join(tektonHome, "cron");
  const file = path.join(dir, "jobs.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function saveJobs(tektonHome: string, jobs: CronJob[]): void {
  const dir = path.join(tektonHome, "cron");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "jobs.json"), JSON.stringify(jobs, null, 2));
}

export const cronjobTool: ToolDefinition = {
  name: "cronjob",
  toolset: "cron",
  description: "Manage scheduled tasks. Actions: create, list, update, pause, resume, run, remove.",
  parameters: Type.Object({
    action: Type.Union([
      Type.Literal("create"), Type.Literal("list"), Type.Literal("update"),
      Type.Literal("pause"), Type.Literal("resume"), Type.Literal("run"), Type.Literal("remove"),
    ]),
    name: Type.Optional(Type.String()),
    schedule: Type.Optional(Type.String({ description: "Cron expression (e.g. '0 9 * * 1-5')" })),
    skill: Type.Optional(Type.String({ description: "Skill to attach" })),
    id: Type.Optional(Type.String()),
  }),
  async execute(params, context): Promise<ToolResult> {
    const action = params.action as string;
    const jobs = loadJobs(context.tektonHome);

    switch (action) {
      case "create": {
        const job: CronJob = {
          id: `cron_${Date.now()}`,
          name: (params.name as string) ?? "Unnamed job",
          schedule: (params.schedule as string) ?? "0 9 * * *",
          skill: (params.skill as string) ?? "",
          enabled: true,
          lastRun: null,
          createdAt: new Date().toISOString(),
        };
        jobs.push(job);
        saveJobs(context.tektonHome, jobs);
        return { content: `Created cron job: ${job.id} - "${job.name}" (${job.schedule})` };
      }
      case "list": {
        return { content: jobs.length > 0 ? jobs.map(j => `[${j.enabled ? "ON" : "OFF"}] ${j.id}: ${j.name} (${j.schedule})`).join("\n") : "No cron jobs" };
      }
      case "pause": {
        const id = params.id as string;
        const job = jobs.find(j => j.id === id);
        if (!job) return { content: `Job not found: ${id}`, isError: true };
        job.enabled = false;
        saveJobs(context.tektonHome, jobs);
        return { content: `Paused: ${job.name}` };
      }
      case "resume": {
        const id = params.id as string;
        const job = jobs.find(j => j.id === id);
        if (!job) return { content: `Job not found: ${id}`, isError: true };
        job.enabled = true;
        saveJobs(context.tektonHome, jobs);
        return { content: `Resumed: ${job.name}` };
      }
      case "run": {
        const id = params.id as string;
        const job = jobs.find(j => j.id === id);
        if (!job) return { content: `Job not found: ${id}`, isError: true };
        job.lastRun = new Date().toISOString();
        saveJobs(context.tektonHome, jobs);
        return { content: `Triggered run for: ${job.name}` };
      }
      case "remove": {
        const id = params.id as string;
        const idx = jobs.findIndex(j => j.id === id);
        if (idx === -1) return { content: `Job not found: ${id}`, isError: true };
        jobs.splice(idx, 1);
        saveJobs(context.tektonHome, jobs);
        return { content: `Removed: ${id}` };
      }
      case "update": {
        const id = params.id as string;
        const job = jobs.find(j => j.id === id);
        if (!job) return { content: `Job not found: ${id}`, isError: true };
        if (params.name) job.name = params.name as string;
        if (params.schedule) job.schedule = params.schedule as string;
        if (params.skill) job.skill = params.skill as string;
        saveJobs(context.tektonHome, jobs);
        return { content: `Updated: ${job.id} - ${job.name}` };
      }
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};
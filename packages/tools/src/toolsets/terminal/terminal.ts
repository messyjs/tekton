import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolContext, ToolResult } from "../../registry.js";
import { isDangerous } from "../../approval.js";
import { execa } from "execa";
import { executeWithBackend, spawnBackground, type BackendConfig } from "./backends.js";

interface BackgroundProcess {
  id: string;
  command: string;
  startedAt: Date;
  process: ReturnType<typeof execa>;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  completed: boolean;
}

const backgroundProcesses: Map<string, BackgroundProcess> = new Map();

/** Default backend config — local execution */
const defaultBackend: BackendConfig = { type: "local" };

export const terminalTool: ToolDefinition = {
  name: "terminal",
  toolset: "terminal",
  description:
    "Execute shell commands. Filesystem persists between calls. Set background=true for long-running servers. Do NOT use cat/head/tail — use read_file. Do NOT use grep/rg/find — use search_files.",
  parameters: Type.Object({
    command: Type.String({ description: "Shell command to execute" }),
    background: Type.Optional(Type.Boolean({ description: "Run in background (for servers/daemons)" })),
    timeout: Type.Optional(Type.Number({ description: "Timeout in ms (default 30000)" })),
    cwd: Type.Optional(Type.String({ description: "Working directory" })),
    notify_on_complete: Type.Optional(Type.Boolean({ description: "Notify when background process completes" })),
    backend: Type.Optional(Type.Union([
      Type.Literal("local"),
      Type.Literal("docker"),
      Type.Literal("ssh"),
      Type.Literal("singularity"),
      Type.Literal("modal"),
      Type.Literal("daytona"),
    ], { description: "Execution backend (default: local)" })),
  }),
  dangerous: false,
  async execute(params, context: ToolContext): Promise<ToolResult> {
    const command = params.command as string;
    const background = (params.background as boolean) ?? false;
    const timeout = (params.timeout as number) ?? 30000;
    const cwd = (params.cwd as string) ?? context.cwd;

    // Check for dangerous commands
    const dangerCheck = isDangerous(command);
    if (dangerCheck.dangerous) {
      if (context.approvalCallback) {
        const approved = await context.approvalCallback(command);
        if (!approved) {
          return { content: `Command blocked: ${dangerCheck.reason}. Denied by user.`, isError: true };
        }
      } else {
        return { content: `Command blocked: ${dangerCheck.reason}. Set approvalCallback to allow.`, isError: true };
      }
    }

    // Build backend config from params
    const backendType = (params.backend as string ?? "local") as BackendConfig["type"];
    const backendConfig: BackendConfig = { type: backendType };

    if (background) {
      if (backendType !== "local") {
        return {
          content: `Background processes are only supported with the local backend. Got: ${backendType}`,
          isError: true,
        };
      }

      const id = `bg_${Date.now()}`;
      const proc = spawnBackground(command, context, backendConfig);

      const bp: BackgroundProcess = {
        id,
        command,
        startedAt: new Date(),
        process: proc,
        exitCode: null,
        stdout: "",
        stderr: "",
        completed: false,
      };

      proc.stdout?.on("data", (data: Buffer) => {
        bp.stdout += data.toString();
      });
      proc.stderr?.on("data", (data: Buffer) => {
        bp.stderr += data.toString();
      });
      proc.then((result) => {
        bp.exitCode = result.exitCode ?? null;
        bp.completed = true;
        if (context.progressCallback && params.notify_on_complete) {
          context.progressCallback(`Background process ${id} completed (exit ${result.exitCode})`);
        }
      }).catch(() => {
        bp.completed = true;
      });

      backgroundProcesses.set(id, bp);
      return { content: `Background process started: ${id}\nCommand: ${command}`, metadata: { processId: id } };
    }

    // Foreground execution — use backend abstraction
    return executeWithBackend(backendConfig, {
      command,
      cwd,
      timeout,
      env: context.env,
      context,
    });
  },
};

export const processTool: ToolDefinition = {
  name: "process",
  toolset: "terminal",
  description:
    "Manage background processes started with terminal(background=true). Actions: list, poll, log, wait, kill, write.",
  parameters: Type.Object({
    action: Type.Union([
      Type.Literal("list"),
      Type.Literal("poll"),
      Type.Literal("log"),
      Type.Literal("wait"),
      Type.Literal("kill"),
      Type.Literal("write"),
    ]),
    session_id: Type.Optional(Type.String()),
    data: Type.Optional(Type.String()),
    timeout: Type.Optional(Type.Number()),
  }),
  async execute(params): Promise<ToolResult> {
    const action = params.action as string;

    switch (action) {
      case "list": {
        const procs = [...backgroundProcesses.values()].map(p => ({
          id: p.id,
          command: p.command,
          completed: p.completed,
          exitCode: p.exitCode,
          startedAt: p.startedAt.toISOString(),
        }));
        return { content: JSON.stringify(procs, null, 2) || "No background processes" };
      }
      case "poll": {
        const id = params.session_id as string;
        const bp = backgroundProcesses.get(id);
        if (!bp) return { content: `Process not found: ${id}`, isError: true };
        return {
          content: JSON.stringify({
            id: bp.id,
            completed: bp.completed,
            exitCode: bp.exitCode,
            stdoutTail: bp.stdout.slice(-500),
            stderrTail: bp.stderr.slice(-500),
          }),
        };
      }
      case "log": {
        const id = params.session_id as string;
        const bp = backgroundProcesses.get(id);
        if (!bp) return { content: `Process not found: ${id}`, isError: true };
        return { content: bp.stdout + (bp.stderr ? `\n--- STDERR ---\n${bp.stderr}` : "") };
      }
      case "wait": {
        const id = params.session_id as string;
        const bp = backgroundProcesses.get(id);
        if (!bp) return { content: `Process not found: ${id}`, isError: true };
        if (bp.completed) return { content: `Process ${id} already completed (exit ${bp.exitCode})` };
        const timeout = (params.timeout as number) ?? 30000;
        const start = Date.now();
        while (!bp.completed && Date.now() - start < timeout) {
          await new Promise(r => setTimeout(r, 500));
        }
        if (!bp.completed) return { content: `Process ${id} still running after ${timeout}ms`, isError: true };
        return { content: `Process ${id} completed (exit ${bp.exitCode})` };
      }
      case "kill": {
        const id = params.session_id as string;
        const bp = backgroundProcesses.get(id);
        if (!bp) return { content: `Process not found: ${id}`, isError: true };
        bp.process.kill();
        bp.completed = true;
        bp.exitCode = -1;
        return { content: `Process ${id} killed` };
      }
      case "write": {
        const id = params.session_id as string;
        const data = params.data as string;
        const bp = backgroundProcesses.get(id);
        if (!bp) return { content: `Process not found: ${id}`, isError: true };
        bp.process.stdin?.write(data + "\n");
        return { content: `Written to process ${id}` };
      }
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};
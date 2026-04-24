/**
 * Terminal backend abstraction.
 * Local backend is fully implemented. Others throw configuration errors.
 */
import type { ToolContext, ToolResult } from "../../registry.js";
import { execa } from "execa";

export type BackendType = "local" | "docker" | "ssh" | "singularity" | "modal" | "daytona";

export interface BackendConfig {
  type: BackendType;
  // Docker
  dockerImage?: string;
  dockerCpuLimit?: string;
  dockerMemoryLimit?: string;
  // SSH
  sshHost?: string;
  sshUser?: string;
  sshKey?: string;
  // Modal
  modalApp?: string;
  // Daytona
  daytonaWorkspace?: string;
}

export interface ExecOptions {
  command: string;
  cwd: string;
  timeout: number;
  env: Record<string, string>;
  context: ToolContext;
}

const NOT_CONFIGURED = (backend: string) =>
  `Backend "${backend}" not yet configured — set terminal.backend in config.yaml. See docs/SETUP.md for instructions.`;

/** Execute a command using the specified backend */
export async function executeWithBackend(
  config: BackendConfig,
  opts: ExecOptions,
): Promise<ToolResult> {
  switch (config.type) {
    case "local":
      return executeLocal(opts);
    case "docker":
      return executeDocker(opts, config);
    case "ssh":
      return executeSSH(opts, config);
    case "singularity":
      return executeSingularity(opts, config);
    case "modal":
      return executeModal(opts, config);
    case "daytona":
      return executeDaytona(opts, config);
    default:
      return { content: `Unknown backend: ${config.type}`, isError: true };
  }
}

async function executeLocal(opts: ExecOptions): Promise<ToolResult> {
  try {
    const result = await execa(opts.command, {
      shell: true,
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      reject: false,
      timeout: opts.timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    let output = "";
    if (result.stdout) output += result.stdout;
    if (result.stderr) output += (output ? "\n" : "") + result.stderr;

    const metadata: Record<string, unknown> = { exitCode: result.exitCode };
    if (result.timedOut) metadata.timedOut = true;

    return {
      content: output || "(no output)",
      isError: result.exitCode !== 0,
      metadata,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: `Execution error: ${message}`, isError: true };
  }
}

async function executeDocker(opts: ExecOptions, config: BackendConfig): Promise<ToolResult> {
  const image = config.dockerImage ?? "ubuntu:22.04";
  const cpuFlag = config.dockerCpuLimit ? ` --cpus="${config.dockerCpuLimit}"` : "";
  const memFlag = config.dockerMemoryLimit ? ` --memory="${config.dockerMemoryLimit}"` : "";

  const dockerCmd = `docker run --rm${cpuFlag}${memFlag} -w /workspace alpine sh -c ${JSON.stringify(opts.command)}`;
  try {
    const result = await execa(dockerCmd, {
      shell: true,
      timeout: opts.timeout,
      reject: false,
      maxBuffer: 10 * 1024 * 1024,
    });
    let output = "";
    if (result.stdout) output += result.stdout;
    if (result.stderr) output += (output ? "\n" : "") + result.stderr;
    return { content: output || "(no output)", isError: result.exitCode !== 0, metadata: { exitCode: result.exitCode, backend: "docker" } };
  } catch (err) {
    return { content: `Docker execution error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
  }
}

async function executeSSH(opts: ExecOptions, config: BackendConfig): Promise<ToolResult> {
  if (!config.sshHost) {
    return { content: NOT_CONFIGURED("ssh"), isError: true };
  }
  const user = config.sshUser ?? "root";
  const keyFlag = config.sshKey ? ` -i ${config.sshKey}` : "";
  const sshCmd = `ssh${keyFlag} ${user}@${config.sshHost} ${JSON.stringify(`cd ${opts.cwd} 2>/dev/null || true; ${opts.command}`)}`;
  try {
    const result = await execa(sshCmd, {
      shell: true,
      timeout: opts.timeout,
      reject: false,
      maxBuffer: 10 * 1024 * 1024,
    });
    let output = "";
    if (result.stdout) output += result.stdout;
    if (result.stderr) output += (output ? "\n" : "") + result.stderr;
    return { content: output || "(no output)", isError: result.exitCode !== 0, metadata: { exitCode: result.exitCode, backend: "ssh" } };
  } catch (err) {
    return { content: `SSH execution error: ${err instanceof Error ? err.message : String(err)}`, isError: true };
  }
}

async function executeSingularity(_opts: ExecOptions, _config: BackendConfig): Promise<ToolResult> {
  return { content: NOT_CONFIGURED("singularity"), isError: true };
}

async function executeModal(_opts: ExecOptions, _config: BackendConfig): Promise<ToolResult> {
  return { content: NOT_CONFIGURED("modal"), isError: true };
}

async function executeDaytona(_opts: ExecOptions, _config: BackendConfig): Promise<ToolResult> {
  return { content: NOT_CONFIGURED("daytona"), isError: true };
}

/** Start a background process using the specified backend */
export function spawnBackground(
  command: string,
  context: ToolContext,
  config?: BackendConfig,
): ReturnType<typeof execa> {
  const backend = config?.type ?? "local";
  if (backend !== "local") {
    // Only local backend supports background processes for now
    throw new Error(`Background processes are only supported with the local backend. Got: ${backend}`);
  }

  return execa(command, {
    shell: true,
    cwd: context.cwd,
    env: { ...process.env, ...context.env },
    reject: false,
    all: true,
  });
}
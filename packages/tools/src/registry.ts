import type { TSchema } from "@sinclair/typebox";

export interface ToolContext {
  cwd: string;
  taskId: string;
  tektonHome: string;
  env: Record<string, string>;
  approvalCallback?: (command: string) => Promise<boolean>;
  progressCallback?: (message: string) => void;
  agentPool?: any; // AgentPool from @tekton/core, optional for delegation
}

export interface ToolResult {
  content: string;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  toolset: string;
  description: string;
  parameters: TSchema;
  requiresEnv?: string[];
  requiresPlatform?: string[];
  dangerous?: boolean;
  interactive?: boolean;
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolSchema {
  name: string;
  toolset: string;
  description: string;
  parameters: TSchema;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getByToolset(toolset: string): ToolDefinition[] {
    const result: ToolDefinition[] = [];
    for (const tool of this.tools.values()) {
      if (tool.toolset === toolset) result.push(tool);
    }
    return result;
  }

  listToolsets(): string[] {
    const toolsets = new Set<string>();
    for (const tool of this.tools.values()) {
      toolsets.add(tool.toolset);
    }
    return [...toolsets].sort();
  }

  listTools(): Array<{ name: string; toolset: string; description: string }> {
    const result: Array<{ name: string; toolset: string; description: string }> = [];
    for (const tool of this.tools.values()) {
      result.push({ name: tool.name, toolset: tool.toolset, description: tool.description });
    }
    return result;
  }

  getAvailable(env: Record<string, string>, platform: string): ToolDefinition[] {
    const result: ToolDefinition[] = [];
    for (const tool of this.tools.values()) {
      // Check environment requirements
      if (tool.requiresEnv) {
        const hasAll = tool.requiresEnv.every(key => env[key] && env[key].length > 0);
        if (!hasAll) continue;
      }
      // Check platform requirements
      if (tool.requiresPlatform) {
        if (!tool.requiresPlatform.includes(platform)) continue;
      }
      result.push(tool);
    }
    return result;
  }

  getSchemas(toolNames?: string[]): ToolSchema[] {
    const names = toolNames ?? [...this.tools.keys()];
    const result: ToolSchema[] = [];
    for (const name of names) {
      const tool = this.tools.get(name);
      if (tool) {
        result.push({
          name: tool.name,
          toolset: tool.toolset,
          description: tool.description,
          parameters: tool.parameters,
        });
      }
    }
    return result;
  }

  async execute(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { content: `Tool not found: ${name}`, isError: true };
    }

    // Check dangerous tool approval
    if (tool.dangerous && context.approvalCallback) {
      const approved = await context.approvalCallback(name);
      if (!approved) {
        return { content: `Tool '${name}' requires approval and was denied.`, isError: true };
      }
    }

    try {
      return await tool.execute(params, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: `Tool execution error (${name}): ${message}`, isError: true };
    }
  }

  registerByPreset(preset: string, presets: Record<string, string[]>): number {
    const toolsets = presets[preset];
    if (!toolsets) throw new Error(`Unknown preset: ${preset}`);
    if (toolsets.includes("*")) return 0; // wildcard = all, must use registerAllTools-style

    let registered = 0;
    for (const tool of this.tools.values()) {
      if (toolsets.includes(tool.toolset)) registered++;
    }
    return registered;
  }

  get count(): number {
    return this.tools.size;
  }
}

export const registry = new ToolRegistry();
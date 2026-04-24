import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "../../registry.js";
import type { ToolResult } from "../../registry.js";

export const mcpDiscoverTool: ToolDefinition = {
  name: "mcp_discover",
  toolset: "mcp",
  description: "Connect to MCP server and discover available tools.",
  parameters: Type.Object({
    server: Type.String({ description: "MCP server name or URL" }),
    transport: Type.Optional(Type.Union([Type.Literal("stdio"), Type.Literal("http")])),
  }),
  async execute(params): Promise<ToolResult> {
    return { content: `MCP tool discovery for "${params.server}" — requires MCP client implementation (Phase 9+). Configure MCP servers in config.yaml.` };
  },
};

export const mcpCallTool: ToolDefinition = {
  name: "mcp_call",
  toolset: "mcp",
  description: "Call a tool from a connected MCP server.",
  parameters: Type.Object({
    server: Type.String({ description: "MCP server name" }),
    tool: Type.String({ description: "Tool name on the server" }),
    arguments: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  }),
  async execute(params): Promise<ToolResult> {
    return { content: `MCP call to ${params.server}/${params.tool} — requires active MCP connection. Connect servers first with mcp_discover.` };
  },
};

export const mcpListServersTool: ToolDefinition = {
  name: "mcp_list_servers",
  toolset: "mcp",
  description: "List configured MCP servers and their connection status.",
  parameters: Type.Object({}),
  async execute(): Promise<ToolResult> {
    return { content: "No MCP servers configured. Add servers in config.yaml under mcp.servers." };
  },
};
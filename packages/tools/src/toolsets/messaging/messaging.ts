import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "../../registry.js";
import type { ToolResult } from "../../registry.js";

export const sendMessageTool: ToolDefinition = {
  name: "send_message",
  toolset: "messaging",
  description: "Send message to connected platform. Action: 'send' or 'list' (list targets).",
  parameters: Type.Object({
    action: Type.Union([Type.Literal("send"), Type.Literal("list")]),
    platform: Type.Optional(Type.String({ description: "Platform name (telegram, discord, slack)" })),
    target: Type.Optional(Type.String({ description: "Target channel or user ID" })),
    message: Type.Optional(Type.String({ description: "Message content" })),
  }),
  async execute(params): Promise<ToolResult> {
    const action = params.action as string;
    if (action === "list") {
      // Gateway integration: list connected platforms
      // Requires @tekton/gateway GatewayRunner to be running
      return { content: "Use /tekton:gateway platforms to list connected messaging platforms." };
    }
    if (action === "send" && params.platform && params.target && params.message) {
      // Gateway integration: send via platform adapter
      // Requires @tekton/gateway GatewayRunner to be running
      return { content: `Message delivery to ${params.platform}:${params.target} requires an active gateway. Use /tekton:gateway start first.` };
    }
    return { content: "Messaging requires an active gateway. Use /tekton:gateway start to begin, then /tekton:gateway platforms to see connected platforms." };
  },
};
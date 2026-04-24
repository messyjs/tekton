import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";

export const imageGenerateTool: ToolDefinition = {
  name: "image_generate",
  toolset: "image_gen",
  description: "Generate images from text prompts using FAL.ai or configured provider.",
  parameters: Type.Object({
    prompt: Type.String({ description: "Image generation prompt" }),
    size: Type.Optional(Type.Union([Type.Literal("1024x1024"), Type.Literal("1024x1792"), Type.Literal("1792x1024")])),
    model: Type.Optional(Type.String({ description: "Model to use (default: flux-schnell)" })),
  }),
  requiresEnv: ["FAL_KEY"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.FAL_KEY) {
      return { content: "Image generation requires FAL_KEY environment variable.", isError: true };
    }
    return { content: `Image generation placeholder. Prompt: "${params.prompt}". Size: ${params.size ?? "1024x1024"}. Model: ${params.model ?? "flux-schnell"}. FAL_KEY configured.` };
  },
};
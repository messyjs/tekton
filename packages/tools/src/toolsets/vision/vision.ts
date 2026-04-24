import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import fs from "node:fs";

export const visionAnalyzeTool: ToolDefinition = {
  name: "vision_analyze",
  toolset: "vision",
  description: "Analyze images using AI vision. Supports local files and URLs.",
  parameters: Type.Object({
    image: Type.String({ description: "Image file path or URL" }),
    prompt: Type.String({ description: "Question about the image" }),
  }),
  async execute(params): Promise<ToolResult> {
    const image = params.image as string;
    const prompt = params.prompt as string;

    if (!image.startsWith("http")) {
      if (!fs.existsSync(image)) {
        return { content: `Image not found: ${image}`, isError: true };
      }
    }

    return {
      content: `Vision analysis requires a configured vision model. Image: ${image}, Prompt: "${prompt}". Set up an auxiliary vision model (e.g., Gemini 2.5 Flash) in config to enable this tool.`,
    };
  },
};
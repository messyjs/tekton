import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";
import fs from "node:fs";
import path from "node:path";

export const skillsListTool: ToolDefinition = {
  name: "skills_list",
  toolset: "skills",
  description: "List available skills (name + description).",
  parameters: Type.Object({
    filter: Type.Optional(Type.String({ description: "Filter by name or description" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const skillsDir = path.join(context.tektonHome, "skills");
    if (!fs.existsSync(skillsDir)) {
      return { content: "No skills directory found. Create skills at ~/.tekton/skills/" };
    }

    const filter = (params.filter as string ?? "").toLowerCase();
    const entries: string[] = [];

    for (const dir of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const skillFile = path.join(skillsDir, dir.name, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        const content = fs.readFileSync(skillFile, "utf-8");
        const desc = content.split("\n").find(l => l.startsWith("#"))?.replace(/^#+\s*/, "") ?? dir.name;
        if (!filter || dir.name.toLowerCase().includes(filter) || desc.toLowerCase().includes(filter)) {
          entries.push(`- ${dir.name}: ${desc}`);
        }
      }
    }

    return { content: entries.length > 0 ? entries.join("\n") : "No skills found." };
  },
};

export const skillViewTool: ToolDefinition = {
  name: "skill_view",
  toolset: "skills",
  description: "Load full skill content or specific reference file.",
  parameters: Type.Object({
    name: Type.String({ description: "Skill name" }),
    file: Type.Optional(Type.String({ description: "Specific file within skill (default: SKILL.md)" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const name = params.name as string;
    const file = (params.file as string) ?? "SKILL.md";
    const filePath = path.join(context.tektonHome, "skills", name, file);

    if (!fs.existsSync(filePath)) {
      return { content: `Skill file not found: ${filePath}`, isError: true };
    }

    return { content: fs.readFileSync(filePath, "utf-8") };
  },
};

export const skillManageTool: ToolDefinition = {
  name: "skill_manage",
  toolset: "skills",
  description: "Create, edit, or delete skills.",
  parameters: Type.Object({
    action: Type.Union([Type.Literal("create"), Type.Literal("remove")]),
    name: Type.String({ description: "Skill name" }),
    description: Type.Optional(Type.String({ description: "Skill description (for create)" })),
    content: Type.Optional(Type.String({ description: "Skill content (for create)" })),
  }),
  async execute(params, context): Promise<ToolResult> {
    const action = params.action as string;
    const name = params.name as string;
    const skillDir = path.join(context.tektonHome, "skills", name);

    switch (action) {
      case "create": {
        fs.mkdirSync(skillDir, { recursive: true });
        const content = (params.content as string) ?? `# ${name}\n\n${params.description ?? "Custom skill"}\n`;
        fs.writeFileSync(path.join(skillDir, "SKILL.md"), content, "utf-8");
        return { content: `Created skill: ${name}` };
      }
      case "remove": {
        if (fs.existsSync(skillDir)) {
          fs.rmSync(skillDir, { recursive: true, force: true });
          return { content: `Removed skill: ${name}` };
        }
        return { content: `Skill not found: ${name}`, isError: true };
      }
      default:
        return { content: `Unknown action: ${action}`, isError: true };
    }
  },
};
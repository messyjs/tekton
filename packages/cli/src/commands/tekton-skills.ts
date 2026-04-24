import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatTable, truncate } from "./types.js";

export function createSkillsCommand(): CommandRegistration {
  return {
    name: "tekton:skills",
    description: "List, search, view, toggle, and manage skills",
    subcommands: {
      "list": "List all loaded skills",
      "search": "Search skills by query",
      "info": "View detailed info about a skill",
      "toggle": "Enable or disable a skill",
      "export": "Export skills to a file",
      "import": "Import skills from a file (stub)",
      "forget": "Remove a skill (with confirmation)",
      "create": "Create a new skill (stub for Phase 12)",
      "hub": "Browse skill hub (stub for Phase 12)",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;
      const skills = ctx.hermesBridge.skills;

      switch (sub) {
        case "list": {
          const allSkills = skills.listSkills();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(allSkills, null, 2));
            return;
          }
          if (allSkills.length === 0) {
            piCtx.ui.notify("No skills loaded yet.");
            return;
          }
          const rows = allSkills.map(s => [
            s.name,
            truncate(s.description, 40),
            String(s.confidence ?? 0.5),
          ]);
          piCtx.ui.notify(formatTable(["Name", "Description", "Confidence"], rows));
          return;
        }

        case "search": {
          const query = args.positional.join(" ");
          if (!query) {
            piCtx.ui.notify("Usage: /tekton:skills search <query>");
            return;
          }
          const results = skills.searchSkills(query);
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(results, null, 2));
            return;
          }
          if (results.length === 0) {
            piCtx.ui.notify(`No skills matching "${query}"`);
            return;
          }
          const rows = results.map(s => [
            s.name,
            truncate(s.description, 40),
            String(s.confidence ?? 0.5),
          ]);
          piCtx.ui.notify(formatTable(["Name", "Description", "Confidence"], rows));
          return;
        }

        case "info": {
          const skillName = args.positional[0];
          if (!skillName) {
            piCtx.ui.notify("Usage: /tekton:skills info <name>");
            return;
          }
          const skill = skills.getSkill(skillName);
          if (!skill) {
            piCtx.ui.notify(`Skill "${skillName}" not found.`);
            return;
          }
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(skill, null, 2));
            return;
          }
          const confidence = skill.metadata?.tekton?.confidence ?? 0.5;
          const lines = [
            `## ${skill.name}`,
            `${skill.description}`,
            `Version: ${skill.version ?? "0.1.0"}`,
            `Confidence: ${confidence}`,
            `Source: ${skill.source}`,
            `Enabled: ${skill.enabled}`,
            ``,
            skill.body,
          ];
          piCtx.ui.notify(lines.join("\n"));
          return;
        }

        case "toggle": {
          const skillName = args.positional[0];
          if (!skillName) {
            piCtx.ui.notify("Usage: /tekton:skills toggle <name>");
            return;
          }
          const skill = skills.getSkill(skillName);
          if (!skill) {
            piCtx.ui.notify(`Skill "${skillName}" not found.`);
            return;
          }
          const newState = !skill.enabled;
          skills.toggleSkill(skillName, newState);
          piCtx.ui.notify(`Skill "${skillName}" ${newState ? "enabled" : "disabled"}`);
          return;
        }

        case "export": {
          const allSkills = skills.listSkills();
          const skillDetails = allSkills.map(s => {
            const full = skills.getSkill(s.name);
            return {
              name: s.name,
              description: s.description,
              confidence: s.confidence,
              body: full?.body ?? "",
            };
          });
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(skillDetails, null, 2));
          } else {
            piCtx.ui.notify(`Exported ${allSkills.length} skills. Use --json to get the data.\n${allSkills.length} skills available.`);
          }
          return;
        }

        case "import": {
          piCtx.ui.notify("⚠️ Skill import is a stub for Phase 12. Not yet implemented.");
          return;
        }

        case "forget": {
          const skillName = args.positional[0];
          if (!skillName) {
            piCtx.ui.notify("Usage: /tekton:skills forget <name>");
            return;
          }
          if (!(args.flags.force === true)) {
            piCtx.ui.notify(`⚠️ This will remove skill "${skillName}". Use --force to confirm.`);
            return;
          }
          const skill = skills.getSkill(skillName);
          if (!skill) {
            piCtx.ui.notify(`Skill "${skillName}" not found.`);
            return;
          }
          try {
            skills.deleteSkill(skillName);
            piCtx.ui.notify(`🗑️ Skill "${skillName}" deleted.`);
          } catch (err) {
            piCtx.ui.notify(`Error deleting skill: ${err instanceof Error ? err.message : String(err)}`, "error");
          }
          return;
        }

        case "create": {
          piCtx.ui.notify("⚠️ Skill creation is a stub for Phase 12. Interactive skill editor coming soon.");
          return;
        }

        case "hub": {
          piCtx.ui.notify("⚠️ Skill hub browsing is a stub for Phase 12. Community skill sharing coming soon.");
          return;
        }

        default: {
          const allSkills = skills.listSkills();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(allSkills, null, 2));
            return;
          }
          if (allSkills.length === 0) {
            piCtx.ui.notify("No skills loaded yet. Use /tekton:skills <subcommand> for more options.");
            return;
          }
          const rows = allSkills.map(s => [
            s.name,
            truncate(s.description, 40),
            String(s.confidence ?? 0.5),
          ]);
          piCtx.ui.notify(formatTable(["Name", "Description", "Confidence"], rows));
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["list", "search", "info", "toggle", "export", "import", "forget", "create", "hub"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Skills ${s}` }));
    },
  };
}
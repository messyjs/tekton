/**
 * /tekton:knowledge — Manage the Knowledge Library: ingest, search, list, remove.
 */
import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";

export function createKnowledgeCommand(): CommandRegistration {
  return {
    name: "tekton:knowledge",
    description: "Manage Knowledge Library: ingest documents, search, list topics",
    subcommands: {
      "add": "Ingest a file or directory",
      "list": "List all ingested documents",
      "search": "Search the library",
      "topics": "List all detected topics",
      "remove": "Remove a document by ID",
      "rebuild": "Re-index all documents",
      "on": "Enable auto-injection",
      "off": "Disable auto-injection",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;
      const config = ctx.config as any;

      switch (sub) {
        case "add": {
          const path = args.positional?.[0] ?? "";
          if (!path) {
            piCtx.ui.notify("Usage: /tekton:knowledge add <path>");
            return;
          }
          piCtx.ui.notify(`Ingesting: ${path}... (stub — requires KnowledgeIngestor runtime)`);
          return;
        }

        case "list": {
          piCtx.ui.notify("Knowledge Library: Document listing (stub — requires runtime)\n\nUse the Dashboard for full library management.");
          return;
        }

        case "search": {
          const query = args.positional?.join(" ") ?? "";
          if (!query) {
            piCtx.ui.notify("Usage: /tekton:knowledge search <query>");
            return;
          }
          piCtx.ui.notify(`Searching for: "${query}" (stub — requires runtime)`);
          return;
        }

        case "topics": {
          const topics = config?.knowledge?.topics ?? {};
          const topicNames = Object.keys(topics);
          if (topicNames.length === 0) {
            piCtx.ui.notify("No topics configured. Ingest documents to auto-detect topics.");
            return;
          }
          const rows: Array<[string, string]> = topicNames.map(name => [
            name,
            (topics[name] as string[]).join(", "),
          ]);
          piCtx.ui.notify(formatBox("Knowledge Topics", rows));
          return;
        }

        case "remove": {
          const id = args.positional?.[0] ?? "";
          if (!id) {
            piCtx.ui.notify("Usage: /tekton:knowledge remove <document-id>");
            return;
          }
          piCtx.ui.notify(`Removing document ${id}... (stub — requires runtime)`);
          return;
        }

        case "rebuild": {
          piCtx.ui.notify("Re-indexing all documents... (stub — requires runtime)");
          return;
        }

        case "on": {
          if (config.knowledge) {
            config.knowledge.enabled = true;
            config.knowledge.autoInject = true;
          } else {
            config.knowledge = { enabled: true, autoInject: true };
          }
          piCtx.ui.notify("Knowledge auto-injection enabled.");
          return;
        }

        case "off": {
          if (config.knowledge) {
            config.knowledge.autoInject = false;
          }
          piCtx.ui.notify("Knowledge auto-injection disabled.");
          return;
        }

        default: {
          const enabled = config?.knowledge?.enabled ?? false;
          const autoInject = config?.knowledge?.autoInject ?? true;
          const storePath = config?.knowledge?.storePath ?? "~/.tekton/knowledge/";
          const maxTokens = config?.knowledge?.maxInjectTokens ?? 1500;
          const maxChunks = config?.knowledge?.maxInjectChunks ?? 3;

          const rows: Array<[string, string]> = [
            ["Enabled", String(enabled)],
            ["Auto-inject", String(autoInject)],
            ["Store path", storePath],
            ["Max inject tokens", String(maxTokens)],
            ["Max inject chunks", String(maxChunks)],
          ];
          piCtx.ui.notify(formatBox("Knowledge Library", rows));
        }
      }
    },
  };
}
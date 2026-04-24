import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatBox } from "./types.js";
import { compress, estimateTokens, type CompressionTier } from "@tekton/core";

export function createCompressCommand(): CommandRegistration {
  return {
    name: "tekton:compress",
    description: "Run compression on context or show compression metrics",
    subcommands: {
      "stats": "Show compression statistics",
      "tier": "Show current compression tier settings",
      "file": "Compress a file and show metrics",
      "demo": "Demo compression on sample text",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      switch (sub) {
        case "stats": {
          const stats = ctx.telemetry.getCompressionStats();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(stats, null, 2));
          } else {
            const rows: Array<[string, string]> = [
              ["Total saved", `${stats.totalSaved} tokens`],
              ["Avg ratio", stats.averageRatio.toFixed(3)],
            ];
            rows.push(["Total saved", `${stats.totalSaved} tokens`]);
            rows.push(["Avg ratio", stats.averageRatio.toFixed(3)]);
            piCtx.ui.notify(formatBox("Compression Stats", rows));
          }
          return;
        }

        case "tier": {
          const defaultTier = ctx.config.compression.defaultTier;
          const enabled = ctx.config.compression.enabled;
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ defaultTier, enabled }, null, 2));
          } else {
            piCtx.ui.notify(`Compression tier: ${defaultTier}\nEnabled: ${enabled}`);
          }
          return;
        }

        case "file": {
          const filePath = args.positional[0];
          if (!filePath) {
            piCtx.ui.notify("Usage: /tekton:compress file <path> [--tier lite|full|ultra]");
            return;
          }
          try {
            const fs = await import("node:fs");
            const content = fs.readFileSync(filePath, "utf-8");
            const tier = (args.flags.tier as CompressionTier) ?? ctx.config.compression.defaultTier;
            const originalTokens = estimateTokens(content);
            const compressed = compress(content, tier);
            const compressedTokens = estimateTokens(compressed);
            const ratio = content.length > 0 ? compressed.length / content.length : 1;

            piCtx.ui.notify(
              `Compression (${tier}): ${filePath}\n` +
              `  Original:   ${originalTokens} tokens (${content.length} chars)\n` +
              `  Compressed: ${compressedTokens} tokens (${compressed.length} chars)\n` +
              `  Ratio:      ${ratio.toFixed(3)}\n` +
              `  Saved:      ${originalTokens - compressedTokens} tokens`
            );
          } catch (err) {
            piCtx.ui.notify(`Error reading file: ${err instanceof Error ? err.message : String(err)}`, "error");
          }
          return;
        }

        case "demo": {
          const sampleText = "The quick brown fox jumps over the lazy dog. In order to properly implement this function, we need to consider the following parameters and their default values. The implementation should be done in a way that is both efficient and maintainable.";
          const tiers: CompressionTier[] = ["lite", "full", "ultra"];
          const results = tiers.map(tier => {
            const compressed = compress(sampleText, tier);
            const ratio = compressed.length / sampleText.length;
            return { tier, original: sampleText.length, compressed: compressed.length, ratio, text: compressed };
          });

          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify({ original: sampleText, results }, null, 2));
          } else {
            const lines = [`Original (${sampleText.length} chars):`, `  ${sampleText}`, ""];

            for (const r of results) {
              lines.push(`${r.tier} (${r.compressed} chars, ratio ${r.ratio.toFixed(3)}):`);
              lines.push(`  ${r.text}`);
              lines.push("");
            }

            piCtx.ui.notify(lines.join("\n"));
          }
          return;
        }

        default: {
          const stats = ctx.telemetry.getCompressionStats();
          if (hasJsonFlag(args)) {
            piCtx.ui.notify(JSON.stringify(stats, null, 2));
          } else {
            piCtx.ui.notify(
              `Compression stats: ${stats.totalSaved} tokens saved\n` +
              `Average ratio: ${stats.averageRatio.toFixed(3)}\n\n` +
              `Subcommands: stats, tier, file, demo`
            );
          }
        }
      }
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["stats", "tier", "file", "demo"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Compress ${s}` }));
    },
  };
}
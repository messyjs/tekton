import type { CommandRegistration, CommandContext, ParsedArgs } from "./types.js";
import { hasJsonFlag, formatTable, formatBox } from "./types.js";
import { EXPANDED_PROVIDERS as PROVIDERS, getProviderIds } from "@tekton/core";

export function createModelsCommand(): CommandRegistration {
  return {
    name: "tekton:models",
    description: "List models, providers, active model, costs, and routing info",
    subcommands: {
      "list": "List all available models",
      "providers": "List all providers",
      "cost": "Show cost report",
    },
    handler: async (args, ctx, _pi, piCtx) => {
      const sub = args.subcommand;

      if (sub === "providers") {
        return handleProviders(args, piCtx);
      }

      if (sub === "cost") {
        return handleCost(args, ctx, piCtx);
      }

      // Default: show status
      return handleStatus(args, ctx, piCtx);
    },
    getArgumentCompletions: (prefix: string) => {
      const subs = ["list", "providers", "cost"];
      return subs.filter(s => s.startsWith(prefix)).map(s => ({ value: s, label: s, description: `Show ${s}` }));
    },
  };
}

function handleStatus(args: ParsedArgs, ctx: CommandContext, piCtx: any): void {
  const decisions = ctx.modelRouter.getRecentDecisions(1);
  const activeModel = decisions[0]?.model ?? ctx.config.models.fast.model;
  const activeProvider = decisions[0]?.provider ?? ctx.config.models.fast.provider;
  const costTracker = ctx.modelRouter.getCostTracker();
  const totalCost = costTracker.getTotalCost();
  const savings = costTracker.getCostSavings();

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify({
      activeModel,
      activeProvider,
      routingMode: ctx.modelRouter.getMode(),
      fast: ctx.config.models.fast,
      deep: ctx.config.models.deep,
      fallbackChain: ctx.config.models.fallbackChain,
      totalCost,
      savings,
      providerCount: getProviderIds().length,
    }, null, 2));
    return;
  }

  const rows: Array<[string, string]> = [
    ["Active", `${activeModel} (${activeProvider})`],
    ["Routing", ctx.modelRouter.getMode()],
    ["Total cost", `$${totalCost.toFixed(4)}`],
    ["Savings", `$${savings.saved.toFixed(4)} (${savings.savedPercent.toFixed(1)}%)`],
    ["Fast model", `${ctx.config.models.fast.model} [${ctx.config.models.fast.provider}]`],
    ["Deep model", `${ctx.config.models.deep.model} [${ctx.config.models.deep.provider}]`],
    ["Providers", `${getProviderIds().length} configured`],
  ];

  if (ctx.config.models.fallbackChain.length > 0) {
    rows.push(["Fallback chain", ctx.config.models.fallbackChain.map(f => `${f.model} (${f.provider})`).join(" → ")]);
  }

  let output = formatBox("Models", rows);

  // Recent cost by model
  const byModel = costTracker.getCostByModel();
  if (Object.keys(byModel).length > 0) {
    const modelRows = Object.entries(byModel).map(([model, data]) =>
      [model, `${data.calls} calls`, `$${data.cost.toFixed(4)}`, `${data.inputTokens + data.outputTokens} tok`] as [string, string, string, string]
    );
    output += "\n\n" + formatTable(["Model", "Calls", "Cost", "Tokens"], modelRows);
  }

  // Recent decisions
  const recent = ctx.modelRouter.getRecentDecisions(5);
  if (recent.length > 0) {
    output += "\n\nRecent routing decisions:\n";
    output += recent.map(d => {
      let line = `  ${d.model} (${d.provider}) — ${d.reason} [$${d.estimatedCost.toFixed(4)}]`;
      if (d.ruleMatch) line += ` [rule: ${d.ruleMatch}]`;
      return line;
    }).join("\n");
  }

  output += "\n\nSubcommands: list, providers, cost";
  piCtx.ui.notify(output);
}

function handleProviders(args: ParsedArgs, piCtx: any): void {
  const providerIds = getProviderIds();

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify(PROVIDERS, null, 2));
    return;
  }

  const rows = Object.entries(PROVIDERS).map(([id, p]) => {
    const modelCount = p.models.length;
    const hasKey = p.apiKeyEnv ? `$${p.apiKeyEnv}` : ((p as any).local ? 'local' : '—');
    const costIn = p.costPer1KInput ? `$${p.costPer1KInput}/1K` : "—";
    return [`  ${id}`, p.name, `${modelCount}`, hasKey, costIn] as [string, string, string, string, string];
  });

  let output = formatBox("Providers", [
    ["Total", `${providerIds.length} providers`],
  ]);
  output += "\n\n" + formatTable(["ID", "Name", "Models", "Auth", "Cost/1K in"], rows);
  piCtx.ui.notify(output);
}

function handleCost(args: ParsedArgs, ctx: CommandContext, piCtx: any): void {
  const costTracker = ctx.modelRouter.getCostTracker();
  const report = costTracker.getReport();

  if (hasJsonFlag(args)) {
    piCtx.ui.notify(JSON.stringify(report, null, 2));
    return;
  }

  const rows: Array<[string, string]> = [
    ["Total cost", `$${report.totalCost.toFixed(4)}`],
    ["Total input tokens", String(report.totalInputTokens)],
    ["Total output tokens", String(report.totalOutputTokens)],
    ["Savings vs deep-only", `$${report.savings.saved.toFixed(4)} (${report.savings.savedPercent.toFixed(1)}%)`],
    ["Without routing", `$${report.savings.withoutRouting.toFixed(4)}`],
    ["With routing", `$${report.savings.withRouting.toFixed(4)}`],
  ];

  let output = formatBox("Cost Report", rows);

  // Cost by model
  if (Object.keys(report.byModel).length > 0) {
    const modelRows = Object.entries(report.byModel).map(([model, data]) =>
      [`  ${model}`, `${data.calls}`, `$${data.cost.toFixed(4)}`, `${data.inputTokens + data.outputTokens}`] as [string, string, string, string]
    );
    output += "\n\nBy model:\n" + formatTable(["Model", "Calls", "Cost", "Tokens"], modelRows);
  }

  // Cost by provider
  if (Object.keys(report.byProvider).length > 0) {
    const provRows = Object.entries(report.byProvider).map(([prov, data]) =>
      [`  ${prov}`, `${data.calls}`, `$${data.cost.toFixed(4)}`] as [string, string, string]
    );
    output += "\n\nBy provider:\n" + formatTable(["Provider", "Calls", "Cost"], provRows);
  }

  piCtx.ui.notify(output);
}
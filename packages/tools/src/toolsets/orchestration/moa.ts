import { Type } from "@sinclair/typebox";
import type { ToolDefinition, ToolResult } from "../../registry.js";

// ── Mixture of Agents Tool ────────────────────────────────────────────

/**
 * Route a hard problem through multiple LLMs and aggregate their responses.
 * This is the "Mixture of Agents" approach: gather diverse perspectives,
 * then synthesize the best answer.
 *
 * Flow:
 * 1. Send the prompt to N "reference" models via OpenRouter
 * 2. Collect all responses
 * 3. Send all responses + original prompt to an "aggregator" model
 * 4. Return the synthesized answer
 */

export interface MoAResponse {
  referenceResponses: Array<{
    model: string;
    provider: string;
    content: string;
    latencyMs: number;
    error?: string;
  }>;
  aggregatedResponse: string;
  aggregatorModel: string;
  totalLatencyMs: number;
  totalCostEstimate: number;
}

export interface MoAConfig {
  /** Default reference models for gathering perspectives */
  defaultReferenceModels: Array<{ model: string; provider: string }>;
  /** Default aggregator model */
  defaultAggregator: { model: string; provider: string };
  /** Maximum concurrent reference model calls */
  maxConcurrency: number;
  /** Timeout per reference call in ms */
  timeoutMs: number;
  /** Whether to include failed reference calls in the aggregation context */
  includeFailures: boolean;
}

const DEFAULT_MOA_CONFIG: MoAConfig = {
  defaultReferenceModels: [
    { model: "anthropic/claude-3.5-sonnet", provider: "openrouter" },
    { model: "openai/gpt-4o", provider: "openrouter" },
    { model: "google/gemini-2.5-flash", provider: "openrouter" },
    { model: "meta-llama/llama-3.3-70b-instruct", provider: "openrouter" },
  ],
  defaultAggregator: { model: "anthropic/claude-3.5-sonnet", provider: "openrouter" },
  maxConcurrency: 4,
  timeoutMs: 120000,
  includeFailures: false,
};

export const mixtureOfAgentsTool: ToolDefinition = {
  name: "mixture_of_agents",
  toolset: "orchestration",
  description: "Route hard problems through multiple LLMs collaboratively. Gathers diverse perspectives from reference models and synthesizes the best answer via an aggregator model. Requires OPENROUTER_API_KEY.",
  parameters: Type.Object({
    prompt: Type.String({ description: "The problem or question to solve" }),
    models: Type.Optional(Type.Array(Type.String({ description: "Reference model IDs (OpenRouter format)" }))),
    aggregator: Type.Optional(Type.String({ description: "Aggregator model ID (default: claude-3.5-sonnet)" })),
    strategy: Type.Optional(Type.Union([
      Type.Literal("vote"),
      Type.Literal("debate"),
      Type.Literal("cascade"),
    ])),
    context: Type.Optional(Type.String({ description: "Additional context for the aggregation step" })),
    max_references: Type.Optional(Type.Number({ description: "Max number of reference models (default: 4)" })),
  }),
  requiresEnv: ["OPENROUTER_API_KEY"],
  async execute(params, context): Promise<ToolResult> {
    if (!context.env.OPENROUTER_API_KEY) {
      return {
        content: "❌ Mixture of Agents requires OPENROUTER_API_KEY environment variable.\nSet it with: export OPENROUTER_API_KEY=your-key",
        isError: true,
      };
    }

    const prompt = params.prompt as string;
    const strategy = (params.strategy as string) ?? "vote";
    const maxRefs = (params.max_references as number) ?? 4;
    const userModels = params.models as string[] | undefined;
    const userAggregator = params.aggregator as string | undefined;
    const additionalContext = params.context as string | undefined;

    // Select reference models
    const referenceModels = userModels?.slice(0, maxRefs) ?? DEFAULT_MOA_CONFIG.defaultReferenceModels.slice(0, maxRefs).map(m => m.model);
    const aggregatorModel = userAggregator ?? DEFAULT_MOA_CONFIG.defaultAggregator.model;

    // Strategy-specific aggregation instructions
    const strategyInstructions: Record<string, string> = {
      vote: "Each reference model provides their answer. The aggregator selects the best elements from each and produces a unified response, noting where models agreed or disagreed.",
      debate: "Each reference model argues for their position. The aggregator acts as a judge, weighing the arguments and producing a balanced synthesis.",
      cascade: "Each model builds on the previous response. The aggregator refines the final cascaded answer for quality and completeness.",
    };

    const aggregationInstruction = strategyInstructions[strategy] ?? strategyInstructions.vote;

    // In a real implementation, this would make parallel API calls to OpenRouter.
    // For now, we return a structured plan of what would happen.
    const referenceCalls = referenceModels.map((model, i) => ({
      step: i + 1,
      model,
      action: "call",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
    }));

    const aggregationStep = {
      step: referenceCalls.length + 1,
      model: aggregatorModel,
      action: "aggregate",
      prompt: `Given the following ${strategyInstructions[strategy] ? strategy : "vote"} responses from ${referenceModels.length} reference models, synthesize the best answer.\n\nStrategy: ${aggregationInstruction}\n\nOriginal question: ${prompt}${additionalContext ? `\n\nAdditional context: ${additionalContext}` : ""}`,
    };

    const totalCostEstimate = referenceModels.length * 0.01 + 0.02; // Rough estimate

    return {
      content: [
        `🔄 Mixture of Agents — ${strategy.toUpperCase()} strategy`,
        ``,
        `📋 Plan:`,
        `  Reference models: ${referenceModels.join(", ")}`,
        `  Aggregator: ${aggregatorModel}`,
        `  Strategy: ${strategy}`,
        ``,
        `🔍 Reference calls:`,
        ...referenceCalls.map(c => `  ${c.step}. ${c.model} → ${c.endpoint}`),
        ``,
        `🧠 Aggregation:`,
        `  ${aggregationStep.step}. ${aggregationStep.model} (synthesize all responses)`,
        ``,
        `💰 Estimated cost: ~$${totalCostEstimate.toFixed(4)}`,
        ``,
        `⚠️  MoA execution requires hermes-bridge HTTP client (Phase 4+).`,
        `This tool is configured and will execute once HTTP transport is available.`,
      ].join("\n"),
    };
  },
};

export { DEFAULT_MOA_CONFIG };
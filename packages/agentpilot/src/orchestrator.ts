/**
 * AgentPilot Orchestrator — Routes user requests to specialized sub-agents.
 *
 * Follows the Anthropic multi-agent pattern:
 * - Orchestrator analyzes, plans, and delegates
 * - Never does domain work itself
 * - Supports parallel and sequential delegation
 * - Passes context between chained agents
 */

import type {
  AgentId,
  AgentDefinition,
  DelegationRequest,
  DelegationResult,
  OrchestratorConfig,
  RoutePriority,
} from "../types.js";
import { AGENT_REGISTRY } from "./registry.js";

export class Orchestrator {
  private config: OrchestratorConfig;
  private history: DelegationResult[] = [];

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      callLLM: config?.callLLM,
      enabledAgents: config?.enabledAgents ?? Object.keys(AGENT_REGISTRY) as AgentId[],
      requireConfirmationForDestructive: config?.requireConfirmationForDestructive ?? true,
      maxParallel: config?.maxParallel ?? 4,
    };
  }

  /**
   * Process a user message — analyze, route, and delegate.
   * This is the main entry point.
   */
  async processMessage(userMessage: string, conversationContext?: string): Promise<OrchestratorResponse> {
    // Build routing prompt for the LLM
    const agentDescriptions = this.config.enabledAgents!
      .filter(id => id !== "orchestrator")
      .map(id => {
        const agent = AGENT_REGISTRY[id];
        return `${id}: ${agent.domain} — ${agent.description}`;
      })
      .join("\n");

    if (this.config.callLLM) {
      const systemPrompt = buildOrchestratorPrompt(agentDescriptions);
      const response = await this.config.callLLM(systemPrompt, userMessage);

      // Parse LLM routing decision
      const decision = parseRoutingDecision(response);
      return this.executeDecision(decision, userMessage, conversationContext);
    }

    // Fallback: heuristic routing when no LLM available
    const heuristicDecision = this.heuristicRoute(userMessage);
    return this.executeDecision(heuristicDecision, userMessage, conversationContext);
  }

  /**
   * Execute a routing decision — dispatch to agents in parallel or sequence.
   */
  private async executeDecision(
    decision: RoutingDecision,
    userMessage: string,
    context?: string,
  ): Promise<OrchestratorResponse> {
    const results: DelegationResult[] = [];

    if (decision.mode === "parallel") {
      // Run all agents concurrently
      const promises = decision.agents.map(agentId =>
        this.delegateToAgent(agentId, userMessage, context, decision.agentContexts?.[agentId])
      );
      const settled = await Promise.allSettled(promises);

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            agentId: decision.agents[i],
            success: false,
            error: result.reason?.message ?? "Unknown error",
          });
        }
      }
    } else {
      // Sequential — chain results
      let accumulatedContext = context ?? "";

      for (const agentId of decision.agents) {
        const result = await this.delegateToAgent(agentId, userMessage, accumulatedContext, decision.agentContexts?.[agentId]);
        results.push(result);

        if (result.success && result.result) {
          accumulatedContext += `\n[${agentId} result]: ${JSON.stringify(result.result)}`;
        }
      }
    }

    this.history.push(...results);

    return {
      decision,
      results,
      summary: this.summarizeResults(results),
      needsConfirmation: decision.needsConfirmation,
    };
  }

  /**
   * Delegate to a single agent.
   */
  private async delegateToAgent(
    agentId: AgentId,
    message: string,
    context?: string,
    extraContext?: Record<string, unknown>,
  ): Promise<DelegationResult> {
    const agent = AGENT_REGISTRY[agentId];
    if (!agent) {
      return { agentId, success: false, error: `Unknown agent: ${agentId}` };
    }

    try {
      const result = await agent.processMessage(message, context, extraContext, this.config.callLLM);
      return { agentId, success: true, result };
    } catch (err) {
      return { agentId, success: false, error: (err as Error).message };
    }
  }

  /**
   * Heuristic routing when no LLM is available.
   * Uses keyword matching to route to the most relevant agent.
   */
  private heuristicRoute(message: string): RoutingDecision {
    const lower = message.toLowerCase();
    const agents: AgentId[] = [];
    const contexts: Record<string, Record<string, unknown>> = {};

    // Keyword-based routing
    if (/email|photo|download|convert|pdf|ocr|attachment/i.test(lower)) {
      agents.push("email-media");
    }
    if (/mls|listing|nwmls|upload photo|active|pending|sold|withdraw/i.test(lower)) {
      agents.push("mls-listing");
    }
    if (/comp|cma|market|sold for|price|value|redfin|zillow|assessor/i.test(lower)) {
      agents.push("market-intelligence");
    }
    if (/form|offer|disclosure|document|sign|contract|purchase.*sale|addendum/i.test(lower)) {
      agents.push("forms-documents");
    }
    if (/deal|transaction|checklist|deadline|closing|under contract|inspection/i.test(lower)) {
      agents.push("transaction");
    }
    if (/contact|lead|client|crm|pipeline|follow.up|prospecting|expired/i.test(lower)) {
      agents.push("crm-leads");
    }
    if (/calcul|commission|mortgage|payment|net sheet|reet|prorat|afford|amortiz|cap rate|roi|cash.flow|70%.rule|1%.rule/i.test(lower)) {
      agents.push("calculator");
    }
    if (/listing description|social.media|post|flyer|open house|marketing|just listed|just sold|digest/i.test(lower)) {
      agents.push("marketing-content");
    }
    if (/showing|schedule|route|itinerary|calendar|tour/i.test(lower)) {
      agents.push("scheduling-logistics");
    }

    // Default to calculator if it's a math question
    if (agents.length === 0 && /how much|\$|percent|rate|cost|price|payment/i.test(lower)) {
      agents.push("calculator");
    }

    // Default to market intelligence for property questions
    if (agents.length === 0 && /\d+\s+\w+\s+(st|ave|blvd|dr|ln|ct|way|rd|pl)/i.test(lower)) {
      agents.push("market-intelligence");
    }

    // If nothing matched, try the orchestrator's best guess
    if (agents.length === 0) {
      agents.push("crm-leads"); // safe default
    }

    // Determine sequencing
    const mode = agents.length > 1 ? "sequential" : "parallel";

    return {
      agents,
      mode,
      needsConfirmation: this.requiresConfirmation(message),
      agentContexts: contexts,
    };
  }

  /**
   * Check if the request likely requires user confirmation.
   */
  private requiresConfirmation(message: string): boolean {
    const destructivePatterns = /upload|submit|send|publish|post|delete|remove|change.*status|mark.*sold|sign|route/i;
    return destructivePatterns.test(message);
  }

  /**
   * Summarize results for user presentation.
   */
  private summarizeResults(results: DelegationResult[]): string {
    const lines: string[] = [];

    for (const r of results) {
      if (r.success) {
        lines.push(`✅ ${r.agentId}: ${typeof r.result === "string" ? r.result : JSON.stringify(r.result)}`);
      } else {
        lines.push(`❌ ${r.agentId}: ${r.error}`);
      }
    }

    return lines.join("\n");
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface OrchestratorResponse {
  decision: RoutingDecision;
  results: DelegationResult[];
  summary: string;
  needsConfirmation: boolean;
}

export interface RoutingDecision {
  agents: AgentId[];
  mode: "parallel" | "sequential";
  needsConfirmation: boolean;
  agentContexts?: Record<string, Record<string, unknown>>;
}

// ── Helper Functions ────────────────────────────────────────────────────────

function buildOrchestratorPrompt(agentDescriptions: string): string {
  return `You are the Orchestrator Agent for AgentPilot. Analyze the user's request and determine which sub-agents to invoke.

Available sub-agents:
${agentDescriptions}

ROUTING RULES:
1. Analyze the user's intent first
2. Route to the agent(s) that own that domain
3. Some requests need multiple agents — list them all
4. If agents depend on each other's output, mark as sequential
5. If agents can run independently, mark as parallel
6. For destructive actions (upload, publish, send, sign), flag needsConfirmation

RESPOND IN THIS EXACT FORMAT:
AGENTS: [comma-separated agent IDs]
MODE: parallel|sequential
CONFIRMATION: yes|no
REASONING: brief explanation`;
}

function parseRoutingDecision(llmResponse: string): RoutingDecision {
  const agents: AgentId[] = [];
  let mode: "parallel" | "sequential" = "parallel";
  let needsConfirmation = false;

  const agentsMatch = llmResponse.match(/AGENTS:\s*\[?([^\]]+)\]?/i);
  if (agentsMatch) {
    agentsMatch[1].split(",").map(a => a.trim().toLowerCase()).forEach(a => {
      if (["email-media", "mls-listing", "market-intelligence", "forms-documents", "transaction", "crm-leads", "calculator", "marketing-content", "scheduling-logistics"].includes(a)) {
        agents.push(a as AgentId);
      }
    });
  }

  const modeMatch = llmResponse.match(/MODE:\s*(parallel|sequential)/i);
  if (modeMatch) mode = modeMatch[1].toLowerCase() as "parallel" | "sequential";

  const confirmMatch = llmResponse.match(/CONFIRMATION:\s*(yes|no)/i);
  if (confirmMatch) needsConfirmation = confirmMatch[1].toLowerCase() === "yes";

  if (agents.length === 0) agents.push("crm-leads"); // safe default

  return { agents, mode, needsConfirmation };
}
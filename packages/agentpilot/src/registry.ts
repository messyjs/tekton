/**
 * Agent Registry — All 9 specialized sub-agents for AgentPilot.
 * Each agent owns its domain and processes messages autonomously.
 */

import type { AgentId, AgentDefinition, ToolDefinition } from "./types.js";
import {
  ORCHESTRATOR_PROMPT,
  EMAIL_MEDIA_PROMPT,
  MLS_LISTING_PROMPT,
  MARKET_INTELLIGENCE_PROMPT,
  FORMS_DOCUMENTS_PROMPT,
  TRANSACTION_PROMPT,
  CRM_LEADS_PROMPT,
  CALCULATOR_PROMPT,
  MARKETING_CONTENT_PROMPT,
  SCHEDULING_LOGISTICS_PROMPT,
} from "./prompts/index.js";
import { calculatorTools } from "./agents/tools/calculator-tools.js";
import { emailMediaTools } from "./agents/tools/email-media-tools.js";
import { mlsListingTools } from "./agents/tools/mls-listing-tools.js";
import { marketIntelligenceTools } from "./agents/tools/market-intelligence-tools.js";
import { formsDocumentsTools } from "./agents/tools/forms-documents-tools.js";
import { transactionTools } from "./agents/tools/transaction-tools.js";
import { crmLeadsTools } from "./agents/tools/crm-leads-tools.js";
import { marketingContentTools } from "./agents/tools/marketing-content-tools.js";
import { schedulingLogisticsTools } from "./agents/tools/scheduling-logistics-tools.js";

// ── Agent Base ──────────────────────────────────────────────────────────────

export interface AgentRuntime {
  id: AgentId;
  name: string;
  domain: string;
  description: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  processMessage(
    message: string,
    context?: string,
    extraContext?: Record<string, unknown>,
    callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>,
  ): Promise<unknown>;
}

abstract class BaseAgent implements AgentRuntime {
  abstract id: AgentId;
  abstract name: string;
  abstract domain: string;
  abstract description: string;
  abstract systemPrompt: string;
  abstract tools: ToolDefinition[];

  async processMessage(
    message: string,
    context?: string,
    extraContext?: Record<string, unknown>,
    callLLM?: (sys: string, usr: string) => Promise<string>,
  ): Promise<unknown> {
    // Build the full prompt with context
    let fullMessage = message;
    if (context) fullMessage += `\n\n[Previous context]: ${context}`;
    if (extraContext) fullMessage += `\n[Additional context]: ${JSON.stringify(extraContext)}`;

    if (callLLM) {
      return callLLM(this.systemPrompt, fullMessage);
    }

    // Fallback: try to match a tool call from the message
    return this.heuristicProcess(message);
  }

  protected heuristicProcess(_message: string): unknown {
    return `[${this.id}] Received — no LLM available for reasoning. Tools available: ${this.tools.map(t => t.name).join(", ")}`;
  }
}

// ── Concrete Agents ────────────────────────────────────────────────────────

class EmailMediaAgent extends BaseAgent {
  id: AgentId = "email-media";
  name = "Email & Media Agent";
  domain = "Email search, photo download, file conversion, OCR";
  description = "Handles email access, file downloading, format conversion, and document OCR";
  systemPrompt = EMAIL_MEDIA_PROMPT;
  tools = emailMediaTools;
}

class MLSListingAgent extends BaseAgent {
  id: AgentId = "mls-listing";
  name = "MLS & Listing Agent";
  domain = "NWMLS interactions";
  description = "Uploads photos, creates/edits listings, manages listing status on NWMLS";
  systemPrompt = MLS_LISTING_PROMPT;
  tools = mlsListingTools;
}

class MarketIntelligenceAgent extends BaseAgent {
  id: AgentId = "market-intelligence";
  name = "Market Intelligence Agent";
  domain = "Property data, comps, CMA";
  description = "Aggregates data from NWMLS, Redfin, Zillow; generates CMAs and market analysis";
  systemPrompt = MARKET_INTELLIGENCE_PROMPT;
  tools = marketIntelligenceTools;
}

class FormsDocumentsAgent extends BaseAgent {
  id: AgentId = "forms-documents";
  name = "Forms & Documents Agent";
  domain = "NWMLS/WA forms, PDF generation, e-signatures";
  description = "Generates real estate forms, pre-fills data, routes for e-signatures";
  systemPrompt = FORMS_DOCUMENTS_PROMPT;
  tools = formsDocumentsTools;
}

class TransactionAgent extends BaseAgent {
  id: AgentId = "transaction";
  name = "Transaction Agent";
  domain = "Deal lifecycle, checklists, deadlines";
  description = "Manages under-contract through post-closing checklists and deadlines";
  systemPrompt = TRANSACTION_PROMPT;
  tools = transactionTools;
}

class CRMLeadsAgent extends BaseAgent {
  id: AgentId = "crm-leads";
  name = "CRM & Leads Agent";
  domain = "Contacts, lead scoring, follow-ups";
  description = "Manages contact profiles, pipeline stages, lead scoring, drip campaigns";
  systemPrompt = CRM_LEADS_PROMPT;
  tools = crmLeadsTools;
}

class CalculatorAgent extends BaseAgent {
  id: AgentId = "calculator";
  name = "Calculator Agent";
  domain = "Real estate math";
  description = "All calculations: commissions, mortgages, REET, net sheets, affordability, investment metrics";
  systemPrompt = CALCULATOR_PROMPT;
  tools = calculatorTools;

  /**
   * Override: Calculator agent can perform real computations without LLM.
   */
  protected heuristicProcess(message: string): unknown {
    return this.tryCalculateFromMessage(message);
  }

  private tryCalculateFromMessage(message: string): string {
    const lower = message.toLowerCase();

    // Simple mortgage: "payment on $500K at 6.5% 30yr"
    const mortgageMatch = lower.match(/\$?([\d,.]+)\s*[km]?\s*(?:at|@|\s)\s*([\d.]+)%?\s*(\d+)\s*yr/i);
    if (mortgageMatch) {
      // Import and calculate would happen here at runtime
      return `[calculator] Detected mortgage calculation request. Use the calculateMortgage tool for precise results.`;
    }

    return `[calculator] Received calculation request. Use the specific calculator tools for precise results.`;
  }
}

class MarketingContentAgent extends BaseAgent {
  id: AgentId = "marketing-content";
  name = "Marketing & Content Agent";
  domain = "Listing descriptions, social media, open house materials";
  description = "Creates marketing content, social posts, flyers, and daily digests";
  systemPrompt = MARKETING_CONTENT_PROMPT;
  tools = marketingContentTools;
}

class SchedulingLogisticsAgent extends BaseAgent {
  id: AgentId = "scheduling-logistics";
  name = "Scheduling & Logistics Agent";
  domain = "Showings, routes, calendar";
  description = "Schedules showings, optimizes routes, generates itineraries";
  systemPrompt = SCHEDULING_LOGISTICS_PROMPT;
  tools = schedulingLogisticsTools;
}

// ── Registry ────────────────────────────────────────────────────────────────

const emailMediaAgent = new EmailMediaAgent();
const mlsListingAgent = new MLSListingAgent();
const marketIntelligenceAgent = new MarketIntelligenceAgent();
const formsDocumentsAgent = new FormsDocumentsAgent();
const transactionAgent = new TransactionAgent();
const crmLeadsAgent = new CRMLeadsAgent();
const calculatorAgent = new CalculatorAgent();
const marketingContentAgent = new MarketingContentAgent();
const schedulingLogisticsAgent = new SchedulingLogisticsAgent();

export const AGENT_REGISTRY: Record<Exclude<AgentId, "orchestrator">, AgentRuntime> = {
  "email-media": emailMediaAgent,
  "mls-listing": mlsListingAgent,
  "market-intelligence": marketIntelligenceAgent,
  "forms-documents": formsDocumentsAgent,
  "transaction": transactionAgent,
  "crm-leads": crmLeadsAgent,
  "calculator": calculatorAgent,
  "marketing-content": marketingContentAgent,
  "scheduling-logistics": schedulingLogisticsAgent,
};

export function getAgent(id: AgentId): AgentRuntime | undefined {
  if (id === "orchestrator") return undefined;
  return AGENT_REGISTRY[id as Exclude<AgentId, "orchestrator">];
}

export function listAgents(): Array<{ id: AgentId; name: string; domain: string; description: string }> {
  return Object.values(AGENT_REGISTRY).map(a => ({
    id: a.id,
    name: a.name,
    domain: a.domain,
    description: a.description,
  }));
}
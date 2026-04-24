import { describe, it, expect } from "vitest";
import { Orchestrator } from "../src/orchestrator.js";
import { AGENT_REGISTRY, listAgents, getAgent } from "../src/registry.js";

describe("AgentPilot Registry", () => {
  it("has 9 registered sub-agents", () => {
    const ids = Object.keys(AGENT_REGISTRY);
    expect(ids).toHaveLength(9);
    expect(ids).toContain("calculator");
    expect(ids).toContain("crm-leads");
    expect(ids).toContain("transaction");
    expect(ids).toContain("market-intelligence");
    expect(ids).toContain("forms-documents");
    expect(ids).toContain("mls-listing");
    expect(ids).toContain("email-media");
    expect(ids).toContain("marketing-content");
    expect(ids).toContain("scheduling-logistics");
  });

  it("each agent has required properties", () => {
    for (const agent of Object.values(AGENT_REGISTRY)) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.domain).toBeTruthy();
      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.tools).toBeInstanceOf(Array);
      expect(agent.processMessage).toBeInstanceOf(Function);
    }
  });

  it("listAgents returns array with all agent metadata", () => {
    const agents = listAgents();
    expect(agents).toHaveLength(9);
    for (const a of agents) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
    }
  });

  it("getAgent returns agent by id", () => {
    const calc = getAgent("calculator");
    expect(calc).toBeDefined();
    expect(calc!.id).toBe("calculator");
  });

  it("getAgent returns undefined for orchestrator", () => {
    expect(getAgent("orchestrator")).toBeUndefined();
  });
});

describe("AgentPilot Orchestrator", () => {
  it("creates with default config", () => {
    const orch = new Orchestrator();
    expect(orch).toBeDefined();
  });

  it("heuristic routes calculator requests", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("What would my commission be on a $800K sale at 6%?");
    expect(response.decision.agents).toContain("calculator");
  });

  it("heuristic routes market/comp requests", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("Pull comps for 123 Main St Seattle");
    expect(response.decision.agents).toContain("market-intelligence");
  });

  it("heuristic routes MLS/listing requests", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("Upload photos to NWMLS listing 12345");
    expect(response.decision.agents).toContain("mls-listing");
  });

  it("heuristic routes CRM/contact requests", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("Show me my leads that haven't been contacted in 7 days");
    expect(response.decision.agents).toContain("crm-leads");
  });

  it("heuristic routes transaction/deal requests", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("What's the status of my deal at 456 Oak Ave?");
    expect(response.decision.agents).toContain("transaction");
  });

  it("heuristic routes scheduling/showing requests", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("Schedule showings for my buyer tomorrow at these 3 properties");
    expect(response.decision.agents).toContain("scheduling-logistics");
  });

  it("flags confirmation needed for destructive actions", async () => {
    const orch = new Orchestrator();
    const response = await orch.processMessage("Upload photos to NWMLS listing 12345");
    expect(response.needsConfirmation).toBe(true);
  });
});

describe("AgentPilot Prompts", () => {
  it("all agent system prompts are non-empty strings", async () => {
    const { ORCHESTRATOR_PROMPT, EMAIL_MEDIA_PROMPT, MLS_LISTING_PROMPT, MARKET_INTELLIGENCE_PROMPT, FORMS_DOCUMENTS_PROMPT, TRANSACTION_PROMPT, CRM_LEADS_PROMPT, CALCULATOR_PROMPT, MARKETING_CONTENT_PROMPT, SCHEDULING_LOGISTICS_PROMPT } = await import("../src/prompts/index.js");
    expect(ORCHESTRATOR_PROMPT.length).toBeGreaterThan(100);
    expect(EMAIL_MEDIA_PROMPT.length).toBeGreaterThan(100);
    expect(MLS_LISTING_PROMPT.length).toBeGreaterThan(100);
    expect(MARKET_INTELLIGENCE_PROMPT.length).toBeGreaterThan(100);
    expect(FORMS_DOCUMENTS_PROMPT.length).toBeGreaterThan(100);
    expect(TRANSACTION_PROMPT.length).toBeGreaterThan(100);
    expect(CRM_LEADS_PROMPT.length).toBeGreaterThan(100);
    expect(CALCULATOR_PROMPT.length).toBeGreaterThan(100);
    expect(MARKETING_CONTENT_PROMPT.length).toBeGreaterThan(100);
    expect(SCHEDULING_LOGISTICS_PROMPT.length).toBeGreaterThan(100);
  });
});
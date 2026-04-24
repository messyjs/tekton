/**
 * AgentPilot Web — Hono server + REST API + Leaflet map SPA.
 *
 * Serves the AgentPilot dashboard on http://127.0.0.1:7799 by default.
 * Shows a map of Washington with for-sale and sold listings,
 * calculator tools, and agent routing.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { generateAgentPilotHTML } from "./spa.js";

export interface AgentPilotServerConfig {
  port: number;
  host: string;
}

const DEFAULT_CONFIG: AgentPilotServerConfig = {
  port: 7799,
  host: "127.0.0.1",
};

export class AgentPilotServer {
  readonly config: AgentPilotServerConfig;
  readonly app: Hono;
  private server: ReturnType<typeof serve> | null = null;

  constructor(config?: Partial<AgentPilotServerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = new Hono();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use("*", cors());

    // ── Health ───────────────────────────────────────────────────────
    this.app.get("/api/status", (c) => {
      return c.json({ status: "ok", version: "0.1.0", agents: 9, uptime: process.uptime() });
    });

    // ── Calculator API ───────────────────────────────────────────────
    this.app.post("/api/calculator/commission", async (c) => {
      const body = await c.req.json();
      const { calculateCommission } = await import("@tekton/agentpilot");
      return c.json(calculateCommission(body));
    });

    this.app.post("/api/calculator/reet", async (c) => {
      const body = await c.req.json();
      const { calculateREET } = await import("@tekton/agentpilot");
      return c.json(calculateREET(body));
    });

    this.app.post("/api/calculator/net-sheet", async (c) => {
      const body = await c.req.json();
      const { calculateNetSheet } = await import("@tekton/agentpilot");
      return c.json(calculateNetSheet(body));
    });

    this.app.post("/api/calculator/mortgage", async (c) => {
      const body = await c.req.json();
      const { calculateMortgage } = await import("@tekton/agentpilot");
      return c.json(calculateMortgage(body));
    });

    this.app.post("/api/calculator/piti", async (c) => {
      const body = await c.req.json();
      const { calculatePITI } = await import("@tekton/agentpilot");
      return c.json(calculatePITI(body));
    });

    this.app.post("/api/calculator/affordability", async (c) => {
      const body = await c.req.json();
      const { calculateAffordability } = await import("@tekton/agentpilot");
      return c.json(calculateAffordability(body));
    });

    this.app.post("/api/calculator/amortization", async (c) => {
      const body = await c.req.json();
      const { generateAmortization } = await import("@tekton/agentpilot");
      return c.json(generateAmortization(body));
    });

    this.app.post("/api/calculator/investment", async (c) => {
      const body = await c.req.json();
      const { calculateInvestment } = await import("@tekton/agentpilot");
      return c.json(calculateInvestment(body));
    });

    this.app.post("/api/calculator/refinance", async (c) => {
      const body = await c.req.json();
      const { calculateRefinance } = await import("@tekton/agentpilot");
      return c.json(calculateRefinance(body));
    });

    this.app.post("/api/calculator/seventy-rule", async (c) => {
      const body = await c.req.json();
      const { calculateSeventyRule } = await import("@tekton/agentpilot");
      return c.json({ maxPurchasePrice: calculateSeventyRule(body.arv, body.repairCosts) });
    });

    this.app.post("/api/calculator/prorate-tax", async (c) => {
      const body = await c.req.json();
      const { prorateTax } = await import("@tekton/agentpilot");
      return c.json(prorateTax(body.annualTax, body.closingDate, body.taxPeriodStart, body.taxPaidThrough));
    });

    this.app.post("/api/calculator/prorate-hoa", async (c) => {
      const body = await c.req.json();
      const { prorateHOA } = await import("@tekton/agentpilot");
      return c.json(prorateHOA(body.monthlyHOA, body.closingDay, body.daysInMonth));
    });

    // ── Listings (mock data for demo) ───────────────────────────────
    this.app.get("/api/listings", (c) => {
      return c.json(MOCK_LISTINGS);
    });

    // ── Agents ────────────────────────────────────────────────────────
    this.app.get("/api/agents", async (c) => {
      const { listAgents } = await import("@tekton/agentpilot");
      return c.json(listAgents());
    });

    // ── Chat (Orchestrator routing) ──────────────────────────────────
    this.app.post("/api/chat", async (c) => {
      const body = await c.req.json();
      const { Orchestrator } = await import("@tekton/agentpilot");
      const orch = new Orchestrator();
      const result = await orch.processMessage(body.message);
      return c.json(result);
    });

    // ── SPA ──────────────────────────────────────────────────────────
    this.app.get("/*", (c) => {
      const html = generateAgentPilotHTML();
      return c.html(html);
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = serve({
          fetch: this.app.fetch,
          hostname: this.config.host,
          port: this.config.port,
        }, () => {
          console.log(`🏘️ AgentPilot running at http://${this.config.host}:${this.config.port}`);
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  getUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }
}

// ── Mock Listings for Demo ───────────────────────────────────────────────────

const MOCK_LISTINGS = [
  // Seattle area
  { id: "1", address: "1234 1st Ave", city: "Seattle", state: "WA", zip: "98101", lat: 47.6062, lng: -122.3321, price: 875000, beds: 3, baths: 2, sqft: 1850, status: "active", type: "house", dom: 12, listDate: "2024-03-01" },
  { id: "2", address: "4567 Queen Anne Ave", city: "Seattle", state: "WA", zip: "98109", lat: 47.6405, lng: -122.3567, price: 1250000, beds: 4, baths: 3, sqft: 2800, status: "active", type: "house", dom: 5, listDate: "2024-03-20" },
  { id: "3", address: "8901 Rainier Ave S", city: "Seattle", state: "WA", zip: "98118", lat: 47.5432, lng: -122.2856, price: 549000, beds: 2, baths: 1, sqft: 1100, status: "pending", type: "condo", dom: 28, listDate: "2024-02-15" },
  { id: "4", address: "2200 Broadway E", city: "Seattle", state: "WA", zip: "98102", lat: 47.6234, lng: -122.3211, price: 620000, beds: 2, baths: 2, sqft: 1250, status: "sold", type: "condo", dom: 0, listDate: "2024-01-10", soldPrice: 635000, soldDate: "2024-02-28" },
  { id: "5", address: "5678 Green Lake Way N", city: "Seattle", state: "WA", zip: "98103", lat: 47.6612, lng: -122.3434, price: 925000, beds: 4, baths: 2.5, sqft: 2400, status: "active", type: "house", dom: 18, listDate: "2024-02-25" },

  // Bellevue / Eastside
  { id: "6", address: "300 Bellevue Way NE", city: "Bellevue", state: "WA", zip: "98004", lat: 47.6101, lng: -122.2015, price: 1100000, beds: 4, baths: 3, sqft: 2900, status: "active", type: "house", dom: 8, listDate: "2024-03-15" },
  { id: "7", address: "1200 NE 8th St", city: "Bellevue", state: "WA", zip: "98004", lat: 47.6177, lng: -122.1886, price: 785000, beds: 3, baths: 2, sqft: 1750, status: "sold", type: "condo", dom: 0, listDate: "2024-01-05", soldPrice: 810000, soldDate: "2024-02-15" },
  { id: "8", address: "4320 Factoria Blvd SE", city: "Bellevue", state: "WA", zip: "98006", lat: 47.5764, lng: -122.1623, price: 1450000, beds: 5, baths: 4, sqft: 3500, status: "active", type: "house", dom: 22, listDate: "2024-02-10" },

  // Kirkland
  { id: "9", address: "700 Central Way", city: "Kirkland", state: "WA", zip: "98033", lat: 47.6761, lng: -122.2049, price: 950000, beds: 3, baths: 2.5, sqft: 2100, status: "active", type: "house", dom: 15, listDate: "2024-03-01" },
  { id: "10", address: "101 Lake Washington Blvd", city: "Kirkland", state: "WA", zip: "98033", lat: 47.6821, lng: -122.2156, price: 2100000, beds: 5, baths: 4, sqft: 4200, status: "sold", type: "house", dom: 0, listDate: "2023-12-01", soldPrice: 2180000, soldDate: "2024-01-20" },

  // Tacoma
  { id: "11", address: "500 S Tacoma Way", city: "Tacoma", state: "WA", zip: "98402", lat: 47.2529, lng: -122.4443, price: 425000, beds: 3, baths: 2, sqft: 1600, status: "active", type: "house", dom: 35, listDate: "2024-02-01" },
  { id: "12", address: "1800 N Pearl St", city: "Tacoma", state: "WA", zip: "98406", lat: 47.2671, lng: -122.4543, price: 380000, beds: 2, baths: 1, sqft: 1150, status: "pending", type: "house", dom: 42, listDate: "2024-01-20" },

  // Olympia
  { id: "13", address: "300 Capitol Way S", city: "Olympia", state: "WA", zip: "98501", lat: 47.0379, lng: -122.9007, price: 395000, beds: 3, baths: 2, sqft: 1750, status: "active", type: "house", dom: 20, listDate: "2024-02-25" },
  { id: "14", address: "1200 Washington St NE", city: "Olympia", state: "WA", zip: "98506", lat: 47.0456, lng: -122.8912, price: 510000, beds: 4, baths: 2.5, sqft: 2200, status: "sold", type: "house", dom: 0, listDate: "2024-01-15", soldPrice: 525000, soldDate: "2024-03-01" },

  // Spokane
  { id: "15", address: "800 W Riverside Ave", city: "Spokane", state: "WA", zip: "99201", lat: 47.6588, lng: -117.4260, price: 320000, beds: 3, baths: 2, sqft: 1500, status: "active", type: "house", dom: 10, listDate: "2024-03-10" },
  { id: "16", address: "2500 S Hill Dr", city: "Spokane", state: "WA", zip: "99203", lat: 47.6312, lng: -117.3934, price: 275000, beds: 2, baths: 1, sqft: 1100, status: "sold", type: "house", dom: 0, listDate: "2024-01-01", soldPrice: 285000, soldDate: "2024-02-10" },

  // Vancouver (WA)
  { id: "17", address: "1500 Main St", city: "Vancouver", state: "WA", zip: "98660", lat: 45.6312, lng: -122.6743, price: 495000, beds: 3, baths: 2, sqft: 1800, status: "active", type: "house", dom: 14, listDate: "2024-03-05" },
  { id: "18", address: "3000 E Mill Plain Blvd", city: "Vancouver", state: "WA", zip: "98661", lat: 45.6318, lng: -122.6543, price: 560000, beds: 4, baths: 3, sqft: 2400, status: "pending", type: "house", dom: 25, listDate: "2024-02-10" },

  // Bellingham
  { id: "19", address: "400 E Holly St", city: "Bellingham", state: "WA", zip: "98225", lat: 48.7523, lng: -122.4786, price: 575000, beds: 3, baths: 2, sqft: 1650, status: "active", type: "house", dom: 7, listDate: "2024-03-18" },

  // Redmond
  { id: "20", address: "8000 166th Ave NE", city: "Redmond", state: "WA", zip: "98052", lat: 47.6740, lng: -122.1190, price: 1300000, beds: 5, baths: 4, sqft: 3800, status: "active", type: "house", dom: 3, listDate: "2024-03-22" },
  { id: "21", address: "2500 NE Novelty Hill Rd", city: "Redmond", state: "WA", zip: "98053", lat: 47.6880, lng: -122.0730, price: 980000, beds: 4, baths: 3, sqft: 2600, status: "sold", type: "house", dom: 0, listDate: "2024-02-01", soldPrice: 1010000, soldDate: "2024-03-05" },

  // Issaquah
  { id: "22", address: "1000 NW Sammamish Rd", city: "Issaquah", state: "WA", zip: "98027", lat: 47.5432, lng: -122.0434, price: 1150000, beds: 4, baths: 3, sqft: 3200, status: "active", type: "house", dom: 11, listDate: "2024-03-08" },

  // Edmonds
  { id: "23", address: "300 Main St", city: "Edmonds", state: "WA", zip: "98020", lat: 47.8106, lng: -122.3774, price: 835000, beds: 3, baths: 2, sqft: 1950, status: "pending", type: "house", dom: 30, listDate: "2024-02-08" },
  { id: "24", address: "500 Sunset Ave", city: "Edmonds", state: "WA", zip: "98020", lat: 47.8072, lng: -122.3841, price: 720000, beds: 3, baths: 2, sqft: 1650, status: "sold", type: "house", dom: 0, listDate: "2024-01-20", soldPrice: 740000, soldDate: "2024-03-01" },

  // Everett
  { id: "25", address: "2800 Wetmore Ave", city: "Everett", state: "WA", zip: "98201", lat: 47.9790, lng: -122.2012, price: 490000, beds: 3, baths: 2, sqft: 1700, status: "active", type: "house", dom: 19, listDate: "2024-02-28" },

  // Mercer Island
  { id: "26", address: "7600 SE 27th St", city: "Mercer Island", state: "WA", zip: "98040", lat: 47.5691, lng: -122.2282, price: 2800000, beds: 5, baths: 4, sqft: 4800, status: "active", type: "house", dom: 9, listDate: "2024-03-15" },

  // Bainbridge Island
  { id: "27", address: "200 Winslow Way E", city: "Bainbridge Island", state: "WA", zip: "98110", lat: 47.6260, lng: -122.5211, price: 1150000, beds: 4, baths: 3, sqft: 2800, status: "active", type: "house", dom: 16, listDate: "2024-03-01" },
  { id: "28", address: "500 Ericksen Ave", city: "Bainbridge Island", state: "WA", zip: "98110", lat: 47.6291, lng: -122.5234, price: 780000, beds: 2, baths: 2, sqft: 1400, status: "sold", type: "condo", dom: 0, listDate: "2024-01-10", soldPrice: 810000, soldDate: "2024-02-20" },

  // Renton
  { id: "29", address: "200 S 3rd St", city: "Renton", state: "WA", zip: "98057", lat: 47.4800, lng: -122.2071, price: 545000, beds: 3, baths: 2, sqft: 1500, status: "active", type: "house", dom: 21, listDate: "2024-02-22" },

  // Olympia - Lacey
  { id: "30", address: "4500 Lacey Blvd SE", city: "Lacey", state: "WA", zip: "98503", lat: 47.0213, lng: -122.8235, price: 435000, beds: 3, baths: 2, sqft: 1550, status: "active", type: "house", dom: 28, listDate: "2024-02-13" },
];
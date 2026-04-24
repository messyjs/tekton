/** Market Intelligence Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const marketIntelligenceTools: ToolDefinition[] = [
  { name: "nwmls_reso_search", description: "Search NWMLS via RESO Web API", parameters: { type: "object", properties: { filters: { type: "object" } }, required: ["filters"] } },
  { name: "scrape_redfin", description: "Scrape property data from Redfin", parameters: { type: "object", properties: { query: { type: "string" }, filters: { type: "object" } }, required: ["query"] } },
  { name: "scrape_zillow", description: "Scrape property data from Zillow", parameters: { type: "object", properties: { query: { type: "string" }, filters: { type: "object" } }, required: ["query"] } },
  { name: "scrape_craigslist", description: "Search Craigslist FSBO/rental listings", parameters: { type: "object", properties: { area: { type: "string" }, category: { type: "string" }, filters: { type: "object" } }, required: ["area"] } },
  { name: "scrape_realtor_com", description: "Scrape Realtor.com data", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "scrape_agency_website", description: "Scrape individual agency website (Windermere, John L Scott, etc.)", parameters: { type: "object", properties: { agencyUrl: { type: "string" }, filters: { type: "object" } }, required: ["agencyUrl"] } },
  { name: "county_assessor_lookup", description: "Lookup county assessor data", parameters: { type: "object", properties: { identifier: { type: "string" }, county: { type: "string" } }, required: ["identifier"] } },
  { name: "county_records_search", description: "Search county records (deeds, liens, permits)", parameters: { type: "object", properties: { query: { type: "string" }, county: { type: "string" } }, required: ["query"] } },
  { name: "deduplicate_listings", description: "Deduplicate listings across sources", parameters: { type: "object", properties: { listings: { type: "array", items: { type: "object" } } }, required: ["listings"] } },
  { name: "generate_cma_report", description: "Generate Comparable Market Analysis report", parameters: { type: "object", properties: { subjectProperty: { type: "object" }, comps: { type: "array", items: { type: "object" } }, adjustments: { type: "object" }, agentBranding: { type: "object" } }, required: ["subjectProperty", "comps"] } },
  { name: "calculate_market_stats", description: "Calculate market statistics for an area", parameters: { type: "object", properties: { areaBoundary: { type: "object" }, dateRange: { type: "string" } }, required: ["areaBoundary"] } },
  { name: "generate_map_data", description: "Generate GeoJSON map data for properties", parameters: { type: "object", properties: { areaBoundary: { type: "object" }, filters: { type: "object" } }, required: ["areaBoundary"] } },
  { name: "find_expired_listings", description: "Find recently expired/withdrawn listings", parameters: { type: "object", properties: { area: { type: "string" }, dateRange: { type: "string" }, priceRange: { type: "object" } }, required: ["area"] } },
];
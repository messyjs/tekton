/** CRM & Leads Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const crmLeadsTools: ToolDefinition[] = [
  { name: "create_contact", description: "Create new contact in CRM", parameters: { type: "object", properties: { contactData: { type: "object" } }, required: ["contactData"] } },
  { name: "update_contact", description: "Update existing contact", parameters: { type: "object", properties: { contactId: { type: "string" }, updates: { type: "object" } }, required: ["contactId", "updates"] } },
  { name: "search_contacts", description: "Search contacts by query", parameters: { type: "object", properties: { query: { type: "object" } }, required: ["query"] } },
  { name: "get_contact", description: "Get full contact profile", parameters: { type: "object", properties: { contactId: { type: "string" } }, required: ["contactId"] } },
  { name: "get_pipeline_view", description: "Get pipeline view by stage", parameters: { type: "object", properties: { stageFilter: { type: "string" }, sortBy: { type: "string" } }, required: [] } },
  { name: "score_lead", description: "Score lead (Hot/Warm/Cool/Cold) with factors", parameters: { type: "object", properties: { contactId: { type: "string" } }, required: ["contactId"] } },
  { name: "draft_followup", description: "Draft follow-up email/text", parameters: { type: "object", properties: { contactId: { type: "string" }, type: { type: "string", description: "email|text|call" } }, required: ["contactId", "type"] } },
  { name: "create_drip_campaign", description: "Create drip campaign for contacts", parameters: { type: "object", properties: { contactIds: { type: "array", items: { type: "string" } }, campaignTemplate: { type: "string" }, schedule: { type: "object" } }, required: ["contactIds", "campaignTemplate"] } },
  { name: "log_interaction", description: "Log interaction with contact", parameters: { type: "object", properties: { contactId: { type: "string" }, type: { type: "string" }, notes: { type: "string" }, timestamp: { type: "string" } }, required: ["contactId", "type"] } },
  { name: "import_open_house_signins", description: "Import open house sign-in data", parameters: { type: "object", properties: { signinData: { type: "array", items: { type: "object" } } }, required: ["signinData"] } },
  { name: "get_stale_leads", description: "Find leads not contacted in X days", parameters: { type: "object", properties: { daysSinceContact: { type: "number" } }, required: ["daysSinceContact"] } },
  { name: "generate_prospecting_list", description: "Generate prospecting list from expired listings + public records", parameters: { type: "object", properties: { expiredListings: { type: "array", items: { type: "object" } }, publicRecordsData: { type: "array", items: { type: "object" } } }, required: ["expiredListings"] } },
];
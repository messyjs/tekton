/** Scheduling & Logistics Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const schedulingLogisticsTools: ToolDefinition[] = [
  { name: "request_showing", description: "Send showing request to listing agent/ShowingTime", parameters: { type: "object", properties: { listingNumber: { type: "string" }, preferredDatetime: { type: "string" }, agentInfo: { type: "object" } }, required: ["listingNumber", "preferredDatetime"] } },
  { name: "check_showing_status", description: "Check showing request status", parameters: { type: "object", properties: { requestId: { type: "string" } }, required: ["requestId"] } },
  { name: "optimize_route", description: "Optimize driving route for multiple showings", parameters: { type: "object", properties: { addresses: { type: "array", items: { type: "string" } }, timeConstraints: { type: "object" }, showDurationMinutes: { type: "number" } }, required: ["addresses"] } },
  { name: "get_driving_directions", description: "Get driving directions between two addresses", parameters: { type: "object", properties: { origin: { type: "string" }, destination: { type: "string" }, departureTime: { type: "string" } }, required: ["origin", "destination"] } },
  { name: "generate_itinerary", description: "Generate shareable buyer itinerary PDF", parameters: { type: "object", properties: { showings: { type: "array", items: { type: "object" } }, buyerInfo: { type: "object" }, agentBranding: { type: "object" } }, required: ["showings"] } },
  { name: "create_calendar_event", description: "Create calendar event (Google/Outlook)", parameters: { type: "object", properties: { title: { type: "string" }, datetime: { type: "string" }, duration: { type: "number" }, attendees: { type: "array", items: { type: "object" } }, location: { type: "string" }, notes: { type: "string" } }, required: ["title", "datetime", "duration"] } },
  { name: "sync_calendar", description: "Sync events with Google/Outlook calendar", parameters: { type: "object", properties: { calendarType: { type: "string" }, events: { type: "array", items: { type: "object" } } }, required: ["calendarType", "events"] } },
  { name: "send_itinerary", description: "Send itinerary to buyer via email or text", parameters: { type: "object", properties: { itinerary: { type: "object" }, recipient: { type: "string" } }, required: ["itinerary", "recipient"] } },
];
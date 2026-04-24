/** MLS & Listing Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const mlsListingTools: ToolDefinition[] = [
  { name: "nwmls_login", description: "Authenticate with NWMLS", parameters: { type: "object", properties: { credentials: { type: "object" } }, required: ["credentials"] } },
  { name: "nwmls_search_listing", description: "Search NWMLS by listing number or address", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "nwmls_create_listing", description: "Create new NWMLS listing", parameters: { type: "object", properties: { propertyData: { type: "object" } }, required: ["propertyData"] } },
  { name: "nwmls_update_listing", description: "Update existing listing details", parameters: { type: "object", properties: { listingNumber: { type: "string" }, updates: { type: "object" } }, required: ["listingNumber", "updates"] } },
  { name: "nwmls_upload_photos", description: "Upload photos to NWMLS listing", parameters: { type: "object", properties: { listingNumber: { type: "string" }, photoFiles: { type: "array", items: { type: "string" } }, order: { type: "array", items: { type: "number" } }, coverIndex: { type: "number" } }, required: ["listingNumber", "photoFiles"] } },
  { name: "nwmls_delete_photo", description: "Delete photo from listing", parameters: { type: "object", properties: { listingNumber: { type: "string" }, photoId: { type: "string" } }, required: ["listingNumber", "photoId"] } },
  { name: "nwmls_reorder_photos", description: "Reorder listing photos", parameters: { type: "object", properties: { listingNumber: { type: "string" }, newOrder: { type: "array", items: { type: "number" } } }, required: ["listingNumber", "newOrder"] } },
  { name: "nwmls_change_status", description: "Change listing status (Active/Pending/Sold/Withdrawn/Expired)", parameters: { type: "object", properties: { listingNumber: { type: "string" }, newStatus: { type: "string" }, statusData: { type: "object" } }, required: ["listingNumber", "newStatus"] } },
  { name: "nwmls_get_listing", description: "Get full listing data", parameters: { type: "object", properties: { listingNumber: { type: "string" } }, required: ["listingNumber"] } },
  { name: "nwmls_validate_listing", description: "Validate listing completeness", parameters: { type: "object", properties: { listingData: { type: "object" } }, required: ["listingData"] } },
  { name: "browser_automate", description: "Browser automation fallback for operations not in RESO API", parameters: { type: "object", properties: { url: { type: "string" }, actions: { type: "array", items: { type: "object" } } }, required: ["url", "actions"] } },
];
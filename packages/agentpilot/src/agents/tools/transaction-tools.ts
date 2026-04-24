/** Transaction Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const transactionTools: ToolDefinition[] = [
  { name: "create_transaction", description: "Create new transaction with parties and contract dates", parameters: { type: "object", properties: { propertyAddress: { type: "string" }, parties: { type: "object" }, contractDates: { type: "object" } }, required: ["propertyAddress", "parties", "contractDates"] } },
  { name: "get_transaction", description: "Get full transaction state", parameters: { type: "object", properties: { transactionId: { type: "string" } }, required: ["transactionId"] } },
  { name: "update_checklist_item", description: "Update checklist item status", parameters: { type: "object", properties: { transactionId: { type: "string" }, itemId: { type: "string" }, status: { type: "string" }, notes: { type: "string" } }, required: ["transactionId", "itemId", "status"] } },
  { name: "add_document", description: "Add document to transaction file", parameters: { type: "object", properties: { transactionId: { type: "string" }, documentType: { type: "string" }, filePath: { type: "string" } }, required: ["transactionId", "documentType", "filePath"] } },
  { name: "get_missing_documents", description: "Get list of missing documents for a transaction", parameters: { type: "object", properties: { transactionId: { type: "string" } }, required: ["transactionId"] } },
  { name: "calculate_deadlines", description: "Calculate all deadlines from mutual acceptance and closing dates", parameters: { type: "object", properties: { mutualAcceptanceDate: { type: "string" }, closingDate: { type: "string" }, contingencyPeriods: { type: "object" } }, required: ["mutualAcceptanceDate", "closingDate"] } },
  { name: "set_reminder", description: "Set deadline reminders (3 days, 1 day, day-of)", parameters: { type: "object", properties: { transactionId: { type: "string" }, itemId: { type: "string" }, reminderDates: { type: "array", items: { type: "string" } } }, required: ["transactionId", "itemId", "reminderDates"] } },
  { name: "get_upcoming_deadlines", description: "Get upcoming deadlines across all transactions", parameters: { type: "object", properties: { agentId: { type: "string" }, dateRange: { type: "string" } }, required: ["agentId"] } },
  { name: "generate_transaction_summary", description: "Generate transaction summary report", parameters: { type: "object", properties: { transactionId: { type: "string" } }, required: ["transactionId"] } },
  { name: "audit_transaction", description: "Audit transaction for compliance completeness", parameters: { type: "object", properties: { transactionId: { type: "string" } }, required: ["transactionId"] } },
];
/** Forms & Documents Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const formsDocumentsTools: ToolDefinition[] = [
  { name: "get_form_template", description: "Get NWMLS form template with field definitions", parameters: { type: "object", properties: { formId: { type: "string", description: "e.g. form-21, form-22a, form-35, form-17" } }, required: ["formId"] } },
  { name: "fill_form", description: "Fill form with data and generate PDF", parameters: { type: "object", properties: { formId: { type: "string" }, fieldData: { type: "object" } }, required: ["formId", "fieldData"] } },
  { name: "get_known_data", description: "Get pre-fillable data from property/client records", parameters: { type: "object", properties: { propertyAddress: { type: "string" }, clientId: { type: "string" } }, required: [] } },
  { name: "generate_pdf", description: "Generate branded PDF from form data", parameters: { type: "object", properties: { formData: { type: "object" }, branding: { type: "object" } }, required: ["formData"] } },
  { name: "send_for_signature", description: "Route document for e-signatures (DocuSign/Dotloop)", parameters: { type: "object", properties: { pdfPath: { type: "string" }, signers: { type: "array", items: { type: "object" } }, signatureFields: { type: "array", items: { type: "object" } } }, required: ["pdfPath", "signers"] } },
  { name: "check_signature_status", description: "Check e-signature completion status", parameters: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"] } },
  { name: "validate_form", description: "Validate form for completeness and required fields", parameters: { type: "object", properties: { formId: { type: "string" }, fieldData: { type: "object" } }, required: ["formId", "fieldData"] } },
];
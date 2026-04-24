/** Email & Media Agent tool definitions */
import type { ToolDefinition } from "../../types.js";

export const emailMediaTools: ToolDefinition[] = [
  { name: "search_email", description: "Search connected email accounts (Gmail, Outlook, Yahoo)", parameters: { type: "object", properties: { account: { type: "string" }, query: { type: "string" }, dateRange: { type: "string" }, hasAttachments: { type: "boolean" }, sender: { type: "string" } }, required: ["query"] } },
  { name: "get_email_content", description: "Get full email content by ID", parameters: { type: "object", properties: { emailId: { type: "string" } }, required: ["emailId"] } },
  { name: "download_from_url", description: "Download files from URL (Dropbox, Drive, SmugMug, etc.)", parameters: { type: "object", properties: { url: { type: "string" }, authMethod: { type: "string" } }, required: ["url"] } },
  { name: "download_attachment", description: "Download specific email attachment", parameters: { type: "object", properties: { emailId: { type: "string" }, attachmentId: { type: "string" } }, required: ["emailId", "attachmentId"] } },
  { name: "convert_image_to_pdf", description: "Convert images to PDF with optional OCR", parameters: { type: "object", properties: { imagePaths: { type: "array", items: { type: "string" } }, outputPath: { type: "string" }, applyOcr: { type: "boolean" } }, required: ["imagePaths"] } },
  { name: "optimize_image", description: "Optimize image for web/MLS", parameters: { type: "object", properties: { imagePath: { type: "string" }, targetFormat: { type: "string" }, maxDimensions: { type: "string" }, maxFilesize: { type: "number" } }, required: ["imagePath"] } },
  { name: "ocr_extract_text", description: "Extract text from scanned document via OCR", parameters: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
  { name: "rename_files", description: "Rename files using MLS-friendly conventions", parameters: { type: "object", properties: { filePaths: { type: "array", items: { type: "string" } }, namingPattern: { type: "string" }, propertyAddress: { type: "string" } }, required: ["filePaths"] } },
  { name: "validate_mls_photo", description: "Validate photo against NWMLS requirements", parameters: { type: "object", properties: { imagePath: { type: "string" } }, required: ["imagePath"] } },
];
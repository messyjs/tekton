/**
 * Brief Schema — TypeBox schema and validation for ProductBrief.
 */
import { Value } from "@sinclair/typebox/value";
import { ProductBriefSchema } from "../types.js";
import type { ProductBrief } from "../types.js";

export interface BriefValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a ProductBrief against its TypeBox schema.
 */
export function validateBrief(data: unknown): BriefValidationResult {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Data must be a non-null object"] };
  }

  const obj = data as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ["id", "title", "problemStatement", "proposedSolution", "technicalApproach", "ideationTranscript"];
  for (const field of requiredStrings) {
    if (typeof obj[field] !== "string" || (obj[field] as string).length === 0) {
      errors.push(`Missing or empty required field: ${field}`);
    }
  }

  // Required arrays
  const requiredArrays = ["userStories", "risks", "domains"];
  for (const field of requiredArrays) {
    if (!Array.isArray(obj[field])) {
      errors.push(`Missing or invalid required field: ${field} (must be array)`);
    } else if ((obj[field] as unknown[]).length === 0) {
      errors.push(`Field ${field} must not be empty`);
    }
  }

  // estimatedComplexity enum
  const validComplexities = ["low", "medium", "high", "extreme"];
  if (!validComplexities.includes(obj.estimatedComplexity as string)) {
    errors.push(`estimatedComplexity must be one of: ${validComplexities.join(", ")}`);
  }

  // Validate domains
  const validDomains = ["vst-audio", "windows-desktop", "web-app", "unreal-engine", "android", "ios", "cad-physical", "html-static", "cross-platform"];
  if (Array.isArray(obj.domains)) {
    for (const domain of obj.domains as string[]) {
      if (!validDomains.includes(domain)) {
        errors.push(`Invalid domain: ${domain}`);
      }
    }
  }

  // revisionHistory array (can be empty)
  if (obj.revisionHistory !== undefined && !Array.isArray(obj.revisionHistory)) {
    errors.push("revisionHistory must be an array");
  }

  // createdAt number
  if (typeof obj.createdAt !== "number" || obj.createdAt <= 0) {
    errors.push("createdAt must be a positive number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
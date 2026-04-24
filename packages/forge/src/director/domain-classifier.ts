/**
 * Domain Classifier — Two-stage domain classification.
 *
 * Stage 1: Keyword scan of brief fields.
 * Stage 2: LLM confirmation (optional).
 */
import { matchDomains } from "../domain-registry.js";
import type { ProductBrief, ProductDomain } from "../types.js";

/**
 * Classify a ProductBrief into product domains.
 *
 * Stage 1: Uses keyword matching from the domain registry.
 * Stage 2: Optionally confirms with LLM.
 */
export async function classifyDomains(
  brief: ProductBrief,
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<ProductDomain[]> {
  // Stage 1: Keyword scan
  const keywordResults = matchDomains(brief);

  if (!callLLM) {
    return keywordResults;
  }

  // Stage 2: LLM confirmation
  try {
    const systemPrompt = `Given this product brief, confirm or adjust these domain classifications: ${keywordResults.join(", ")}. Return a JSON array of domain strings. Valid domains: vst-audio, web-app, windows-desktop, unreal-engine, android, ios, cad-physical, html-static, cross-platform. Only return domains you are confident about.`;

    const userPrompt = `Title: ${brief.title}\nProblem: ${brief.problemStatement}\nSolution: ${brief.proposedSolution}\nTechnical: ${brief.technicalApproach}\n\nKeyword-detected domains: ${keywordResults.join(", ")}`;

    const raw = await callLLM(systemPrompt, userPrompt);
    const domains = parseDomainArray(raw);
    if (domains.length > 0) {
      return domains;
    }
  } catch {
    // Fall back to keyword results
  }

  return keywordResults;
}

/** Parse domain array from LLM output. */
function parseDomainArray(raw: string): ProductDomain[] {
  const validDomains: ProductDomain[] = [
    "vst-audio", "web-app", "windows-desktop", "unreal-engine",
    "android", "ios", "cad-physical", "html-static", "cross-platform",
  ];

  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((d: unknown): d is ProductDomain => validDomains.includes(d as ProductDomain));
  } catch {
    return [];
  }
}
/**
 * Brief Generator — Extracts a structured ProductBrief from an ideation transcript.
 *
 * Calls LLM with structured output prompt; validates result against brief schema.
 * Retries once on validation failure.
 */
import { randomUUID } from "node:crypto";
import { validateBrief } from "./brief-schema.js";
import type { ProductBrief, ProductDomain } from "../types.js";

const BRIEF_GENERATION_PROMPT = `You are analyzing an ideation conversation. Extract a structured product brief from the following transcript. Return valid JSON matching this schema:
{
  "title": "string — concise product name",
  "problemStatement": "string — what problem exists, who has it, why it matters",
  "proposedSolution": "string — what you're building and how it solves the problem",
  "technicalApproach": "string — key technologies, architecture decisions",
  "userStories": ["string — at least 3 user stories in 'As a __, I want __ so that __' format"],
  "risks": ["string — at least 2 risks or unknowns"],
  "estimatedComplexity": "low | medium | high | extreme",
  "domains": ["vst-audio | web-app | windows-desktop | unreal-engine | android | ios | cad-physical | html-static | cross-platform"]
}

Be specific and actionable. No vague filler.`;

/**
 * Generate a ProductBrief from a conversation transcript.
 *
 * Uses the provided LLM call function, or falls back to template extraction.
 * Validates output and retries once on failure.
 */
export async function generateBrief(
  transcript: string,
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<ProductBrief> {
  const extractFromTranscript = async (): Promise<ProductBrief> => {
    if (callLLM) {
      const raw = await callLLM(BRIEF_GENERATION_PROMPT, transcript);
      return parseBriefJSON(raw);
    }
    return templateExtract(transcript);
  };

  try {
    const brief = await extractFromTranscript();
    const validation = validateBrief(brief);
    if (validation.valid) {
      return brief;
    }

    // Retry with error feedback
    if (callLLM) {
      const retryPrompt = `Previous attempt had errors: ${validation.errors.join("; ")}. Fix these and return valid JSON.`;
      const raw = await callLLM(retryPrompt, transcript);
      const retryBrief = parseBriefJSON(raw);
      const retryValidation = validateBrief(retryBrief);
      if (retryValidation.valid) {
        return retryBrief;
      }
      // Return even if invalid after retry
      return retryBrief;
    }

    return brief;
  } catch {
    // Fall back to template extraction on any error
    return templateExtract(transcript);
  }
}

/**
 * Parse raw LLM output into a ProductBrief, handling markdown code blocks.
 */
function parseBriefJSON(raw: string): ProductBrief {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);
  return {
    id: parsed.id ?? `brief-${randomUUID().slice(0, 8)}`,
    title: parsed.title ?? "Untitled Product",
    problemStatement: parsed.problemStatement ?? "",
    proposedSolution: parsed.proposedSolution ?? "",
    technicalApproach: parsed.technicalApproach ?? "",
    userStories: Array.isArray(parsed.userStories) ? parsed.userStories : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    estimatedComplexity: parsed.estimatedComplexity ?? "medium",
    domains: Array.isArray(parsed.domains) ? parsed.domains : ["web-app"],
    ideationTranscript: "",
    createdAt: parsed.createdAt ?? Date.now(),
    revisionHistory: Array.isArray(parsed.revisionHistory) ? parsed.revisionHistory : [],
  };
}

/**
 * Template-based extraction when no LLM is available.
 * Provides a structured but minimal brief from transcript keywords.
 */
function templateExtract(transcript: string): ProductBrief {
  const titleMatch = transcript.match(/(?:title|product|name)[:\s]+([^\n.]{5,50})/i);
  const title = titleMatch?.[1]?.trim() ?? "Generated Product";

  return {
    id: `brief-${randomUUID().slice(0, 8)}`,
    title,
    problemStatement: extractSection(transcript, ["problem", "issue", "challenge"], "Problem to be solved"),
    proposedSolution: extractSection(transcript, ["solution", "build", "create"], "Proposed solution"),
    technicalApproach: extractSection(transcript, ["technical", "architecture", "stack"], "Technical approach to be defined"),
    userStories: [
      "As a user, I want the core functionality so that I can solve my primary need",
      "As a user, I want an intuitive interface so that I can use the product without training",
      "As a user, I want reliable performance so that I can depend on this product daily",
    ],
    risks: [
      "Technical complexity may be higher than estimated",
      "User adoption is uncertain without market validation",
    ],
    estimatedComplexity: "medium" as const,
    domains: detectDomains(transcript),
    ideationTranscript: transcript,
    createdAt: Date.now(),
    revisionHistory: [],
  };
}

/** Extract a text section from transcript based on keyword proximity. */
function extractSection(transcript: string, keywords: string[], fallback: string): string {
  const lower = transcript.toLowerCase();
  for (const keyword of keywords) {
    const idx = lower.indexOf(keyword);
    if (idx >= 0) {
      const start = Math.max(0, idx - 10);
      const end = Math.min(transcript.length, idx + 200);
      return transcript.slice(start, end).trim();
    }
  }
  return fallback;
}

/** Detect domains from transcript keywords. */
function detectDomains(transcript: string): ProductDomain[] {
  const lower = transcript.toLowerCase();
  const domains: ProductDomain[] = [];

  const domainKeywords: Record<ProductDomain, string[]> = {
    "vst-audio": ["vst", "plugin", "synth", "daw", "audio", "dsp", "juce"],
    "web-app": ["website", "web app", "react", "vue", "svelte", "frontend", "backend", "api"],
    "windows-desktop": ["windows", "winui", "wpf", ".net desktop"],
    "unreal-engine": ["unreal", "ue5", "game engine", "blueprint"],
    "android": ["android", "kotlin", "jetpack"],
    "ios": ["ios", "swift", "iphone"],
    "cad-physical": ["3d print", "cad", "openscad", "stl"],
    "html-static": ["static site", "landing page", "portfolio"],
    "cross-platform": ["electron", "tauri", "cross-platform"],
  };

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (!domains.includes(domain as ProductDomain)) domains.push(domain as ProductDomain);
        break;
      }
    }
  }

  if (domains.length === 0) {
    domains.push("web-app");
  }

  return domains;
}
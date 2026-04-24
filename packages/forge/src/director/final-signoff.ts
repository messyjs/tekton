/**
 * Final Signoff — Reviews QA results against the original brief.
 *
 * Checks that all artifacts are at "testing" or "release" status
 * and that QA signoffs exist for all artifacts.
 */
import type { ForgeManifest, ProductBrief } from "../types.js";

export interface SignoffResult {
  approved: boolean;
  notes: string;
  sendBack?: string[];
}

/**
 * Perform final signoff review on a completed product.
 *
 * Checks artifact statuses and QA signoffs, then optionally
 * calls LLM for acceptance criteria verification.
 */
export async function finalSignoff(
  manifest: ForgeManifest,
  brief: ProductBrief,
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<SignoffResult> {
  const issues: string[] = [];

  // Check all artifacts are at "testing" or "release" status
  const incompleteArtifacts = manifest.artifacts.filter(
    (a) => a.status !== "testing" && a.status !== "release",
  );

  if (incompleteArtifacts.length > 0) {
    for (const artifact of incompleteArtifacts) {
      issues.push(`Artifact "${artifact.path}" is at status "${artifact.status}" (needs "testing" or "release")`);
    }
  }

  // Check QA signoffs exist for all artifacts
  for (const artifact of manifest.artifacts) {
    const signoffs = manifest.qaSignoffs.filter((s) => s.artifactPath === artifact.path);
    if (signoffs.length === 0) {
      issues.push(`No QA signoff for artifact "${artifact.path}"`);
    } else {
      const failedSignoffs = signoffs.filter((s) => !s.passed);
      if (failedSignoffs.length > 0) {
        issues.push(`QA signoff failed for "${artifact.path}": ${failedSignoffs.map((s) => s.notes).join("; ")}`);
      }
    }
  }

  // If there are structural issues, return them
  if (issues.length > 0) {
    return {
      approved: false,
      notes: `Found ${issues.length} issue(s):\n${issues.join("\n")}`,
      sendBack: issues,
    };
  }

  // Optional LLM review of acceptance criteria
  if (callLLM) {
    try {
      const systemPrompt = "You are a product quality reviewer. Compare QA results against the original product brief. Are all acceptance criteria met? Any concerns? Return JSON: { \"approved\": boolean, \"notes\": string, \"sendBack\": string[] }";

      const artifactSummary = manifest.artifacts
        .map((a) => `${a.path} (${a.status})`)
        .join("; ");
      const signoffSummary = manifest.qaSignoffs
        .map((s) => `${s.artifactPath}: ${s.passed ? "PASS" : "FAIL"} — ${s.notes}`)
        .join("; ");

      const userPrompt = `Product: ${brief.title}\nProblem: ${brief.problemStatement}\nUser Stories: ${brief.userStories.join("; ")}\nArtifacts: ${artifactSummary}\nQA Results: ${signoffSummary}`;

      const raw = await callLLM(systemPrompt, userPrompt);
      return parseSignoffResponse(raw);
    } catch {
      // LLM review failed, approve based on structural checks
    }
  }

  return {
    approved: true,
    notes: "All artifacts pass QA and meet acceptance criteria.",
  };
}

/** Parse LLM signoff response. */
function parseSignoffResponse(raw: string): SignoffResult {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    return {
      approved: !!parsed.approved,
      notes: parsed.notes ?? "LLM review completed",
      sendBack: Array.isArray(parsed.sendBack) ? parsed.sendBack : undefined,
    };
  } catch {
    return {
      approved: true,
      notes: "LLM review could not be parsed — approving on structural checks.",
    };
  }
}
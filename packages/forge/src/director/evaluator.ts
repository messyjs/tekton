/**
 * Evaluator — Scores a ProductBrief against director criteria.
 *
 * Uses LLM to score each criterion, then applies thresholds
 * to determine approved / revise / rejected verdict.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProductBrief, DirectorDecision } from "../types.js";

// ── Criteria config ────────────────────────────────────────────────────────

interface Criterion {
  name: string;
  description: string;
  weight: number;
  rubric: string;
}

interface DirectorCriteriaConfig {
  criteria: Criterion[];
  thresholds: {
    approveMinAverage: number;
    approveMinIndividual: number;
    rejectMaxAverage: number;
  };
  maxRevisions: number;
}

const CONFIGS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "configs");
let _config: DirectorCriteriaConfig | null = null;

function loadCriteria(): DirectorCriteriaConfig {
  if (_config) return _config;
  const filePath = join(CONFIGS_DIR, "director-criteria.json");
  _config = JSON.parse(readFileSync(filePath, "utf-8")) as DirectorCriteriaConfig;
  return _config;
}

/**
 * Evaluate a ProductBrief against director criteria.
 *
 * Uses the provided LLM call function for scoring, or falls back
 * to heuristic scoring based on brief content analysis.
 */
export async function evaluateBrief(
  brief: ProductBrief,
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<DirectorDecision> {
  const config = loadCriteria();

  let scores: Record<string, number>;
  let reasoning: string;

  if (callLLM) {
    const result = await llmEvaluate(brief, config, callLLM);
    scores = result.scores;
    reasoning = result.reasoning;
  } else {
    const result = heuristicEvaluate(brief, config);
    scores = result.scores;
    reasoning = result.reasoning;
  }

  // Apply thresholds
  const scoreValues = Object.values(scores);
  const weightedAvg = scoreValues.reduce((sum, val, i) => {
    const weight = config.criteria[i]?.weight ?? 1;
    return sum + val * weight;
  }, 0) / config.criteria.reduce((sum, c) => sum + c.weight, 0);

  const minIndividual = Math.min(...scoreValues);

  if (weightedAvg >= config.thresholds.approveMinAverage && minIndividual >= config.thresholds.approveMinIndividual) {
    return {
      verdict: "approved",
      reasoning,
      scores: scores as DirectorDecision["scores"],
    };
  }

  if (weightedAvg <= config.thresholds.rejectMaxAverage) {
    return {
      verdict: "rejected",
      reasoning,
      scores: scores as DirectorDecision["scores"],
    };
  }

  // Revise — identify weak areas
  const weakAreas = config.criteria
    .filter((c, i) => scoreValues[i] < config.thresholds.approveMinIndividual)
    .map((c, i) => `${c.name} (${scoreValues[i]}/10): ${c.description}`);

  const revisionNotes = weakAreas.length > 0
    ? `Strengthen these areas:\n${weakAreas.join("\n")}`
    : `Average score ${weightedAvg.toFixed(1)} is below the approval threshold of ${config.thresholds.approveMinAverage}.`;

  return {
    verdict: "revise",
    reasoning,
    scores: scores as DirectorDecision["scores"],
    revisionNotes,
  };
}

/** LLM-based evaluation. */
async function llmEvaluate(
  brief: ProductBrief,
  config: DirectorCriteriaConfig,
  callLLM: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<{ scores: Record<string, number>; reasoning: string }> {
  const criteriaList = config.criteria
    .map((c) => `  ${c.name}: ${c.description}\n  Rubric: ${c.rubric}`)
    .join("\n\n");

  const systemPrompt = `You are a product director evaluating a product brief. Score each criterion from 1-10. Return ONLY valid JSON: { "scores": { "feasibility": N, "clarity": N, "completeness": N, "originality": N, "scopeAppropriate": N }, "reasoning": "..." }`;

  const userPrompt = `Evaluate this product brief:\n\nTitle: ${brief.title}\nProblem: ${brief.problemStatement}\nSolution: ${brief.proposedSolution}\nTechnical: ${brief.technicalApproach}\nUser Stories: ${brief.userStories.join("; ")}\nRisks: ${brief.risks.join("; ")}\nComplexity: ${brief.estimatedComplexity}\n\nCriteria:\n${criteriaList}`;

  const raw = await callLLM(systemPrompt, userPrompt);
  return parseEvaluation(raw, config);
}

/** Parse LLM evaluation response. */
function parseEvaluation(
  raw: string,
  config: DirectorCriteriaConfig,
): { scores: Record<string, number>; reasoning: string } {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    const scores: Record<string, number> = {};
    for (const criterion of config.criteria) {
      scores[criterion.name] = typeof parsed.scores?.[criterion.name] === "number"
        ? Math.max(1, Math.min(10, parsed.scores[criterion.name]))
        : 5; // default middle score if LLM misses one
    }
    return {
      scores,
      reasoning: parsed.reasoning ?? "Evaluated by director",
    };
  } catch {
    // Fallback to heuristic
    return heuristicEvaluate({ id: "", title: "", problemStatement: "", proposedSolution: "", technicalApproach: "", userStories: [], risks: [], estimatedComplexity: "medium", domains: ["web-app"], ideationTranscript: "", createdAt: Date.now(), revisionHistory: [] } as ProductBrief, config);
  }
}

/** Heuristic evaluation when no LLM is available. */
function heuristicEvaluate(
  brief: ProductBrief,
  config: DirectorCriteriaConfig,
): { scores: Record<string, number>; reasoning: string } {
  const scores: Record<string, number> = {};

  // Feasibility: longer technical approach → higher
  const techLen = (brief.technicalApproach ?? "").length;
  scores.feasibility = brief.technicalApproach ? Math.min(10, 4 + Math.floor(techLen / 50)) : 3;

  // Clarity: problem + solution specificity
  const clarityScore = (brief.problemStatement?.length ?? 0) > 50 && (brief.proposedSolution?.length ?? 0) > 30 ? 7 : 4;
  scores.clarity = clarityScore;

  // Completeness: user stories + risks
  const stories = brief.userStories?.length ?? 0;
  const risks = brief.risks?.length ?? 0;
  scores.completeness = Math.min(10, 3 + stories + risks);

  // Originality: moderate default
  scores.originality = 5;

  // Scope appropriateness
  const complexity = brief.estimatedComplexity;
  scores.scopeAppropriate = complexity === "extreme" ? 2 : complexity === "high" ? 5 : complexity === "medium" ? 7 : 9;

  const reasoning = `Heuristic evaluation: feasibility=${scores.feasibility}, clarity=${scores.clarity}, completeness=${scores.completeness}, originality=${scores.originality}, scope=${scores.scopeAppropriate}`;

  return { scores, reasoning };
}
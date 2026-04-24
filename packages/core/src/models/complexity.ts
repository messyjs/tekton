import type { RoutingContext } from "./router.js";

const ESCALATION_KEYWORDS = [
  "architect",
  "debug complex",
  "refactor entire",
  "security audit",
  "design system",
  "optimize algorithm",
  "distributed",
  "concurrent",
  "race condition",
  "redesign",
  "rewrite",
  "migrate",
];

const SIMPLE_KEYWORDS = [
  "format",
  "rename",
  "add comment",
  "simple test",
  "boilerplate",
  "typo",
  "lint",
  "fix typo",
  "log",
  "print",
  "echo",
  "list",
  "show",
  "count",
];

export function scoreComplexity(context: RoutingContext): number {
  let score = 0;

  // Base score from token count (logarithmic scale)
  if (context.tokenCount > 0) {
    score += Math.log10(context.tokenCount) / Math.log10(10000);
  }

  // Subsequent complexity adjustments normalized to keep baseline ~0.3-0.7 range
  const prompt = context.prompt.toLowerCase();

  // Escalation keywords: +0.2
  for (const kw of ESCALATION_KEYWORDS) {
    if (prompt.includes(kw)) {
      score += 0.2;
      break; // Only add once
    }
  }

  // Simple keywords: -0.2
  for (const kw of SIMPLE_KEYWORDS) {
    if (prompt.includes(kw)) {
      score -= 0.2;
      break;
    }
  }

  // Skill match reduces complexity: -0.3
  if (context.matchingSkills.length > 0) {
    // If a high-confidence skill exists, complexity is lower
    score -= 0.3;
  }

  // Multiple code blocks: +0.1
  if (context.hasCodeBlocks) {
    score += 0.1;
  }

  // "Why" questions need deeper reasoning: +0.15
  if (/\bwhy\b/.test(prompt)) {
    score += 0.15;
  }

  // Session history: if recent tasks were complex, slightly boost
  if (context.sessionComplexityHistory.length >= 3) {
    const avgRecent = context.sessionComplexityHistory.slice(-3).reduce((a, b) => a + b, 0) / 3;
    score += avgRecent * 0.05; // Slight influence from history
  }

  // Clamp to [0.0, 1.0]
  return Math.max(0.0, Math.min(1.0, score));
}
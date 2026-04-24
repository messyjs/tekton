// Skill Learning — Demonstrate skill extraction
import { compress, detectTier, estimateTokens } from "@tekton/core";

async function main() {
  console.log("⚡ Tekton Skill Learning Example\n");

  // Simulate a conversation that produces a skill
  const conversation = `
User: I need to refactor this function to handle errors properly.
Assistant: Let me analyze the current implementation. The function doesn't
handle null inputs and could throw uncaught exceptions. Here's the pattern:
1. Validate inputs at the start
2. Use try/catch for the main logic
3. Return a Result type (success/failure) instead of throwing
4. Log errors with context

This error-handling pattern can be reused anywhere we process user inputs.

Skill: error-handling-pattern
Trigger: When asked to add error handling or make code more robust
Steps:
  1. Identify all input parameters and their possible states
  2. Add validation guards at the function entry
  3. Wrap main logic in try/catch
  4. Return a Result type (not exceptions)
  5. Add context to error logs
Confidence: 0.85
`;

  // Compress the skill for storage
  const tier = detectTier(conversation);
  const compressed = compress(conversation, tier);
  const tokens = estimateTokens(conversation);

  console.log("Extracted Skill:");
  console.log("  Name: error-handling-pattern");
  console.log("  Trigger: When asked to add error handling");
  console.log("  Confidence: 0.85");
  console.log(`  Original tokens: ${tokens}`);
  console.log(`  Compressed: ${compressed.length} chars (${tier} tier)`);
  console.log();

  // Demonstrate skill ranking
  const skills = [
    { name: "code-generation", confidence: 0.95, uses: 120 },
    { name: "code-review", confidence: 0.92, uses: 87 },
    { name: "error-handling-pattern", confidence: 0.85, uses: 23 },
    { name: "security-audit", confidence: 0.78, uses: 15 },
    { name: "database-design", confidence: 0.65, uses: 5 },
  ];

  console.log("Skill Rankings:");
  skills
    .sort((a, b) => b.confidence - a.confidence)
    .forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (${(s.confidence * 100).toFixed(0)}% confidence, ${s.uses} uses)`);
    });
}

main().catch(console.error);
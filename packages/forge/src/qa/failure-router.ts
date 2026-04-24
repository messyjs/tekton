/**
 * Failure Router — Creates retry TaskCards from failed QA results.
 *
 * Produces a new task card that includes what failed, the test output,
 * and specific fix instructions, linked back to the original.
 */
import { randomUUID } from "node:crypto";
import type { TaskCard } from "../types.js";
import type { QAResult } from "./verdict.js";

/**
 * Create a retry task card from a QA failure.
 */
export function createRetryCard(
  original: TaskCard,
  failure: QAResult,
): TaskCard {
  const retryId = `retry-${original.id}-${randomUUID().slice(0, 6)}`;

  const description = [
    `Fix QA failure for task "${original.title}" (original: ${original.id}).`,
    ``,
    `## What was built`,
    original.description,
    ``,
    `## What failed`,
    `Tester: ${failure.tester}`,
    `Category: ${failure.category}`,
    `Details: ${failure.details}`,
    ``,
    `## Fix instructions`,
    `- Fix the following issue using the patch tool for targeted changes`,
    `- Do NOT rewrite the entire file. The error is: ${failure.details}`,
    `- In file: check the affected code section`,
    `- Re-run the failing tests to verify the fix`,
    `- Ensure no regressions in previously passing tests`,
    `- All output files should be saved with .beta suffix`,
  ].join("\n");

  return {
    id: retryId,
    planId: original.planId,
    role: original.role,
    title: `Fix: ${original.title} (${failure.category} failure)`,
    description,
    context: `Original task: ${original.id}\nFailure: ${failure.details}`,
    acceptanceCriteria: [
      ...original.acceptanceCriteria,
      `The specific ${failure.category} failure must be resolved`,
      `All previously passing tests must still pass`,
    ],
    outputFiles: original.outputFiles,
    dependencies: [], // Retry cards have no dependencies — fix immediately
    status: "pending",
    sessionHistory: [],
  };
}
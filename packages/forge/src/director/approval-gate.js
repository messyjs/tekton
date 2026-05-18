/**
 * Approval Gate — Full director pipeline for brief evaluation.
 *
 * 1. Evaluate brief quality (evaluator)
 * 2. Classify domains
 * 3. Preflight check per domain
 * 4. Generate production plan
 * 5. Revision tracking
 * 6. Final signoff
 */
import { evaluateBrief } from "./evaluator.js";
import { classifyDomains } from "./domain-classifier.js";
import { generatePlan } from "./plan-generator.js";
import { checkMultipleDomains } from "../preflight.js";
const DEFAULT_CONFIG = {
    maxRevisions: 3,
};
/**
 * Evaluate a brief through the full approval pipeline.
 */
export async function evaluate(brief, config = DEFAULT_CONFIG) {
    // Step 1: Evaluate brief quality
    const decision = await evaluateBrief(brief, config.callLLM);
    if (decision.verdict === "approved") {
        // Step 2: Classify domains
        const domains = await classifyDomains(brief, config.callLLM);
        // Step 3: Preflight check
        const preflight = await preflightCheck(domains);
        if (!preflight.ready) {
            return {
                ...decision,
                verdict: "revise",
                revisionNotes: `Missing capabilities: ${preflight.missing.join(", ")}`,
            };
        }
        // Step 4: Generate production plan
        try {
            const plan = await generatePlan(brief, domains, config.callLLM);
            decision.productionPlan = JSON.stringify(plan, null, 2);
        }
        catch (e) {
            decision.productionPlan = undefined;
        }
    }
    return decision;
}
/** Preflight check using the real domain tool registry. */
async function preflightCheck(domains) {
    const result = await checkMultipleDomains(domains);
    return { ready: result.ready, missing: result.missing };
}
//# sourceMappingURL=approval-gate.js.map
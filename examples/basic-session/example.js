// Basic Session — Minimal Tekton session via SDK
import { ModelRouter, compress, detectTier, estimateTokens, loadConfig } from "@tekton/core";
async function main() {
    console.log("⚡ Tekton Basic Session Example\n");
    // Load config
    const config = loadConfig();
    console.log(`Identity: ${config.identity.name}`);
    console.log(`Fast model: ${config.models.fast.model}`);
    console.log(`Deep model: ${config.models.deep.model}`);
    console.log();
    // Route a prompt
    const router = new ModelRouter({
        fastModel: config.models.fast.model,
        fastProvider: config.models.fast.provider,
        deepModel: config.models.deep.model,
        deepProvider: config.models.deep.provider,
        fallbackChain: [],
        complexityThreshold: config.routing.complexityThreshold,
        simpleThreshold: config.routing.simpleThreshold,
    });
    const prompts = [
        "What is 2+2?",
        "Write a full React app with TypeScript and routing",
        "Explain quantum computing",
    ];
    for (const prompt of prompts) {
        const decision = router.route({
            prompt,
            tokenCount: estimateTokens(prompt),
            hasCodeBlocks: false,
            matchingSkills: [],
            sessionComplexityHistory: [],
        });
        console.log(`Prompt: ${prompt.slice(0, 40)}...`);
        console.log(`  → Model: ${decision.model} (${decision.reason})`);
        console.log(`  → Complexity: ${decision.complexityScore.toFixed(2)}`);
        console.log();
    }
    // Compress some text
    const text = "This is a long conversation history that we want to compress to save tokens. ".repeat(10);
    const tier = detectTier(text);
    const compressed = compress(text, tier);
    console.log(`Compression: ${text.length} chars → ${compressed.length} chars (${tier} tier)`);
    console.log(`Token estimate: ${estimateTokens(text)} tokens`);
}
main().catch(console.error);
//# sourceMappingURL=example.js.map
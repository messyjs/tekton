// Compression Demo — Token savings across tiers
import { compress, detectTier, estimateTokens, getCompressionRatio } from "@tekton/core";
async function main() {
    console.log("⚡ Tekton Compression Demo\n");
    const samples = [
        { name: "Short chat", text: "Hello! How are you doing today?" },
        { name: "Code question", text: "How do I implement a binary search tree in TypeScript with generic types?" },
        { name: "Long context", text: "Consider a distributed system where multiple services communicate through message queues. The system needs to handle failures gracefully, retry operations with exponential backoff, and maintain eventual consistency across services. Each service should be independently deployable and scalable. The architecture follows the microservices pattern with event-driven communication using the publish-subscribe model. Services include: User Service, Order Service, Payment Service, Notification Service, and Analytics Service.".repeat(3) },
    ];
    console.log("Tier         | Short Chat | Code Question | Long Context");
    console.log("─────────────┼────────────┼───────────────┼─────────────");
    for (const tier of ["lite", "compact", "full"]) {
        const results = samples.map(s => {
            const compressed = compress(s.text, tier);
            const ratio = getCompressionRatio(s.text, compressed);
            return `${ratio.toFixed(1).padStart(6)} (${compressed.length}ch)`;
        });
        console.log(`${tier.padEnd(13)}| ${results[0]} | ${results[1]} | ${results[2]}`);
    }
    console.log();
    console.log("Token Savings:");
    console.log("─────────────────────────────");
    for (const sample of samples) {
        const originalTokens = estimateTokens(sample.text);
        const tier = detectTier(sample.text);
        const compressed = compress(sample.text, tier);
        const compressedTokens = estimateTokens(compressed);
        const saved = originalTokens - compressedTokens;
        const pct = ((saved / originalTokens) * 100).toFixed(1);
        console.log(`  ${sample.name}:`);
        console.log(`    Original: ${originalTokens} tokens`);
        console.log(`    Compressed: ${compressedTokens} tokens (${tier} tier)`);
        console.log(`    Saved: ${saved} tokens (${pct}%)`);
        console.log();
    }
}
main().catch(console.error);
//# sourceMappingURL=example.js.map
// Gateway Bot — Telegram bot example
import { GatewayRunner } from "@tekton/gateway";
import { SessionStore } from "@tekton/gateway";
import { RateLimiter } from "@tekton/gateway";
async function main() {
    console.log("⚡ Tekton Gateway Bot Example\n");
    // Create session store and rate limiter
    const sessionStore = new SessionStore("./sessions.db");
    const rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 30 });
    // Create gateway runner
    const runner = new GatewayRunner({
        platforms: ["telegram"],
        tokens: {
            telegram: process.env.TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN",
        },
    });
    runner.setSessionStore(sessionStore);
    runner.setRateLimiter(rateLimiter);
    // Start the gateway
    await runner.start();
    console.log("Gateway started!");
    // Check status
    const status = runner.getStatus();
    console.log(`Running: ${status.running}`);
    for (const [name, ps] of Object.entries(status.platforms)) {
        console.log(`  ${name}: ${ps.connected ? "Connected" : "Disconnected"}`);
    }
    // Handle incoming messages
    runner.onMessage((message) => {
        console.log(`[${message.platform}] ${message.userName}: ${message.text}`);
        // Rate limit check
        if (!rateLimiter.check(message.userId)) {
            console.log(`Rate limited: ${message.userId}`);
            return;
        }
        // Process message through Tekton pipeline
        // (In production, this would route through the full agent)
        const response = `Echo: ${message.text}`;
        runner.send(message.platform, message.userId, response);
    });
    // Graceful shutdown
    process.on("SIGINT", async () => {
        console.log("\nShutting down...");
        await runner.stop();
        sessionStore.close();
        process.exit(0);
    });
}
main().catch(console.error);
//# sourceMappingURL=example.js.map
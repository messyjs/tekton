import { parseArgs } from "./types.js";
/**
 * Central registry for all /tekton:* slash commands.
 */
export class CommandRegistry {
    commands = new Map();
    register(command) {
        if (this.commands.has(command.name)) {
            throw new Error(`Command already registered: ${command.name}`);
        }
        this.commands.set(command.name, command);
    }
    get(name) {
        return this.commands.get(name);
    }
    list() {
        return [...this.commands.values()];
    }
    /**
     * Register all commands with Pi's ExtensionAPI.
     */
    registerAll(pi, ctx) {
        for (const cmd of this.commands.values()) {
            pi.registerCommand(cmd.name, {
                description: cmd.description,
                handler: async (args, piCtx) => {
                    const parsed = parseArgs(args ?? "");
                    // Handle --help
                    if (parsed.flags.help || parsed.flags.h) {
                        const help = this.getHelp(cmd);
                        piCtx.ui.notify(help);
                        return;
                    }
                    try {
                        await cmd.handler(parsed, ctx, pi, piCtx);
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        piCtx.ui.notify(`❌ Error in /${cmd.name}: ${message}`, "error");
                    }
                },
                getArgumentCompletions: cmd.getArgumentCompletions ?? undefined,
            });
        }
    }
    /**
     * Generate help text for a specific command.
     */
    getHelp(cmd) {
        const lines = [
            `/${cmd.name}`,
            cmd.description,
            "",
        ];
        if (cmd.subcommands && Object.keys(cmd.subcommands).length > 0) {
            lines.push("Subcommands:");
            for (const [name, desc] of Object.entries(cmd.subcommands)) {
                lines.push(`  ${name.padEnd(16)}${desc}`);
            }
            lines.push("");
        }
        lines.push("Flags:");
        lines.push("  --json, -j       Output as JSON");
        lines.push("  --help, -h       Show this help");
        return lines.join("\n");
    }
    /**
     * Generate a full help listing for all registered commands.
     */
    getFullHelp() {
        const commands = this.list().sort((a, b) => a.name.localeCompare(b.name));
        const lines = [
            "╔══════════════════════════════════════════╗",
            "║       T E K T O N    Commands            ║",
            "╠══════════════════════════════════════════╣",
            "",
        ];
        for (const cmd of commands) {
            lines.push(`  /${cmd.name}`);
            lines.push(`    ${cmd.description}`);
            if (cmd.subcommands && Object.keys(cmd.subcommands).length > 0) {
                lines.push(`    Subcommands: ${Object.keys(cmd.subcommands).join(", ")}`);
            }
            lines.push("");
        }
        lines.push("╚══════════════════════════════════════════╝");
        return lines.join("\n");
    }
}
/**
 * Feature state tracker — toggled by /tekton:on and /tekton:off.
 */
export const featureState = {
    routing: true,
    learning: true,
    compression: true,
};
//# sourceMappingURL=registry.js.map
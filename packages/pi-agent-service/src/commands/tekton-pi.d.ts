/**
 * /tekton:pi — PI Agent trading intelligence control command.
 *
 * This command is a thin HTTP client to the PI Agent sidecar running on :7706.
 * It does NOT import from the CLI package — it's self-contained so the
 * pi-agent-service package can compile independently.
 *
 * To register this command, add it to the CLI's command registry:
 *   import { piCommand } from "@tekton/pi-agent-service/commands";
 *   registry.register(piCommand);
 */
/** The PI Agent command definition — plain object, compatible with any CLI registry */
export declare const piCommand: {
    name: string;
    description: string;
    subcommands: {
        status: string;
        start: string;
        stop: string;
        signal: string;
        gann: string;
        fib: string;
        quote: string;
        positions: string;
        history: string;
        glm: string;
        trade: string;
        close: string;
    };
    handler(args: any, ctx: any, pi: any, piCtx: any): Promise<void>;
};
//# sourceMappingURL=tekton-pi.d.ts.map
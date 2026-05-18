export interface PiArgs {
    continue: boolean;
    resume: string | null;
    print: boolean;
    mode: "interactive" | "print" | "rpc";
    provider: string | null;
    model: string | null;
    thinking: "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | null;
    tools: string[];
    noSession: boolean;
    session: string | null;
}
export interface TektonFlags {
    route: "auto" | "fast" | "deep" | "rules";
    compress: "off" | "lite" | "full" | "ultra";
    noLearning: boolean;
    dashboard: boolean;
    dashboardPort: number;
    noDashboard: boolean;
    soul: string | null;
    personality: string | null;
    toolsets: string[];
    gateway: boolean;
    voice: boolean;
}
export interface ParsedArgs {
    pi: PiArgs;
    tekton: TektonFlags;
    initialMessage: string | null;
    showHelp: boolean;
}
declare const HELP_TEXT: string;
export { HELP_TEXT };
export declare function parseArgs(argv: string[]): ParsedArgs;
export declare function getTektonHome(): string;
export declare function initTektonHome(tektonHome: string): void;
export declare function run(argv: string[]): Promise<void>;
//# sourceMappingURL=run.d.ts.map
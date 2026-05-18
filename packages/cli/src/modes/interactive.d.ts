import type { TektonConfig } from "@tekton/core";
import type { ParsedArgs } from "../run.js";
export interface TektonConfigEffective {
    activeModel: string;
    routingMode: string;
    skillCount: number;
    compression: string;
    learning: string;
}
export declare function startInteractiveMode(config: TektonConfig, parsed: ParsedArgs, tektonHome: string): Promise<void>;
//# sourceMappingURL=interactive.d.ts.map
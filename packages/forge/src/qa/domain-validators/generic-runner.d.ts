import type { QAResult } from "../verdict.js";
export interface GenericRunnerConfig {
    testCommand: string;
    timeout?: number;
    description?: string;
}
export declare function runGenericTests(projectDir: string, config: GenericRunnerConfig): Promise<QAResult>;
//# sourceMappingURL=generic-runner.d.ts.map
import type { ForgeManifest, ArtifactStatus } from "./types.js";
/**
 * Mark an artifact as beta: moves it from src/ to beta/ directory.
 */
export declare function markBeta(projectDir: string, filePath: string): string;
/**
 * Mark an artifact as testing: moves it from beta/ to testing/ directory.
 */
export declare function markTesting(projectDir: string, filePath: string): string;
/**
 * Promote an artifact to release: removes beta tag, moves to final location.
 * THROWS if the manifest has no QA signoffs for this artifact.
 */
export declare function promote(projectDir: string, filePath: string, manifest: ForgeManifest): string;
/**
 * Get the current status of an artifact based on its location.
 */
export declare function getStatus(projectDir: string, filePath: string): ArtifactStatus | null;
//# sourceMappingURL=artifact-tracker.d.ts.map
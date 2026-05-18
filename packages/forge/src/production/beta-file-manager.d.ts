/**
 * Mark a file as beta by renaming with .beta suffix and moving to beta/ directory.
 * Returns the new path.
 */
export declare function markAsBeta(projectDir: string, filePath: string): string;
/**
 * Check if a file path is a beta file.
 */
export declare function isBetaFile(path: string): boolean;
/**
 * Get the original (non-beta) name from a beta file path.
 * Strips the .beta suffix: "auth.beta.ts" → "auth.ts"
 */
export declare function getOriginalName(betaPath: string): string;
/**
 * List all beta files in a project directory.
 * In a real implementation, this would scan the filesystem.
 * For testing, it returns paths based on the beta naming convention.
 */
export declare function listBetaFiles(projectDir: string): string[];
//# sourceMappingURL=beta-file-manager.d.ts.map
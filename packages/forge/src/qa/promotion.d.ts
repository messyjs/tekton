import type { ForgeManifest } from "../types.js";
/**
 * Promote a single artifact from beta to release.
 *
 * 1. Check manifest for QA signoffs on this artifact — THROW if missing
 * 2. Get original name via beta-file-manager
 * 3. Move from beta/ to final location (e.g., src/)
 * 4. Update manifest: artifact status → "release"
 * 5. Return new path
 */
export declare function promoteArtifact(projectDir: string, betaPath: string, manifest: ForgeManifest): {
    newPath: string;
    updatedManifest: ForgeManifest;
};
/**
 * Promote all artifacts that have full QA signoffs.
 *
 * Skips any without signoffs (logs warning).
 * Returns list of promoted paths.
 */
export declare function promoteAll(projectDir: string, manifest: ForgeManifest): {
    promotedPaths: string[];
    updatedManifest: ForgeManifest;
    skipped: string[];
};
//# sourceMappingURL=promotion.d.ts.map
import type { ForgeManifest, ArtifactEntry, ArtifactStatus, QASignoff } from "./types.js";
/**
 * Load a manifest from a project directory.
 * Creates a minimal manifest if none exists.
 */
export declare function loadManifest(projectDir: string, projectId?: string): ForgeManifest;
/**
 * Save a manifest to a project directory.
 */
export declare function saveManifest(projectDir: string, manifest: ForgeManifest): void;
/**
 * Add an artifact to the manifest.
 */
export declare function addArtifact(manifest: ForgeManifest, artifact: ArtifactEntry): ForgeManifest;
/**
 * Update the status of an artifact by path.
 */
export declare function updateArtifactStatus(manifest: ForgeManifest, path: string, newStatus: ArtifactStatus): ForgeManifest;
/**
 * Get artifacts filtered by status.
 */
export declare function getArtifactsByStatus(manifest: ForgeManifest, status: ArtifactStatus): ArtifactEntry[];
/**
 * Add a QA signoff to the manifest.
 */
export declare function addQASignoff(manifest: ForgeManifest, signoff: QASignoff): ForgeManifest;
/**
 * Get all QA signoffs for a specific artifact path.
 */
export declare function getSignoffs(manifest: ForgeManifest, artifactPath: string): QASignoff[];
//# sourceMappingURL=manifest.d.ts.map
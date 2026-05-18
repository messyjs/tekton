/**
 * Knowledge Librarian types — document ingestion, chunking, search.
 */
export const DEFAULT_KNOWLEDGE_CONFIG = {
    enabled: false,
    storePath: "~/.tekton/knowledge/",
    indexPath: "~/.tekton/knowledge/index/",
    autoInject: true,
    maxInjectTokens: 1500,
    maxInjectChunks: 3,
    embeddingModel: "text-embedding-3-small",
    topics: {},
};
//# sourceMappingURL=types.js.map
/**
 * Knowledge Librarian types — document ingestion, chunking, search.
 */
export interface KnowledgeDocument {
    id: string;
    filename: string;
    title: string;
    filePath: string;
    format: string;
    topics: string[];
    chunks: KnowledgeChunk[];
    ingestedAt: string;
    totalTokens: number;
    fileHash: string;
}
export interface KnowledgeChunk {
    id: string;
    documentId: string;
    content: string;
    heading: string;
    pageNumber?: number;
    chunkIndex: number;
    tokens: number;
    embedding?: number[];
    topics: string[];
}
export interface KnowledgeSearchResult {
    chunk: KnowledgeChunk;
    document: KnowledgeDocument;
    relevanceScore: number;
    matchedQuery: string;
}
export interface KnowledgeConfig {
    enabled: boolean;
    storePath: string;
    indexPath: string;
    autoInject: boolean;
    maxInjectTokens: number;
    maxInjectChunks: number;
    embeddingModel: string;
    topics: Record<string, string[]>;
}
export declare const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfig;
//# sourceMappingURL=types.d.ts.map
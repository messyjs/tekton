import type { KnowledgeDocument, KnowledgeChunk, KnowledgeSearchResult, KnowledgeConfig } from "./types.js";
export declare class KnowledgeIndexStore {
    private db;
    private config;
    constructor(config: KnowledgeConfig);
    private initializeSchema;
    /**
     * Save chunks for a document. Also saves the document metadata.
     */
    saveChunks(chunks: KnowledgeChunk[], document: KnowledgeDocument): void;
    /**
     * Search for chunks by text query using FTS5 (if available) or LIKE.
     */
    searchByText(query: string, maxResults?: number): KnowledgeSearchResult[];
    /**
     * Search for chunks by topics.
     */
    searchByTopics(topics: string[], maxResults?: number): KnowledgeSearchResult[];
    getChunksByDocument(documentId: string): KnowledgeChunk[];
    getAllDocuments(): KnowledgeDocument[];
    getDocumentsByTopic(topic: string): KnowledgeDocument[];
    /**
     * Remove a document and all its chunks.
     */
    removeDocument(documentId: string): boolean;
    private rowToChunk;
    private rowToDocument;
    close(): void;
}
//# sourceMappingURL=index-store.d.ts.map
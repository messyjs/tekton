import type { KnowledgeDocument, KnowledgeConfig } from "./types.js";
export interface DoclingClient {
    parse(filePath: string): Promise<{
        text: string;
        title?: string;
        pages?: {
            number: number;
            text: string;
        }[];
    }>;
}
export declare class KnowledgeIngestor {
    private config;
    private doclingClient;
    private documents;
    constructor(config: KnowledgeConfig, doclingClient?: DoclingClient);
    /**
     * Ingest a single file into the knowledge base.
     */
    ingestFile(filePath: string): Promise<KnowledgeDocument>;
    /**
     * Ingest all supported files in a directory recursively.
     */
    ingestDirectory(dirPath: string): Promise<KnowledgeDocument[]>;
    /**
     * Remove a document from the index.
     */
    removeDocument(documentId: string): boolean;
    /**
     * Get all documents.
     */
    getAllDocuments(): KnowledgeDocument[];
    /**
     * Get a document by ID.
     */
    getDocument(id: string): KnowledgeDocument | undefined;
    private chunkContent;
    private chunkPages;
    private chunkText;
    private splitByHeadings;
    private splitIntoChunks;
    private detectTopicsForChunk;
    private extractTitleFromMarkdown;
    private findExistingDocument;
}
//# sourceMappingURL=ingestor.d.ts.map
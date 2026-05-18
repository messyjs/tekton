/**
 * Knowledge Librarian — Auto-injects relevant reference material from a
 * local document library into LLM conversations based on detected topics.
 *
 * Two-phase topic detection:
 * 1. Fast keyword scan against configured topic → keyword mappings
 * 2. LLM-based detection for technical messages without keyword matches
 */
import type { KnowledgeConfig, KnowledgeSearchResult } from "./types.js";
import { KnowledgeIndexStore } from "./index-store.js";
export interface LibrarianResult {
    chunks: KnowledgeSearchResult[];
    formattedInjection: string;
    totalTokens: number;
}
export type LLMCallerForLibrarian = (prompt: string) => Promise<string>;
export declare class KnowledgeLibrarian {
    private config;
    private store;
    private llmCaller;
    constructor(config: KnowledgeConfig, store: KnowledgeIndexStore, llmCaller?: LLMCallerForLibrarian);
    /**
     * Detect topics in a message using keyword matching first, then LLM.
     */
    detectTopics(message: string): Promise<string[]>;
    /**
     * Get relevant knowledge for injection based on a message and conversation context.
     * Returns null if no relevant topics are detected.
     */
    getRelevantKnowledge(message: string, conversationContext?: string): Promise<LibrarianResult | null>;
    /**
     * Manual search (user asks for specific material).
     */
    search(query: string, maxResults?: number): Promise<KnowledgeSearchResult[]>;
    private keywordScan;
    private isLikelyTechnical;
    private parseTopicResponse;
    private formatInjection;
}
//# sourceMappingURL=librarian.d.ts.map
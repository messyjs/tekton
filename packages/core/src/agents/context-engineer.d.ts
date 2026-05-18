import type { PrecisionItem, ContextEngineerConfig, OptimizedContext, ContextEngineerStats, Message } from "./types.js";
export declare const DEFAULT_CONTEXT_ENGINEER_CONFIG: ContextEngineerConfig;
/**
 * Call LLM for extraction/rewriting. In production this calls a real model.
 * For testing, callers can inject a mock via the config.
 */
export type LLMCaller = (prompt: string) => Promise<string>;
export declare class ContextEngineer {
    private config;
    private messages;
    private precisionItems;
    private rollingContext;
    private lastRewriteAt;
    private llmCaller;
    constructor(config?: Partial<ContextEngineerConfig>, llmCaller?: LLMCaller);
    /**
     * Process a message after every conversation turn.
     * Extracts precision items and triggers periodic context rewrites.
     */
    processMessage(message: Message): Promise<void>;
    /**
     * Returns the optimized context to inject into the next LLM call.
     */
    getOptimizedContext(): OptimizedContext;
    /**
     * Get the precision log as formatted text, grouped by category.
     */
    getPrecisionLog(): string;
    /**
     * Manually pin a precision item — it will never be superseded.
     */
    pinItem(item: Omit<PrecisionItem, "id" | "sourceMessageIndex" | "superseded" | "pinned" | "timestamp">): void;
    /**
     * Get stats for dashboard/debugging.
     */
    getStats(): ContextEngineerStats;
    /**
     * Get all precision items (for handoff/persistence).
     */
    getPrecisionItems(): PrecisionItem[];
    /**
     * Inject precision items (from handoff/persistence).
     */
    injectPrecisionItems(items: PrecisionItem[]): void;
    /**
     * Get the raw messages buffer (for handoff/persistence).
     */
    getMessages(): Message[];
    /**
     * Inject messages (from handoff/persistence).
     */
    injectMessages(messages: Message[]): void;
    /**
     * Set the LLM caller (for testing or runtime injection).
     */
    setLLMCaller(caller: LLMCaller): void;
    /**
     * Get config (read-only).
     */
    getConfig(): ContextEngineerConfig;
    /**
     * Extract precision items from a single message using LLM.
     */
    private extractPrecisionItems;
    /**
     * Heuristic-based precision extraction (fallback when LLM unavailable).
     */
    private heuristicExtraction;
    /**
     * Parse LLM response for extracted items.
     */
    private parseExtractionResponse;
    /**
     * Add a precision item, handling supersession logic.
     */
    private addPrecisionItem;
    /**
     * Rewrite the rolling context from scratch using LLM.
     */
    private rewriteRollingContext;
}
//# sourceMappingURL=context-engineer.d.ts.map
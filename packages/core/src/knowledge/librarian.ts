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

export class KnowledgeLibrarian {
  private config: KnowledgeConfig;
  private store: KnowledgeIndexStore;
  private llmCaller: LLMCallerForLibrarian | null;

  constructor(config: KnowledgeConfig, store: KnowledgeIndexStore, llmCaller?: LLMCallerForLibrarian) {
    this.config = config;
    this.store = store;
    this.llmCaller = llmCaller ?? null;
  }

  /**
   * Detect topics in a message using keyword matching first, then LLM.
   */
  async detectTopics(message: string): Promise<string[]> {
    // Step 1: Fast keyword scan
    const keywordTopics = this.keywordScan(message);
    if (keywordTopics.length > 0) {
      return keywordTopics;
    }

    // Step 2: If message looks technical but no keywords matched, use LLM
    if (this.isLikelyTechnical(message) && this.llmCaller) {
      try {
        const topicList = Object.keys(this.config.topics);
        if (topicList.length === 0) return [];

        const prompt = `Does this message reference any of these knowledge areas: ${topicList.join(", ")}? Return a JSON array of matching topic names, or an empty array if none match.\n\nMessage: ${message}`;
        const response = await this.llmCaller(prompt);
        const parsed = this.parseTopicResponse(response);
        return parsed;
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Get relevant knowledge for injection based on a message and conversation context.
   * Returns null if no relevant topics are detected.
   */
  async getRelevantKnowledge(
    message: string,
    conversationContext: string = "",
  ): Promise<LibrarianResult | null> {
    // Detect topics
    const topics = await this.detectTopics(message);
    if (topics.length === 0) return null;

    // Search by topics
    const topicResults = this.store.searchByTopics(topics, this.config.maxInjectChunks);

    // Also search by text for additional relevance
    const textResults = this.store.searchByText(message, this.config.maxInjectChunks);

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: KnowledgeSearchResult[] = [];

    for (const result of [...topicResults, ...textResults]) {
      if (!seen.has(result.chunk.id)) {
        seen.add(result.chunk.id);
        merged.push(result);
      }
    }

    // Sort by relevance
    merged.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Take top N chunks
    const selected = merged.slice(0, this.config.maxInjectChunks);

    if (selected.length === 0) return null;

    // Format injection
    const formatted = this.formatInjection(selected);

    // Check token limit
    const tokenEstimate = Math.ceil(formatted.length / 4);
    if (tokenEstimate > this.config.maxInjectTokens) {
      // Trim by dropping lowest-relevance chunks
      while (selected.length > 1 && tokenEstimate > this.config.maxInjectTokens) {
        selected.pop();
        const trimmed = this.formatInjection(selected);
        if (Math.ceil(trimmed.length / 4) <= this.config.maxInjectTokens) {
          return {
            chunks: selected,
            formattedInjection: trimmed,
            totalTokens: Math.ceil(trimmed.length / 4),
          };
        }
      }
    }

    return {
      chunks: selected,
      formattedInjection: formatted,
      totalTokens: tokenEstimate,
    };
  }

  /**
   * Manual search (user asks for specific material).
   */
  async search(query: string, maxResults: number = 5): Promise<KnowledgeSearchResult[]> {
    return this.store.searchByText(query, maxResults);
  }

  // ── Private ──────────────────────────────────────────────────────

  private keywordScan(message: string): string[] {
    const lower = message.toLowerCase();
    const matched: string[] = [];

    for (const [topic, keywords] of Object.entries(this.config.topics)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          if (!matched.includes(topic)) {
            matched.push(topic);
          }
          break;
        }
      }
    }

    return matched;
  }

  private isLikelyTechnical(message: string): boolean {
    const lower = message.toLowerCase();

    // Contains code indicators
    if (/[{}();]/.test(message) && message.length > 50) return true;

    // Contains file extensions
    if (/\.\w{1,4}\b/.test(message)) return true;

    // Contains capitalized proper nouns (possible tech terms)
    const capsWords = (message.match(/\b[A-Z][a-zA-Z]+\b/g) ?? []).length;
    if (capsWords >= 2) return true;

    // Contains technical terms
    const techTerms = ["function", "class", "method", "parameter", "config", "module", "api", "server", "database", "query", "request", "response"];
    if (techTerms.some(t => lower.includes(t))) return true;

    // Long messages (>200 chars) are more likely technical
    if (message.length > 200) return true;

    return false;
  }

  private parseTopicResponse(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => typeof item === "string");
        }
      }
    } catch {
      // Not valid JSON
    }
    return [];
  }

  private formatInjection(chunks: KnowledgeSearchResult[]): string {
    const parts: string[] = [
      "## Reference Material (auto-retrieved)",
      "",
    ];

    for (const result of chunks) {
      parts.push(`### From: ${result.document.title}${result.chunk.pageNumber ? ` (page ${result.chunk.pageNumber})` : ""}`);
      parts.push(result.chunk.content);
      parts.push("");
    }

    parts.push("---");
    parts.push("Note: This reference material was auto-retrieved based on the current conversation topic. Use it if relevant, ignore if not.");

    return parts.join("\n");
  }
}
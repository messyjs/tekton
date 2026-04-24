/**
 * Context Engineer — Maintains clean, precise context during active sessions.
 *
 * Replaces mechanical compression for live conversations. Extracts precision
 * items (exact values, specs, decisions) and rewrites rolling context so
 * the LLM gets high-quality compressed context without information loss.
 *
 * Three layers of output:
 * 1. Rolling context — rewritten summary of older messages (clean prose)
 * 2. Precision log — all exact values/specs/decisions (never summarized)
 * 3. Raw window — last N messages at full fidelity
 */
import { randomUUID } from "node:crypto";
import type {
  PrecisionItem,
  ContextEngineerConfig,
  OptimizedContext,
  ContextEngineerStats,
  Message,
} from "./types.js";

export const DEFAULT_CONTEXT_ENGINEER_CONFIG: ContextEngineerConfig = {
  model: "gemini-flash",
  rawWindowSize: 12,
  rewriteInterval: 10,
  maxPrecisionLogTokens: 2000,
  maxRollingContextTokens: 3000,
  enabled: true,
};

/**
 * Simple keyword heuristic to skip short conversational messages
 * that don't contain technical content worth extracting.
 */
const SKIP_PATTERNS = [
  /^(ok|okay|sure|yes|no|got it|sounds good|hmm|right|gotcha|makes sense|agreed|done|thanks|thank you|great|good|cool|nice|perfect|yep|nope|under?stood|will do|roger)[!.]?$/i,
  /^\s*.{0,15}\s*$/s,  // Very short messages (≤15 chars)
];

function shouldSkipForExtraction(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length === 0) return true;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/**
 * Estimate tokens roughly (4 chars ≈ 1 token).
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Call LLM for extraction/rewriting. In production this calls a real model.
 * For testing, callers can inject a mock via the config.
 */
export type LLMCaller = (prompt: string) => Promise<string>;

export class ContextEngineer {
  private config: ContextEngineerConfig;
  private messages: Message[] = [];
  private precisionItems: PrecisionItem[] = [];
  private rollingContext = "";
  private lastRewriteAt = 0;
  private llmCaller: LLMCaller | null;

  constructor(config: Partial<ContextEngineerConfig> = {}, llmCaller?: LLMCaller) {
    this.config = { ...DEFAULT_CONTEXT_ENGINEER_CONFIG, ...config };
    this.llmCaller = llmCaller ?? null;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Process a message after every conversation turn.
   * Extracts precision items and triggers periodic context rewrites.
   */
  async processMessage(message: Message): Promise<void> {
    this.messages.push(message);

    // Extract precision items (unless message is too short/conversational)
    if (!shouldSkipForExtraction(message.content)) {
      const extracted = await this.extractPrecisionItems(message);
      for (const item of extracted) {
        this.addPrecisionItem(item);
      }
    }

    // Trigger rolling context rewrite at configured interval
    if (this.messages.length > this.config.rawWindowSize &&
        this.messages.length - this.lastRewriteAt >= this.config.rewriteInterval) {
      await this.rewriteRollingContext();
    }
  }

  /**
   * Returns the optimized context to inject into the next LLM call.
   */
  getOptimizedContext(): OptimizedContext {
    const precisionLog = this.getPrecisionLog();
    const rawStart = Math.max(0, this.messages.length - this.config.rawWindowSize);
    const rawMessages = this.messages.slice(rawStart);

    // Build rolling context from messages BEFORE the raw window
    let rollingContext = this.rollingContext;
    if (rollingContext.length === 0 && rawStart > 0) {
      // No rewrite yet — use a simple concatenation of older messages
      const olderMessages = this.messages.slice(0, rawStart);
      rollingContext = olderMessages
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");
    }

    // Truncate rolling context if needed
    const maxRollingChars = this.config.maxRollingContextTokens * 4;
    if (rollingContext.length > maxRollingChars) {
      rollingContext = rollingContext.slice(0, maxRollingChars) + "\n[...truncated]";
    }

    const rollingTokens = estimateTokens(rollingContext);
    const precisionTokens = estimateTokens(precisionLog);
    const rawTokens = rawMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

    return {
      rollingContext,
      precisionLog,
      rawMessages,
      tokenEstimate: rollingTokens + precisionTokens + rawTokens,
    };
  }

  /**
   * Get the precision log as formatted text, grouped by category.
   */
  getPrecisionLog(): string {
    const activeItems = this.precisionItems.filter(i => !i.superseded);

    if (activeItems.length === 0) return "";

    // Group by category
    const groups: Record<string, PrecisionItem[]> = {};
    for (const item of activeItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }

    const lines: string[] = [];
    for (const [category, items] of Object.entries(groups)) {
      // Format category as a header
      const header = category
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      lines.push(`## ${header}`);

      for (const item of items) {
        lines.push(item.value);
        if (item.context) {
          lines.push(`  (${item.context})`);
        }
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  /**
   * Manually pin a precision item — it will never be superseded.
   */
  pinItem(item: Omit<PrecisionItem, "id" | "sourceMessageIndex" | "superseded" | "pinned" | "timestamp">): void {
    const fullItem: PrecisionItem = {
      ...item,
      id: randomUUID(),
      sourceMessageIndex: -1,
      superseded: false,
      pinned: true,
      timestamp: new Date().toISOString(),
    };
    this.precisionItems.push(fullItem);
  }

  /**
   * Get stats for dashboard/debugging.
   */
  getStats(): ContextEngineerStats {
    const rawStart = Math.max(0, this.messages.length - this.config.rawWindowSize);
    const activeItems = this.precisionItems.filter(i => !i.superseded);
    const supersededCount = this.precisionItems.filter(i => i.superseded).length;

    const originalTokens = this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const ctx = this.getOptimizedContext();

    return {
      totalMessages: this.messages.length,
      rawWindowMessages: this.messages.length - rawStart,
      precisionItems: activeItems.length,
      supersededItems: supersededCount,
      rollingContextTokens: estimateTokens(ctx.rollingContext),
      precisionLogTokens: estimateTokens(ctx.precisionLog),
      compressionRatio: originalTokens > 0 ? ctx.tokenEstimate / originalTokens : 1,
      lastRewriteAt: this.lastRewriteAt,
    };
  }

  /**
   * Get all precision items (for handoff/persistence).
   */
  getPrecisionItems(): PrecisionItem[] {
    return [...this.precisionItems];
  }

  /**
   * Inject precision items (from handoff/persistence).
   */
  injectPrecisionItems(items: PrecisionItem[]): void {
    this.precisionItems.push(...items);
  }

  /**
   * Get the raw messages buffer (for handoff/persistence).
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Inject messages (from handoff/persistence).
   */
  injectMessages(messages: Message[]): void {
    this.messages = [...messages];
  }

  /**
   * Set the LLM caller (for testing or runtime injection).
   */
  setLLMCaller(caller: LLMCaller): void {
    this.llmCaller = caller;
  }

  /**
   * Get config (read-only).
   */
  getConfig(): ContextEngineerConfig {
    return { ...this.config };
  }

  // ── Private ────────────────────────────────────────────────────────

  /**
   * Extract precision items from a single message using LLM.
   */
  private async extractPrecisionItems(message: Message): Promise<PrecisionItem[]> {
    if (!this.llmCaller) {
      // No LLM available — use heuristic extraction
      return this.heuristicExtraction(message);
    }

    try {
      const prompt = `Extract any precise technical values from this message. Include: numbers with units, file paths, variable/function names, specific settings, decisions made, requirements stated, corrections to previous values. For corrections, mark the old value as superseded. Return JSON array: [{ category, value, context, supersedes? }]. If nothing precise, return empty array.

Message (${message.role}): ${message.content}`;

      const response = await this.llmCaller(prompt);
      const parsed = this.parseExtractionResponse(response);
      return parsed.map(item => ({
        ...item,
        id: randomUUID(),
        sourceMessageIndex: message.messageIndex,
        superseded: false,
        pinned: false,
        timestamp: new Date().toISOString(),
      }));
    } catch {
      // LLM call failed — fall back to heuristic
      return this.heuristicExtraction(message);
    }
  }

  /**
   * Heuristic-based precision extraction (fallback when LLM unavailable).
   */
  private heuristicExtraction(message: Message): PrecisionItem[] {
    const items: PrecisionItem[] = [];
    const content = message.content;

    // Detect file paths
    const pathRegex = /(?:^|[\s(])([\w/.-]+\.(?:ts|js|py|rs|go|c|cpp|h|json|yaml|yml|toml|md|sql|sh|tsx|jsx))(?:\s|$|[),:;])/gm;
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
      items.push({
        id: randomUUID(),
        category: "file-paths",
        value: match[1],
        context: `Found in ${message.role} message`,
        sourceMessageIndex: message.messageIndex,
        superseded: false,
        pinned: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Detect numbers with units
    const numUnitRegex = /(-?\d+\.?\d*)\s*(dB|ms|px|MB|KB|GB|TB|%|seconds?|minutes?|hours?|days?|times|iterations?|tokens?|chars?)/gi;
    while ((match = numUnitRegex.exec(content)) !== null) {
      items.push({
        id: randomUUID(),
        category: "measurements",
        value: match[0],
        context: `Found in ${message.role} message`,
        sourceMessageIndex: message.messageIndex,
        superseded: false,
        pinned: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Detect decisions
    const decisionPhrases = ["decided to", "let's use", "we'll use", "i'll use", "going with", "chose to", "settled on"];
    const lower = content.toLowerCase();
    for (const phrase of decisionPhrases) {
      if (lower.includes(phrase)) {
        const startIdx = lower.indexOf(phrase);
        const context = content.slice(Math.max(0, startIdx - 20), Math.min(content.length, startIdx + phrase.length + 80));
        items.push({
          id: randomUUID(),
          category: "decisions",
          value: context.trim(),
          context: `Decision in ${message.role} message`,
          sourceMessageIndex: message.messageIndex,
          superseded: false,
          pinned: false,
          timestamp: new Date().toISOString(),
        });
        break; // Only one decision per message
      }
    }

    return items;
  }

  /**
   * Parse LLM response for extracted items.
   */
  private parseExtractionResponse(response: string): Array<{ category: string; value: string; context: string; supersedes?: string }> {
    try {
      // Try to parse JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter(item =>
            item && typeof item.category === "string" &&
            typeof item.value === "string"
          ).map(item => ({
            category: item.category,
            value: item.value,
            context: item.context ?? "",
            supersedes: item.supersedes,
          }));
        }
      }
    } catch {
      // Not valid JSON
    }
    return [];
  }

  /**
   * Add a precision item, handling supersession logic.
   */
  private addPrecisionItem(item: PrecisionItem): void {
    // If this item supersedes another, mark the old one as superseded
    if (item.supersedes) {
      const target = this.precisionItems.find(i => i.id === item.supersedes);
      if (target && !target.pinned) {
        target.superseded = true;
      }
    }

    // Check category-based supersession: if new item has same category,
    // check if it semantically replaces an existing item
    // (Heuristic: if new value starts with "change" or "update" or "replace")
    const lowerValue = item.value.toLowerCase();
    if (lowerValue.startsWith("change ") || lowerValue.startsWith("update ") ||
        lowerValue.startsWith("replace ") || lowerValue.startsWith("now ")) {
      // Find items in same category that might be superseded
      const sameCategory = this.precisionItems.filter(
        i => i.category === item.category && !i.superseded && !i.pinned && i.id !== item.id
      );
      if (sameCategory.length > 0) {
        // Mark the most recent one as superseded
        const latest = sameCategory[sameCategory.length - 1];
        latest.superseded = true;
        item.supersedes = latest.id;
      }
    }

    // Truncate precision items if exceeding token budget
    const logTokens = estimateTokens(this.getPrecisionLog());
    if (logTokens > this.config.maxPrecisionLogTokens * 1.2) {
      // Remove oldest non-pinned items first
      const removable = this.precisionItems.filter(i => !i.pinned && !i.superseded);
      if (removable.length > 0) {
        removable[0].superseded = true;
      }
    }

    this.precisionItems.push(item);
  }

  /**
   * Rewrite the rolling context from scratch using LLM.
   */
  private async rewriteRollingContext(): Promise<void> {
    const rawStart = Math.max(0, this.messages.length - this.config.rawWindowSize);
    if (rawStart === 0 && this.rollingContext.length === 0) return; // Nothing to rewrite

    const olderMessages = this.messages.slice(0, rawStart);
    if (olderMessages.length === 0) return;

    if (!this.llmCaller) {
      // No LLM available — use simple concatenation
      this.rollingContext = olderMessages
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");
      this.lastRewriteAt = this.messages.length;
      return;
    }

    try {
      const conversationText = olderMessages
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");

      const precisionLog = this.getPrecisionLog();
      const precisionNote = precisionLog
        ? `\n\nNote: A separate precision log contains all exact values, numbers, and specifications. You don't need to repeat those here — focus on narrative flow, decisions, and current state.`
        : "";

      const prompt = `Rewrite this conversation history into a clean, precise document that a new reader could understand immediately. This is NOT a summary — preserve all technical details, decisions, requirements, and context. Remove: filler words, repeated explanations, tangents that were abandoned, back-and-forth that reached a conclusion (keep only the conclusion). Replace: 'we discussed X and decided Y' with just 'Decision: Y'.${precisionNote}

Write in clear prose paragraphs, not bullet points.

Conversation history:
${conversationText}`;

      const result = await this.llmCaller(prompt);
      this.rollingContext = result;
      this.lastRewriteAt = this.messages.length;
    } catch {
      // LLM call failed — keep existing rolling context or use simple concatenation
      if (this.rollingContext.length === 0) {
        this.rollingContext = olderMessages
          .map(m => `${m.role}: ${m.content}`)
          .join("\n");
      }
      this.lastRewriteAt = this.messages.length;
    }
  }
}
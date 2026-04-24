/**
 * ContextHygiene — Implements usage-limit-reducer principles.
 * Manages session compaction, history pruning, and context window efficiency.
 */
import type { AgentMessage } from "./evaluator.js";
import { estimateTokens } from "@tekton/core";

export interface HygieneConfig {
  maxTurnsBeforeRefresh: number;      // default 20
  compactThreshold: number;           // default 0.6 (60% of context window)
  pruneOlderThanTurns: number;        // default 10
  maxTokenPerExchangeWarning: number; // default 8000
}

export interface SessionState {
  messages: AgentMessage[];
  contextWindow: number;
  turnCount: number;
}

export interface HygieneRecommendation {
  action: "compact" | "refresh" | "prune" | "warn_token_spike";
  reason: string;
  urgency: "low" | "medium" | "high";
  estimatedSavings?: number;
}

const DEFAULT_CONFIG: HygieneConfig = {
  maxTurnsBeforeRefresh: 20,
  compactThreshold: 0.6,
  pruneOlderThanTurns: 10,
  maxTokenPerExchangeWarning: 8000,
};

export class ContextHygiene {
  private config: HygieneConfig;

  constructor(config?: Partial<HygieneConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Should we compact the session? */
  shouldCompact(session: { messages: AgentMessage[]; contextWindow: number }): boolean {
    const usage = this.getContextUsage(session.messages, session.contextWindow);
    return usage > this.config.compactThreshold;
  }

  /** Should we suggest a fresh session? */
  shouldRefresh(session: { turnCount: number }): boolean {
    return session.turnCount >= this.config.maxTurnsBeforeRefresh;
  }

  /** Prune old tool results from history, keeping 1-line summaries */
  pruneHistory(messages: AgentMessage[], maxTurns: number = this.config.pruneOlderThanTurns): AgentMessage[] {
    // Find tool result messages and replace old ones with summaries
    const userTurnCount = messages.filter(m => m.role === "user").length;
    const pruneBeforeTurn = userTurnCount - maxTurns;

    if (pruneBeforeTurn <= 0) return messages;

    let currentTurn = 0;
    const pruned: AgentMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "user") currentTurn++;

      if (currentTurn <= pruneBeforeTurn) {
        // Old messages: summarize tool results
        if (msg.role === "assistant" && msg.toolResults && msg.toolResults.length > 0) {
          const summary = msg.toolResults
            .map(r => `[${r.isError ? "ERROR" : "OK"}] ${r.content.slice(0, 80)}`)
            .join("; ");
          pruned.push({
            ...msg,
            content: `[Earlier tool results: ${summary}]`,
            toolResults: undefined,
            toolCalls: undefined,
          });
        } else if (msg.role === "tool") {
          // Already been summarized above
          if (msg.content.length > 100) {
            pruned.push({
              ...msg,
              content: `[Earlier result: ${msg.content.slice(0, 100)}]`,
            });
          } else {
            pruned.push(msg);
          }
        } else if (msg.role === "user" && msg.content.length > 200) {
          pruned.push({
            ...msg,
            content: `[Earlier: ${msg.content.slice(0, 150)}...]`,
          });
        } else {
          pruned.push(msg);
        }
      } else {
        // Recent messages: keep intact
        pruned.push(msg);
      }
    }

    return pruned;
  }

  /** Estimate current context usage as percentage (0-1) */
  getContextUsage(messages: AgentMessage[], contextWindow: number): number {
    const totalTokens = this.estimateTotalTokens(messages);
    return totalTokens / contextWindow;
  }

  /** Get hygiene recommendations for current session */
  getRecommendations(session: SessionState): HygieneRecommendation[] {
    const recommendations: HygieneRecommendation[] = [];

    // Check context usage
    const usage = this.getContextUsage(session.messages, session.contextWindow);
    if (usage > 0.8) {
      recommendations.push({
        action: "compact",
        reason: `Context usage at ${(usage * 100).toFixed(0)}% — compacting recommended`,
        urgency: "high",
        estimatedSavings: Math.floor((usage - 0.4) * session.contextWindow),
      });
    } else if (usage > this.config.compactThreshold) {
      recommendations.push({
        action: "compact",
        reason: `Context usage at ${(usage * 100).toFixed(0)}% — approaching limit`,
        urgency: "medium",
        estimatedSavings: Math.floor((usage - 0.4) * session.contextWindow),
      });
    }

    // Check turn count
    if (session.turnCount >= this.config.maxTurnsBeforeRefresh) {
      recommendations.push({
        action: "refresh",
        reason: `${session.turnCount} turns completed — suggest new session for best results`,
        urgency: session.turnCount >= this.config.maxTurnsBeforeRefresh + 5 ? "high" : "medium",
      });
    } else if (session.turnCount >= this.config.maxTurnsBeforeRefresh - 3) {
      recommendations.push({
        action: "refresh",
        reason: `Approaching ${this.config.maxTurnsBeforeRefresh} turns — new session soon recommended`,
        urgency: "low",
      });
    }

    // Check for old tool results that could be pruned
    const oldToolResults = this.countOldToolResults(session.messages, this.config.pruneOlderThanTurns);
    if (oldToolResults > 0) {
      recommendations.push({
        action: "prune",
        reason: `${oldToolResults} old tool results can be summarized`,
        urgency: usage > 0.5 ? "medium" : "low",
        estimatedSavings: oldToolResults * 200,
      });
    }

    // Check for token-per-exchange spikes
    const avgTokensPerExchange = this.getAvgTokensPerExchange(session.messages);
    if (avgTokensPerExchange > this.config.maxTokenPerExchangeWarning) {
      recommendations.push({
        action: "warn_token_spike",
        reason: `Average ${avgTokensPerExchange.toFixed(0)} tokens per exchange — consider batching`,
        urgency: "low",
      });
    }

    return recommendations;
  }

  // --- Private ---

  private estimateTotalTokens(messages: AgentMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      total += estimateTokens(msg.content);
      if (msg.toolCalls) {
        total += estimateTokens(JSON.stringify(msg.toolCalls));
      }
      if (msg.toolResults) {
        for (const r of msg.toolResults) {
          total += estimateTokens(r.content);
        }
      }
    }
    // Add ~4 tokens per message for role overhead
    total += messages.length * 4;
    return total;
  }

  private countOldToolResults(messages: AgentMessage[], recentTurns: number): number {
    const userTurnCount = messages.filter(m => m.role === "user").length;
    const cutoffTurn = userTurnCount - recentTurns;
    if (cutoffTurn <= 0) return 0;

    let count = 0;
    let currentTurn = 0;
    for (const msg of messages) {
      if (msg.role === "user") currentTurn++;
      if (currentTurn < cutoffTurn && msg.role === "assistant" && msg.toolResults) {
        count += msg.toolResults.length;
      }
    }
    return count;
  }

  private getAvgTokensPerExchange(messages: AgentMessage[]): number {
    // An exchange is: user message + assistant response + any tool calls/results
    let exchangeCount = 0;
    let tokenCount = 0;

    for (const msg of messages) {
      if (msg.role === "user") exchangeCount++;
      tokenCount += estimateTokens(msg.content);
    }

    return exchangeCount > 0 ? tokenCount / exchangeCount : 0;
  }
}
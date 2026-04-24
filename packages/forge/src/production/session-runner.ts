/**
 * Session Runner — Executes agent sessions with budget tracking and wrap-up warnings.
 */
import type { AgentTuple, TaskCard, RoleDefinition, SessionRecord, HandoffPackage, FileChange } from "../types.js";
import { createBudget, increment, remaining, isWarningZone, isExhausted, getLimit, type SessionBudget } from "../session-budget.js";

export interface SessionResult {
  sessionRecord: SessionRecord;
  completed: boolean;
  result: string;
}

export interface SessionRunnerConfig {
  agentPool: any; // Will be typed properly when integrated
  maxConcurrency?: number;
}

/**
 * Session Runner — orchestrates agent execution within budget constraints.
 *
 * Manages message budgets, warning injection, and force-stops.
 */
export class SessionRunner {
  private agentPool: any;
  private config: SessionRunnerConfig;

  constructor(config: SessionRunnerConfig) {
    this.agentPool = config.agentPool;
    this.config = config;
  }

  /**
   * Run a session for a given agent tuple and task card.
   *
   * In production this calls agentPool to spawn and run agents.
   * For testing, it can be run with a simulated executor.
   */
  async runSession(
    tuple: AgentTuple,
    taskCard: TaskCard,
    role: RoleDefinition,
    executor?: (tuple: AgentTuple, budget: SessionBudget) => Promise<{ messages: number; result: string; completed: boolean }>,
  ): Promise<SessionResult> {
    const budget = createBudget(role.id);
    const limit = getLimit(role.id);

    const startTime = Date.now();
    let messageCount = 0;
    let result = "";
    let completed = false;
    let status: SessionRecord["status"] = "active";

    try {
      if (executor) {
        // Custom executor (for testing)
        const execResult = await executor(tuple, budget);
        messageCount = execResult.messages;
        result = execResult.result;
        completed = execResult.completed;
        status = completed ? "completed" : "limit-reached";
      } else {
        // Simulated execution
        const maxMessages = limit;
        const simulatedMessages = Math.min(20, maxMessages - 2);
        messageCount = simulatedMessages;
        result = `Completed task: ${taskCard.title}`;
        completed = simulatedMessages < maxMessages;
        status = completed ? "completed" : "limit-reached";
      }
    } catch (e) {
      status = "error";
      result = `Error: ${(e as Error).message}`;
    }

    const sessionRecord: SessionRecord = {
      id: `session-${taskCard.id}-${Date.now()}`,
      agentRole: role.id,
      taskCardId: taskCard.id,
      messageCount,
      maxMessages: limit,
      startedAt: startTime,
      endedAt: Date.now(),
      status,
      handoffPackage: undefined,
    };

    return {
      sessionRecord,
      completed,
      result,
    };
  }

  /**
   * Check if a warning should be injected.
   * Returns the warning message or null.
   */
  getWarningMessage(budget: SessionBudget): string | null {
    const rem = remaining(budget);
    if (rem <= budget.warnings.finalWarning) {
      return "FINAL WARNING: You have 1 message remaining. Wrap up immediately and save all files.";
    }
    if (rem <= budget.warnings.secondWarning) {
      return `WARNING: You have ${rem} messages remaining. Begin wrapping up your work and save files.`;
    }
    if (rem <= budget.warnings.firstWarning) {
      return `Note: You have ${rem} messages remaining. Continue working but be mindful of the limit.`;
    }
    return null;
  }
}
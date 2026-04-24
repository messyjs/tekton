/**
 * Production Manager — Orchestrates the full execution of a ProductionPlan.
 *
 * Copies project template, resolves dependencies, spawns agents,
 * runs sessions, handles retries, and tracks completion.
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProductionPlan, TaskCard, RoleDefinition, AgentTuple, SessionRecord } from "../types.js";
import { spawnProductionAgent } from "./agent-spawner.js";
import { SessionRunner, type SessionResult } from "./session-runner.js";
import { resolveOrder, getReady } from "./dependency-resolver.js";
import { ParallelExecutor } from "./parallel-executor.js";
import { getRoleDefinition } from "./roles/index.js";
import { updateStatus } from "../task-card.js";

const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "templates");

export interface ProductionManagerConfig {
  maxConcurrency: number;
  maxRetries: number;
  agentPool?: any;
}

const DEFAULT_CONFIG: ProductionManagerConfig = {
  maxConcurrency: 2,
  maxRetries: 3,
};

export interface ProductionResult {
  completed: TaskCard[];
  failed: TaskCard[];
  allComplete: boolean;
  sessionRecords: SessionRecord[];
}

/**
 * Production Manager — executes a production plan by spawning agents
 * and running sessions within budget constraints.
 */
export class ProductionManager {
  private config: ProductionManagerConfig;
  private sessionRunner: SessionRunner;
  private retryCounts: Map<string, number> = new Map();

  constructor(config?: Partial<ProductionManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionRunner = new SessionRunner({
      agentPool: this.config.agentPool,
      maxConcurrency: this.config.maxConcurrency,
    });
  }

  /**
   * Execute a production plan — the main loop.
   *
   * 1. Copy project template
   * 2. Resolve dependency order
   * 3. While uncompleted tasks exist:
   *    a. Get ready tasks
   *    b. Spawn agents and run sessions
   *    c. Handle completion, retries, failures
   * 4. Return results
   */
  async executePlan(
    plan: ProductionPlan,
    projectDir: string,
    executor?: (tuple: AgentTuple, budget: any) => Promise<{ messages: number; result: string; completed: boolean }>,
  ): Promise<ProductionResult> {
    // 1. Copy project template
    this.copyTemplate(plan.teamTemplate.projectTemplate, projectDir);

    // Initialize task cards with plan IDs
    const taskCards = [...plan.taskCards];
    const completed: TaskCard[] = [];
    const failed: TaskCard[] = [];
    const sessionRecords: SessionRecord[] = [];

    // 2. Execute tasks in dependency order
    let iteration = 0;
    const maxIterations = taskCards.length * 3; // Safety limit

    while (completed.length + failed.length < taskCards.length && iteration < maxIterations) {
      iteration++;

      // a. Get ready tasks (dependencies met)
      const ready = getReady(taskCards);
      if (ready.length === 0) {
        // Check if all remaining are blocked (cycle or stuck)
        const remaining = taskCards.filter(
          (c) => c.status !== "completed" && c.status !== "failed",
        );
        if (remaining.length > 0) {
          // Mark stuck tasks — transition via in-progress first
          for (const card of remaining) {
            if (card.status === "pending") {
              const inProgress = updateStatus({ ...card }, "in-progress");
              const updated = updateStatus(inProgress, "failed");
              failed.push(updated);
            } else {
              // Already in-progress, can transition directly to failed
              const updated = updateStatus({ ...card }, "failed");
              failed.push(updated);
            }
          }
          break;
        }
        break;
      }

      // b. Execute ready tasks (up to maxConcurrency)
      const executor_ = new ParallelExecutor(this.config.maxConcurrency);
      const tasks = ready.slice(0, this.config.maxConcurrency).map((card) => {
        return async () => {
          return this.executeTask(card, plan, executor);
        };
      });

      const results = await executor_.executeAll(tasks);

      // c. Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const card = ready[i];

        if (result instanceof Error) {
          // Task execution threw
          const retryCount = this.retryCounts.get(card.id) ?? 0;
          if (retryCount < this.config.maxRetries - 1) {
            this.retryCounts.set(card.id, retryCount + 1);
            // Reset: in-progress → failed → pending (via reset)
            const idx = taskCards.findIndex((c) => c.id === card.id);
            taskCards[idx] = { ...taskCards[idx], status: "pending" };
          } else {
            // Transition to failed
            const inProgress = updateStatus({ ...card }, "in-progress");
            const updated = updateStatus(inProgress, "failed");
            failed.push(updated);
            taskCards.find((c) => c.id === card.id)!.status = "failed";
          }
        } else {
          const sessionResult = result as SessionResult;
          sessionRecords.push(sessionResult.sessionRecord);

          if (sessionResult.completed) {
            // Transition: in-progress → completed
            const inProgress = updateStatus({ ...card }, "in-progress");
            const updated = updateStatus(inProgress, "completed");
            completed.push(updated);
            taskCards.find((c) => c.id === card.id)!.status = "completed";
          } else {
            // Session limit reached — leave as in-progress for next iteration
            taskCards.find((c) => c.id === card.id)!.status = "in-progress";
          }
        }
      }
    }

    return {
      completed,
      failed,
      allComplete: failed.length === 0 && completed.length === taskCards.length,
      sessionRecords,
    };
  }

  /**
   * Execute a single task card.
   */
  private async executeTask(
    card: TaskCard,
    plan: ProductionPlan,
    executor?: (tuple: AgentTuple, budget: any) => Promise<{ messages: number; result: string; completed: boolean }>,
  ): Promise<SessionResult> {
    const role = getRoleDefinition(card.role);
    if (!role) {
      // Use a default role
      const defaultRole: RoleDefinition = {
        id: card.role,
        name: card.role,
        systemPrompt: `You are a ${card.role}. Complete the assigned task. Save all source files with .beta suffix.`,
        tools: ["file", "terminal"],
        model: "deep",
        sessionLimit: 20,
      };

      const tuple = spawnProductionAgent(card, defaultRole);
      return this.sessionRunner.runSession(tuple, card, defaultRole, executor);
    }

    const tuple = spawnProductionAgent(card, role);
    return this.sessionRunner.runSession(tuple, card, role, executor);
  }

  /**
   * Copy project template to project directory.
   */
  private copyTemplate(templateName: string, projectDir: string): void {
    const templatePath = join(TEMPLATES_DIR, templateName);

    if (!existsSync(templatePath)) {
      // Create empty project directory if template doesn't exist
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, "README.md"), `# Project\n\nGenerated by Tekton Forge.\n`);
      return;
    }

    // Copy template to project directory
    if (existsSync(projectDir)) {
      // Merge into existing directory
      cpSync(templatePath, projectDir, { recursive: true });
    } else {
      mkdirSync(projectDir, { recursive: true });
      cpSync(templatePath, projectDir, { recursive: true });
    }
  }
}
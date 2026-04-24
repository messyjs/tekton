/**
 * Forge Runtime — Orchestrates the full Forge product pipeline.
 *
 * newProject():  ideation → director → preflight → production → QA → promotion
 * resumeProject(): loads state and continues from where it left off.
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

import type {
  ProductBrief,
  DirectorDecision,
  ProductionPlan,
  TaskCard,
  ForgeManifest,
  ForgePhase,
  HandoffPackage,
} from "./types.js";
import { loadManifest, saveManifest, addArtifact, addQASignoff } from "./manifest.js";
import { generateBrief } from "./ideation/brief-generator.js";
import { evaluate as approvalGate } from "./director/approval-gate.js";
import { classifyDomains } from "./director/domain-classifier.js";
import { generatePlan } from "./director/plan-generator.js";
import { ProductionManager, type ProductionManagerConfig } from "./production/production-manager.js";
import { QAManager, type QAManagerConfig } from "./qa/qa-manager.js";
import { aggregateResults, type QAResult } from "./qa/verdict.js";
import { createRetryCard } from "./qa/failure-router.js";
import { promoteAll } from "./qa/promotion.js";
import { finalSignoff } from "./director/final-signoff.js";
import { checkMultipleDomains } from "./preflight.js";
import { SessionManager } from "./continuity/session-manager.js";
import { ScribePool } from "./continuity/scribe-pool.js";
import { ForgeCavememBridge } from "./continuity/cavemem-bridge.js";

// ── Forge State ────────────────────────────────────────────────────────────

export interface ForgeState {
  projectId: string;
  currentPhase: ForgePhase;
  brief?: ProductBrief;
  directorDecision?: DirectorDecision;
  productionPlan?: ProductionPlan;
  taskCards: TaskCard[];
  qaResults?: QAResult[];
  qaVerdict?: "pass" | "conditional-pass" | "fail";
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// ── Forge Runtime Config ──────────────────────────────────────────────────

export interface ForgeRuntimeConfig {
  /** Whether Forge is enabled (must be true for any operations) */
  enabled: boolean;
  /** Directory for Forge projects */
  projectsDir?: string;
  /** Production manager config */
  production?: Partial<ProductionManagerConfig>;
  /** QA manager config */
  qa?: Partial<QAManagerConfig>;
  /** Max ideation revision loops */
  maxIdeationRevisions?: number;
  /** Max QA retry cycles */
  maxQACycles?: number;
  /** LLM call function */
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string>;
}

const DEFAULT_CONFIG: ForgeRuntimeConfig = {
  enabled: false,
  maxIdeationRevisions: 3,
  maxQACycles: 2,
};

// ── Forge Runtime ──────────────────────────────────────────────────────────

export class ForgeRuntime {
  private config: ForgeRuntimeConfig;
  private projectsDir: string;
  private cavemem: ForgeCavememBridge;
  private scribePool: ScribePool;
  private sessionManager: SessionManager;
  private productionManager: ProductionManager;

  constructor(config?: Partial<ForgeRuntimeConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectsDir = this.config.projectsDir ?? join(os.homedir(), ".tekton", "forge-projects");

    // Initialize subsystems
    this.cavemem = new ForgeCavememBridge();
    this.scribePool = new ScribePool(
      {
        scribes: [
          { id: "scribe-ideation", observes: ["ideation", "director"], model: "gemini-flash" },
          { id: "scribe-production", observes: ["production"], model: "gemini-flash" },
          { id: "scribe-qa", observes: ["qa"], model: "gemini-flash" },
        ],
      },
      this.cavemem,
    );
    this.sessionManager = new SessionManager(this.scribePool, {
      handoffDir: join(this.projectsDir, "handoffs"),
    });
    this.productionManager = new ProductionManager(this.config.production);
  }

  /**
   * Check if Forge is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Start a new project. Full pipeline:
   * ideation → director → preflight → production → QA → promotion
   */
  async newProject(userIdea?: string): Promise<string> {
    if (!this.config.enabled) {
      throw new Error("Forge is not enabled. Run /tekton:forge enable to activate.");
    }

    const projectId = `project-${randomUUID().slice(0, 8)}`;
    const projectDir = join(this.projectsDir, projectId);
    mkdirSync(projectDir, { recursive: true });

    const state: ForgeState = {
      projectId,
      currentPhase: "ideation",
      taskCards: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      // ── Phase 1: Ideation ─────────────────────────────────────────────
      this.saveState(projectDir, state);

      let brief: ProductBrief;
      if (userIdea) {
        brief = await generateBrief(userIdea, this.config.callLLM);
      } else {
        // Interactive mode — create a minimal brief
        brief = {
          id: `brief-${randomUUID().slice(0, 8)}`,
          title: "User Project",
          problemStatement: userIdea ?? "User-defined project",
          proposedSolution: "To be determined through ideation",
          technicalApproach: "To be determined",
          userStories: ["As a user, I want to use the product"],
          risks: ["Scope may need refinement"],
          estimatedComplexity: "medium",
          domains: ["web-app"],
          ideationTranscript: "",
          createdAt: Date.now(),
          revisionHistory: [],
        };
      }

      state.brief = brief;
      state.updatedAt = Date.now();
      this.saveState(projectDir, state);

      // ── Phase 2: Director evaluation ──────────────────────────────────
      state.currentPhase = "review";
      this.saveState(projectDir, state);

      let decision: DirectorDecision;
      let revisions = 0;
      const maxRevisions = this.config.maxIdeationRevisions ?? 3;

      do {
        decision = await approvalGate(brief, {
          callLLM: this.config.callLLM,
          maxRevisions,
        });

        if (decision.verdict === "revise") {
          revisions++;
          if (revisions >= maxRevisions) {
            // Max revisions reached — reject
            state.error = `Director rejected brief after ${maxRevisions} revision attempts: ${decision.reasoning}`;
            state.currentPhase = "review";
            this.saveState(projectDir, state);
            return projectId;
          }
          // Revise brief with director notes
          brief = {
            ...brief,
            revisionHistory: [
              ...brief.revisionHistory,
              {
                round: revisions,
                directorNotes: decision.revisionNotes ?? decision.reasoning,
                changesMade: "Revised based on director feedback",
                timestamp: Date.now(),
              },
            ],
          };
        }
      } while (decision.verdict === "revise");

      if (decision.verdict === "rejected") {
        state.error = `Director rejected brief: ${decision.reasoning}`;
        state.currentPhase = "review";
        state.directorDecision = decision;
        this.saveState(projectDir, state);
        return projectId;
      }

      state.directorDecision = decision;
      state.updatedAt = Date.now();
      this.saveState(projectDir, state);

      // ── Phase 3: Preflight Check ────────────────────────────────────
      const domains = await classifyDomains(brief, this.config.callLLM);
      const preflight = await checkMultipleDomains(domains);

      if (!preflight.ready) {
        state.error = `Missing required tools: ${preflight.missing.join(", ")}`;
        state.currentPhase = "review";
        this.saveState(projectDir, state);
        return projectId;
      }

      // ── Phase 4: Production Plan ──────────────────────────────────────
      const plan = await generatePlan(brief, domains, this.config.callLLM);
      state.productionPlan = plan;
      state.taskCards = plan.taskCards;
      state.currentPhase = "production";
      this.saveState(projectDir, state);

      // ── Phase 5: Production ──────────────────────────────────────────
      const productionDir = join(projectDir, "production");
      mkdirSync(productionDir, { recursive: true });

      const productionResult = await this.productionManager.executePlan(plan, productionDir);

      // Update task card statuses
      state.taskCards = state.taskCards.map(card => {
        const completed = productionResult.completed.find(c => c.id === card.id);
        if (completed) return { ...card, status: "completed" as const };
        const failed = productionResult.failed.find(c => c.id === card.id);
        if (failed) return { ...card, status: "failed" as const };
        return card;
      });

      // Update manifest with artifacts
      let manifest = loadManifest(projectDir, projectId);
      for (const card of productionResult.completed) {
        for (const file of card.outputFiles) {
          manifest = addArtifact(manifest, {
            path: file,
            status: "beta",
            producedBy: card.role,
            taskCardId: card.id,
            lastModified: Date.now(),
            testedBy: [],
            hash: "",
          });
        }
      }
      saveManifest(projectDir, manifest);

      state.updatedAt = Date.now();
      this.saveState(projectDir, state);

      // ── Phase 6: QA ──────────────────────────────────────────────────
      state.currentPhase = "qa";
      this.saveState(projectDir, state);

      const qaManager = new QAManager(this.config.qa);
      const qaResult = await qaManager.runQAPipeline(projectDir, manifest);

      state.qaResults = qaResult.results;
      state.qaVerdict = qaResult.verdict;

      // Handle QA failures — retry up to maxQACycles
      let qaCycle = 0;
      const maxCycles = this.config.maxQACycles ?? 2;

      while (qaResult.verdict === "fail" && qaCycle < maxCycles) {
        qaCycle++;

        // Create retry cards from failures
        for (const failure of qaResult.failedArtifacts) {
          const originalCard = state.taskCards.find(c => c.outputFiles.includes(failure));
          if (originalCard) {
            const failureResult = qaResult.results.find(r => r.artifact === failure && !r.passed);
            if (failureResult) {
              const retryCard = createRetryCard(originalCard, failureResult);
              state.taskCards.push(retryCard);
            }
          }
        }

        // Re-run production for retry cards
        const retryCards = state.taskCards.filter(c => c.id.startsWith("retry-"));
        if (retryCards.length > 0) {
          const retryPlan: ProductionPlan = { ...plan, taskCards: retryCards };
          await this.productionManager.executePlan(retryPlan, productionDir);
        }

        // Re-run QA
        manifest = loadManifest(projectDir, projectId);
        const retryQAResult = await qaManager.runQAPipeline(projectDir, manifest);

        state.qaResults = retryQAResult.results;
        state.qaVerdict = retryQAResult.verdict;

        if (retryQAResult.verdict !== "fail") break;
      }

      // Add QA signoffs to manifest
      for (const result of qaResult.results) {
        if (result.artifact && !result.skipped) {
          manifest = addQASignoff(manifest, {
            artifactPath: result.artifact,
            testerRole: result.tester,
            passed: result.passed,
            notes: result.details,
            timestamp: Date.now(),
          });
        }
      }
      saveManifest(projectDir, manifest);

      state.updatedAt = Date.now();
      this.saveState(projectDir, state);

      // ── Phase 7: Promotion ──────────────────────────────────────────
      if (state.qaVerdict === "pass" || state.qaVerdict === "conditional-pass") {
        const promotionResult = promoteAll(projectDir, manifest);
        manifest = promotionResult.updatedManifest;
        saveManifest(projectDir, manifest);

        // ── Phase 8: Final Signoff ─────────────────────────────────────
        const signoff = await finalSignoff(manifest, brief, this.config.callLLM);

        if (signoff.approved) {
          state.currentPhase = "release";
        } else {
          state.currentPhase = "qa";
          state.error = `Final signoff rejected: ${signoff.notes}`;
        }
      }

      state.updatedAt = Date.now();
      this.saveState(projectDir, state);

      return projectId;

    } catch (e) {
      state.error = `Pipeline error: ${(e as Error).message}`;
      state.updatedAt = Date.now();
      this.saveState(projectDir, state);
      return projectId;
    }
  }

  /**
   * Resume a project from saved state.
   */
  async resumeProject(projectId: string): Promise<ForgeState> {
    const projectDir = join(this.projectsDir, projectId);

    if (!existsSync(projectDir)) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const state = this.loadState(projectDir);
    if (!state) {
      throw new Error(`No state found for project: ${projectId}`);
    }

    // Resume from the current phase
    switch (state.currentPhase) {
      case "ideation":
        // Re-run from ideation
        return state;
      case "review":
        // Re-run director
        return state;
      case "production":
        // Continue production
        return state;
      case "qa":
        // Re-run QA
        return state;
      case "release":
        // Already complete
        return state;
      default:
        return state;
    }
  }

  /**
   * Get project status.
   */
  getProjectStatus(projectId: string): ForgeState | null {
    const projectDir = join(this.projectsDir, projectId);
    return this.loadState(projectDir);
  }

  /**
   * List all projects with statuses.
   */
  listProjects(): Array<{ id: string; phase: ForgePhase; title?: string; error?: string }> {
    if (!existsSync(this.projectsDir)) return [];

    const projects: Array<{ id: string; phase: ForgePhase; title?: string; error?: string }> = [];

    try {
      const entries = readdirSync(this.projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const state = this.loadState(join(this.projectsDir, entry.name));
          if (state) {
            projects.push({
              id: state.projectId,
              phase: state.currentPhase,
              title: state.brief?.title,
              error: state.error,
            });
          }
        }
      }
    } catch {
      // Projects directory doesn't exist yet
    }

    return projects;
  }

  // ── Private helpers ───────────────────────────────────────────────

  private saveState(projectDir: string, state: ForgeState): void {
    const statePath = join(projectDir, "forge-state.json");
    writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
  }

  private loadState(projectDir: string): ForgeState | null {
    const statePath = join(projectDir, "forge-state.json");
    if (!existsSync(statePath)) return null;

    try {
      const content = readFileSync(statePath, "utf-8");
      return JSON.parse(content) as ForgeState;
    } catch {
      return null;
    }
  }
}
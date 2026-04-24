/**
 * Learner — Skill extraction and refinement.
 * Analyzes conversations to identify reusable patterns and create/update skills.
 */
import type { Skill, SkillUpdate } from "./skill-format.js";
import type { SkillManager } from "./skill-manager.js";
import type { UserModelManager } from "./user-model.js";
import type { EvaluationResult, AgentMessage } from "./evaluator.js";
import { slugifySkillName } from "./skill-format.js";

interface ExtractionContext {
  messages: AgentMessage[];
  evaluation: EvaluationResult;
  taskDescription: string;
}

export class Learner {
  private skillManager: SkillManager;
  private userModel: UserModelManager;

  constructor(skillManager: SkillManager, userModel: UserModelManager) {
    this.skillManager = skillManager;
    this.userModel = userModel;
  }

  /**
   * Extract a skill from a successful task.
   * Returns null if the task is too simple or the skill already exists with high confidence.
   */
  extractSkill(context: ExtractionContext): Skill | null {
    const { messages, evaluation, taskDescription } = context;

    // Don't extract if quality is too low
    if (evaluation.quality === "failed") return null;

    // Extract the core procedure from the conversation
    const procedure = this.extractProcedure(messages);
    if (!procedure || procedure.steps.length < 2) return null;

    // Identify pitfalls from error recovery
    const pitfalls = this.extractPitfalls(messages);

    // Generate verification steps
    const verification = this.extractVerification(messages);

    // Generate skill name from task description
    const skillName = slugifySkillName(taskDescription);

    // Check if skill already exists
    const existing = this.skillManager.getSkill(skillName);
    if (existing && (existing.metadata?.tekton?.confidence ?? 0) >= 0.8) {
      // High-confidence skill exists — don't overwrite, but consider refinement
      return null;
    }

    // Build skill body
    const body = this.buildSkillBody({
      taskDescription,
      procedure,
      pitfalls,
      verification,
      evaluation,
    });

    // Determine tags
    const tags = this.extractTags(messages, taskDescription);

    // Determine required toolsets
    const requiresToolsets = this.extractRequiredToolsets(messages);

    // Create the skill
    const skill = this.skillManager.createSkill({
      name: skillName,
      description: taskDescription.slice(0, 200),
      body,
      metadata: {
        tekton: {
          confidence: 0.5,
          tags,
          category: this.inferCategory(taskDescription),
          requires_toolsets: requiresToolsets,
        },
      },
    });

    return skill;
  }

  /**
   * Refine an existing skill with a better approach.
   * Returns null if the new approach isn't better.
   */
  refineSkill(existing: Skill, newApproach: {
    messages: AgentMessage[];
    evaluation: EvaluationResult;
  }): SkillUpdate | null {
    if (!this.isBetterApproach(existing, newApproach.evaluation)) {
      return null;
    }

    const procedure = this.extractProcedure(newApproach.messages);
    const pitfalls = this.extractPitfalls(newApproach.messages);
    const verification = this.extractVerification(newApproach.messages);

    const body = this.buildSkillBody({
      taskDescription: existing.description,
      procedure,
      pitfalls,
      verification,
      evaluation: newApproach.evaluation,
    });

    // Increment version
    const currentVersion = existing.version ?? "0.1.0";
    const newVersion = incrementPatchVersion(currentVersion);

    // Increase confidence slightly
    const currentConfidence = existing.metadata?.tekton?.confidence ?? 0.5;
    const newConfidence = Math.min(1.0, currentConfidence + 0.1);

    return {
      body,
      version: newVersion,
      metadata: {
        ...existing.metadata,
        tekton: {
          ...existing.metadata?.tekton,
          confidence: newConfidence,
        },
      },
    };
  }

  /**
   * Determine if a new approach is better than the existing skill.
   */
  isBetterApproach(existing: Skill, newEval: EvaluationResult): boolean {
    const existingConfidence = existing.metadata?.tekton?.confidence ?? 0.5;

    // If new task was excellent and existing has low confidence
    if (newEval.quality === "excellent" && existingConfidence < 0.7) {
      return true;
    }

    // If we recovered from errors (learned something new)
    if (newEval.hadErrors && newEval.success && existingConfidence < 0.9) {
      return true;
    }

    // If user corrections indicate the existing approach needs updating
    if (newEval.hadUserCorrections) {
      return true;
    }

    return false;
  }

  /**
   * Force skill extraction from current session (for /tekton:learn force).
   */
  forceExtract(messages: AgentMessage[], description: string): Skill {
    const procedure = this.extractProcedure(messages);
    const pitfalls = this.extractPitfalls(messages);
    const verification = this.extractVerification(messages);

    const body = this.buildSkillBody({
      taskDescription: description,
      procedure,
      pitfalls,
      verification,
      evaluation: {
        success: true,
        quality: "good",
        toolCallCount: 0,
        hadErrors: false,
        hadUserCorrections: false,
        routingCorrect: true,
        compressionLossless: true,
        tokensUsed: 0,
        skillsUsed: [],
        shouldExtractSkill: true,
        durationMs: 0,
      },
    });

    const skillName = slugifySkillName(description);

    // Check if already exists and delete if so
    const existing = this.skillManager.getSkill(skillName);
    if (existing) {
      this.skillManager.deleteSkill(skillName);
    }

    return this.skillManager.createSkill({
      name: skillName,
      description: description.slice(0, 200),
      body,
      metadata: {
        tekton: {
          confidence: 0.6,
          tags: this.extractTags(messages, description),
          category: this.inferCategory(description),
          requires_toolsets: this.extractRequiredToolsets(messages),
        },
      },
    });
  }

  // --- Private extraction methods ---

  private extractProcedure(messages: AgentMessage[]): { steps: string[] } | null {
    const steps: string[] = [];
    const toolCalls: Array<{ name: string; params: Record<string, unknown> }> = [];

    // Extract tool call sequence
    for (const msg of messages) {
      if (msg.role === "assistant" && msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          toolCalls.push(tc);
        }
      }
    }

    if (toolCalls.length === 0) return null;

    // Convert tool calls to procedural steps
    for (const tc of toolCalls) {
      const paramSummary = summarizeParams(tc.params);
      steps.push(`Use \`${tc.name}\`${paramSummary ? ` with ${paramSummary}` : ""}`);
    }

    // Deduplicate similar consecutive steps
    const deduplicated: string[] = [];
    for (const step of steps) {
      if (deduplicated.length === 0 || deduplicated[deduplicated.length - 1] !== step) {
        deduplicated.push(step);
      }
    }

    return { steps: deduplicated };
  }

  private extractPitfalls(messages: AgentMessage[]): string[] {
    const pitfalls: string[] = [];

    // Look for error patterns
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "tool" || (msg.role === "assistant" && msg.toolResults)) {
        const results = msg.toolResults ?? [];
        for (const r of results) {
          if (r.isError) {
            // Find the tool call that caused the error
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const toolName = prevMsg?.toolCalls?.[0]?.name ?? "unknown";
            pitfalls.push(`Avoid error from \`${toolName}\`: ${r.content.slice(0, 100)}`);
          }
        }
      }
    }

    // Look for user corrections
    for (const msg of messages) {
      if (msg.role === "user") {
        const lower = msg.content.toLowerCase();
        if (lower.includes("no, ") || lower.includes("instead, ") || lower.includes("not like that")) {
          pitfalls.push(`User corrected: ${msg.content.slice(0, 100)}`);
        }
      }
    }

    return pitfalls.slice(0, 5); // Keep top 5
  }

  private extractVerification(messages: AgentMessage[]): string[] {
    const steps: string[] = [];

    // Look for verification patterns in the conversation
    const verificationPatterns = [
      /verify\b/i,
      /check\b/i,
      /confirm\b/i,
      /test\b/i,
      /validate\b/i,
      /ensure\b/i,
    ];

    for (const msg of messages) {
      if (msg.role === "assistant") {
        for (const pattern of verificationPatterns) {
          if (pattern.test(msg.content)) {
            const sentence = msg.content.split(/[.!]\s/).find(s => pattern.test(s));
            if (sentence) {
              steps.push(sentence.trim());
            }
          }
        }
      }
    }

    return steps.slice(0, 3);
  }

  private extractTags(messages: AgentMessage[], taskDescription: string): string[] {
    const tags = new Set<string>();

    // Tech tags from task description
    const techKeywords: Record<string, string[]> = {
      "typescript": ["typescript", "ts", ".ts"],
      "javascript": ["javascript", "js", ".js"],
      "python": ["python", ".py"],
      "react": ["react", "component", "jsx"],
      "database": ["sql", "database", "db", "migration"],
      "api": ["api", "endpoint", "rest", "graphql"],
      "testing": ["test", "spec", "vitest", "jest"],
      "infrastructure": ["deploy", "infra", "docker", "kubernetes"],
    };

    const allText = taskDescription.toLowerCase() + " " + messages.map(m => m.content.toLowerCase()).join(" ");

    for (const [tag, keywords] of Object.entries(techKeywords)) {
      if (keywords.some(kw => allText.includes(kw))) {
        tags.add(tag);
      }
    }

    return [...tags];
  }

  private extractRequiredToolsets(messages: AgentMessage[]): string[] {
    const toolsets = new Set<string>();

    for (const msg of messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          const toolset = this.inferToolset(tc.name);
          if (toolset) toolsets.add(toolset);
        }
      }
    }

    return [...toolsets];
  }

  private inferToolset(toolName: string): string | null {
    const mapping: Record<string, string> = {
      "terminal": "terminal", "process": "terminal",
      "read_file": "file", "write_file": "file", "patch": "file", "search_files": "file", "list_dir": "file",
      "web_search": "web", "web_extract": "web",
      "browser_navigate": "browser",
      "vision_analyze": "vision",
      "memory": "memory", "session_search": "memory",
    };
    return mapping[toolName] ?? null;
  }

  private inferCategory(description: string): string {
    const lower = description.toLowerCase();

    if (lower.includes("debug") || lower.includes("fix") || lower.includes("error")) return "debugging";
    if (lower.includes("refactor") || lower.includes("clean") || lower.includes("improve")) return "refactoring";
    if (lower.includes("test") || lower.includes("spec")) return "testing";
    if (lower.includes("deploy") || lower.includes("infra") || lower.includes("config")) return "infrastructure";
    if (lower.includes("api") || lower.includes("endpoint") || lower.includes("server")) return "api";
    if (lower.includes("ui") || lower.includes("component") || lower.includes("page")) return "frontend";
    if (lower.includes("data") || lower.includes("database") || lower.includes("model")) return "data";
    if (lower.includes("write") || lower.includes("create") || lower.includes("add")) return "creation";

    return "general";
  }

  private buildSkillBody(params: {
    taskDescription: string;
    procedure: { steps: string[] } | null;
    pitfalls: string[];
    verification: string[];
    evaluation: EvaluationResult;
  }): string {
    const lines: string[] = [];

    lines.push(`# ${capitalize(params.taskDescription.slice(0, 60))}`);
    lines.push("");

    // When to Use
    lines.push("## When to Use");
    lines.push(`- ${params.taskDescription}`);
    lines.push(`- Quality: ${params.evaluation.quality}`);
    lines.push("");

    // Procedure
    if (params.procedure && params.procedure.steps.length > 0) {
      lines.push("## Procedure");
      for (let i = 0; i < params.procedure.steps.length; i++) {
        lines.push(`${i + 1}. ${params.procedure.steps[i]}`);
      }
      lines.push("");
    }

    // Pitfalls
    if (params.pitfalls.length > 0) {
      lines.push("## Pitfalls");
      for (const pitfall of params.pitfalls) {
        lines.push(`- ${pitfall}`);
      }
      lines.push("");
    }

    // Verification
    if (params.verification.length > 0) {
      lines.push("## Verification");
      for (const v of params.verification) {
        lines.push(`- ${v}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}

function summarizeParams(params: Record<string, unknown>): string {
  const keys = Object.keys(params).slice(0, 3);
  if (keys.length === 0) return "";
  return keys.map(k => `${k}=${truncate(String(params[k]), 30)}`).join(", ");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function incrementPatchVersion(version: string): string {
  const parts = version.split(".");
  if (parts.length !== 3) return version;
  const patch = parseInt(parts[2], 10) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}
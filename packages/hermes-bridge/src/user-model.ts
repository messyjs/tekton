/**
 * UserModelManager — Persistent user model that improves over time.
 * Tracks preferences, corrections, task patterns, tech stack, and feedback.
 */
import fs from "node:fs";
import path from "node:path";

export interface TaskSummary {
  description: string;
  timestamp: string;
  success: boolean;
  toolCallCount: number;
  hadErrors: boolean;
  skillsUsed: string[];
}

export interface TaskPattern {
  pattern: string;
  frequency: number;
  lastSeen: string;
}

export interface Correction {
  original: string;
  corrected: string;
  timestamp: string;
  context?: string;
}

export interface FeedbackEntry {
  type: "positive" | "negative";
  context: string;
  timestamp: string;
}

export interface UserModel {
  preferences: Record<string, string>;
  corrections: Correction[];
  commonPatterns: TaskPattern[];
  techStack: string[];
  workingHours: string;
  preferredTools: string[];
  avoidedApproaches: string[];
  recentTaskSummary: string;
}

export class UserModelManager {
  private path: string;
  private cache: UserModel | null = null;
  private dirty: boolean = false;

  constructor(filePath: string) {
    this.path = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  getModel(): UserModel {
    if (this.cache) return this.cache;

    if (fs.existsSync(this.path)) {
      try {
        const content = fs.readFileSync(this.path, "utf-8");
        this.cache = this.parseUserModel(content);
      } catch {
        this.cache = this.defaultModel();
      }
    } else {
      this.cache = this.defaultModel();
    }
    return this.cache;
  }

  // --- Recorders ---

  recordTaskCompletion(task: TaskSummary): void {
    const model = this.getModel();

    // Update common patterns
    const patternKey = extractPattern(task.description);
    const existing = model.commonPatterns.find(p => p.pattern === patternKey);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = task.timestamp;
    } else {
      model.commonPatterns.push({
        pattern: patternKey,
        frequency: 1,
        lastSeen: task.timestamp,
      });
    }

    // Update tech stack from skills used
    for (const skill of task.skillsUsed) {
      if (!model.techStack.includes(skill)) {
        model.techStack.push(skill);
      }
    }

    // Track preferred tools on success
    if (task.success) {
      model.recentTaskSummary = task.description.slice(0, 200);
    }

    // Track avoided approaches on failure
    if (!task.success && task.hadErrors) {
      const approach = task.description.slice(0, 100);
      if (!model.avoidedApproaches.includes(approach)) {
        model.avoidedApproaches.push(approach);
        // Keep only last 20 avoided approaches
        if (model.avoidedApproaches.length > 20) {
          model.avoidedApproaches.shift();
        }
      }
    }

    // Prune patterns (keep top 50)
    model.commonPatterns.sort((a, b) => b.frequency - a.frequency);
    if (model.commonPatterns.length > 50) {
      model.commonPatterns = model.commonPatterns.slice(0, 50);
    }

    this.dirty = true;
  }

  recordCorrection(original: string, corrected: string, context?: string): void {
    const model = this.getModel();
    model.corrections.push({
      original,
      corrected,
      timestamp: new Date().toISOString(),
      context,
    });

    // Keep only last 100 corrections
    if (model.corrections.length > 100) {
      model.corrections = model.corrections.slice(-100);
    }

    this.dirty = true;
  }

  recordPreference(key: string, value: string): void {
    const model = this.getModel();
    model.preferences[key] = value;
    this.dirty = true;
  }

  recordFeedback(type: "positive" | "negative", context: string): void {
    // Feedback influences confidence but we track it in patterns
    const model = this.getModel();
    if (type === "negative") {
      model.avoidedApproaches.push(context.slice(0, 100));
      if (model.avoidedApproaches.length > 20) {
        model.avoidedApproaches.shift();
      }
    }
    this.dirty = true;
  }

  // --- Query ---

  getPreferences(): Record<string, string> {
    return this.getModel().preferences;
  }

  getCommonPatterns(limit?: number): TaskPattern[] {
    const patterns = [...this.getModel().commonPatterns];
    patterns.sort((a, b) => b.frequency - a.frequency);
    return limit ? patterns.slice(0, limit) : patterns;
  }

  getTechStack(): string[] {
    return this.getModel().techStack;
  }

  getRecentCorrections(limit: number = 10): Correction[] {
    return this.getModel().corrections.slice(-limit);
  }

  // --- Prompt Context ---

  toPromptContext(): string {
    const model = this.getModel();
    const lines: string[] = [];

    // Preferences (~100 tokens)
    if (Object.keys(model.preferences).length > 0) {
      lines.push("## User Preferences");
      for (const [key, value] of Object.entries(model.preferences)) {
        lines.push(`- ${key}: ${value}`);
      }
      lines.push("");
    }

    // Tech stack (~50 tokens)
    if (model.techStack.length > 0) {
      lines.push("## Tech Stack");
      lines.push(model.techStack.map(t => `- ${t}`).join("\n"));
      lines.push("");
    }

    // Recent corrections (~100 tokens)
    const recentCorrections = model.corrections.slice(-5);
    if (recentCorrections.length > 0) {
      lines.push("## Recent Corrections");
      for (const c of recentCorrections) {
        lines.push(`- Instead of "${c.original}", use "${c.corrected}"`);
      }
      lines.push("");
    }

    // Common patterns (~100 tokens)
    const topPatterns = model.commonPatterns.slice(0, 5);
    if (topPatterns.length > 0) {
      lines.push("## Common Task Patterns");
      for (const p of topPatterns) {
        lines.push(`- ${p.pattern} (x${p.frequency})`);
      }
      lines.push("");
    }

    // Avoided approaches (~50 tokens)
    if (model.avoidedApproaches.length > 0) {
      lines.push("## Avoid");
      lines.push(model.avoidedApproaches.slice(-3).map(a => `- ${a}`).join("\n"));
    }

    return lines.join("\n");
  }

  flush(): void {
    if (!this.dirty || !this.cache) return;

    const content = this.serializeModel(this.cache);
    // Enforce 4000 char limit
    const trimmed = content.length > 4000 ? content.slice(0, 4000) : content;
    fs.writeFileSync(this.path, trimmed, "utf-8");
    this.dirty = false;
  }

  // --- Private ---

  private defaultModel(): UserModel {
    return {
      preferences: {},
      corrections: [],
      commonPatterns: [],
      techStack: [],
      workingHours: "",
      preferredTools: [],
      avoidedApproaches: [],
      recentTaskSummary: "",
    };
  }

  private parseUserModel(content: string): UserModel {
    const model = this.defaultModel();

    // Parse our custom markdown-ish format
    const prefMatch = content.match(/## Preferences\n([\s\S]*?)(?=\n## |\n*$)/);
    if (prefMatch) {
      for (const line of prefMatch[1].split("\n")) {
        const m = line.match(/^- (.+?): (.+)$/);
        if (m) model.preferences[m[1]] = m[2];
      }
    }

    const correctionsMatch = content.match(/## Corrections\n([\s\S]*?)(?=\n## |\n*$)/);
    if (correctionsMatch) {
      for (const line of correctionsMatch[1].split("\n")) {
        const m = line.match(/^- "([^"]+)" → "([^"]+)"(?: \(([^)]+)\))?$/);
        if (m) {
          model.corrections.push({
            original: m[1],
            corrected: m[2],
            timestamp: m[3] ?? new Date().toISOString(),
          });
        }
      }
    }

    const stackMatch = content.match(/## Tech Stack\n([\s\S]*?)(?=\n## |\n*$)/);
    if (stackMatch) {
      model.techStack = stackMatch[1]
        .split("\n")
        .filter(l => l.startsWith("- "))
        .map(l => l.replace(/^- /, "").trim());
    }

    const patternsMatch = content.match(/## Common Patterns\n([\s\S]*?)(?=\n## |\n*$)/);
    if (patternsMatch) {
      for (const line of patternsMatch[1].split("\n")) {
        const m = line.match(/^- (.+?)(?:\s+x(\d+))?\s*(?:\(last: ([^)]+)\))?$/);
        if (m) {
          model.commonPatterns.push({
            pattern: m[1],
            frequency: parseInt(m[2] ?? "1", 10),
            lastSeen: m[3] ?? new Date().toISOString(),
          });
        }
      }
    }

    const avoidMatch = content.match(/## Avoid\n([\s\S]*?)(?=\n## |\n*$)/);
    if (avoidMatch) {
      model.avoidedApproaches = avoidMatch[1]
        .split("\n")
        .filter(l => l.startsWith("- "))
        .map(l => l.replace(/^- /, "").trim());
    }

    const hoursMatch = content.match(/## Working Hours\n(.+)$/m);
    if (hoursMatch) {
      model.workingHours = hoursMatch[1].trim();
    }

    return model;
  }

  private serializeModel(model: UserModel): string {
    const lines: string[] = ["# User Model\n"];

    if (Object.keys(model.preferences).length > 0) {
      lines.push("## Preferences");
      for (const [key, value] of Object.entries(model.preferences)) {
        lines.push(`- ${key}: ${value}`);
      }
      lines.push("");
    }

    if (model.corrections.length > 0) {
      lines.push("## Corrections");
      for (const c of model.corrections) {
        lines.push(`- "${c.original}" → "${c.corrected}" (${c.timestamp})`);
      }
      lines.push("");
    }

    if (model.techStack.length > 0) {
      lines.push("## Tech Stack");
      for (const s of model.techStack) {
        lines.push(`- ${s}`);
      }
      lines.push("");
    }

    if (model.commonPatterns.length > 0) {
      lines.push("## Common Patterns");
      for (const p of model.commonPatterns) {
        lines.push(`- ${p.pattern} x${p.frequency} (last: ${p.lastSeen})`);
      }
      lines.push("");
    }

    if (model.avoidedApproaches.length > 0) {
      lines.push("## Avoid");
      for (const a of model.avoidedApproaches) {
        lines.push(`- ${a}`);
      }
      lines.push("");
    }

    if (model.workingHours) {
      lines.push("## Working Hours");
      lines.push(model.workingHours);
    }

    return lines.join("\n");
  }
}

/** Extract a generalized pattern from a task description */
function extractPattern(description: string): string {
  // Simplify: lowercase, remove specific names/paths, extract action pattern
  let pattern = description.toLowerCase().trim();

  // Replace specific paths
  pattern = pattern.replace(/\/[^\s]+/g, "<path>");
  // Replace specific file names
  pattern = pattern.replace(/\b\w+\.\w{2,4}\b/g, "<file>");
  // Replace numbers
  pattern = pattern.replace(/\b\d+\b/g, "<n>");
  // Replace quoted strings
  pattern = pattern.replace(/"[^"]*"/g, "<str>");
  pattern = pattern.replace(/'[^']*'/g, "<str>");

  // Truncate
  if (pattern.length > 80) {
    pattern = pattern.slice(0, 80);
  }

  return pattern;
}
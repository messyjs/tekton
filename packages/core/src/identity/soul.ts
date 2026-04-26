import fs from "node:fs";
import path from "node:path";
import { estimateTokens } from "../compression/caveman.js";

const DEFAULT_SOUL = `# Identity
You are Tekton Agent, a self-improving coding agent that learns from every session.
You combine deep reasoning with practical efficiency.

# Style
- Be direct and technically precise
- Prefer working code over theoretical discussion
- Show your reasoning when the problem is complex
- Be concise unless depth helps
- Push back clearly when an approach is wrong

# Avoid
- Sycophancy and filler language
- Over-explaining obvious things
- Hype language
- Generating code without understanding the requirement

# Defaults
- When uncertain, ask one clear question rather than guessing
- When a task is complex, decompose it before starting
- When you learn something new, consider saving it as a skill
- When token budget is tight, compress internal communications
`;

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(([\w\s]+)\s+)?(previous|all|above|prior)\s+(instructions?|prompts?|directions?)/gi,
  /\bforget\s+(everything|all|prior|previous|above)/gi,
  /\byou\s+are\s+now\s+/gi,
  /\b(new|different)\s+(persona|identity|character|role)\s*:/gi,
  /\bsystem\s*:\s*/gi,
  /\bassistant\s*:\s*/gi,
  /\bhuman\s*:\s*/gi,
  /\bpretend\s+you\s+(are|can)/gi,
  /\bact\s+as\s+if\s+you\s+(are|were|can)/gi,
  /\boverride\s+(safety|security|ethical|moral)/gi,
  /\bDAN\s+mode/gi,
  /\bjailbreak/gi,
  /\bbypass\s+(filter|restriction|limit|guard)/gi,
  /\bsimulate\s+(being|having)\s+/gi,
];

const DEFAULT_MAX_TOKENS = 500;

export class SoulManager {
  private soulPath: string;
  private cache: string | null = null;

  constructor(tektonHome: string) {
    this.soulPath = path.join(tektonHome, "SOUL.md");
  }

  getSoul(): string {
    if (this.cache !== null) return this.cache;
    if (fs.existsSync(this.soulPath)) {
      const content = fs.readFileSync(this.soulPath, "utf-8").trim();
      if (content.length > 0) {
        this.cache = content;
        return content;
      }
    }
    this.cache = DEFAULT_SOUL;
    return DEFAULT_SOUL;
  }

  setSoul(content: string): void {
    const sanitized = this.sanitize(content);
    const dir = path.dirname(this.soulPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.soulPath, sanitized, "utf-8");
    this.cache = sanitized;
  }

  exists(): boolean {
    return fs.existsSync(this.soulPath) && fs.readFileSync(this.soulPath, "utf-8").trim().length > 0;
  }

  seedDefault(): void {
    if (!this.exists()) {
      this.setSoul(DEFAULT_SOUL);
    }
  }

  sanitize(content: string): string {
    let sanitized = content;
    for (const pattern of INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[filtered]");
    }
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, "");
    // Collapse excessive whitespace
    sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n");
    return sanitized.trim();
  }

  truncate(content: string, maxTokens: number = DEFAULT_MAX_TOKENS): string {
    const tokens = estimateTokens(content);
    if (tokens <= maxTokens) return content;

    // Truncate by lines, keeping headers
    const lines = content.split("\n");
    const headerLines: string[] = [];
    const bodyLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("#") && bodyLines.length === 0) {
        headerLines.push(line);
      } else {
        bodyLines.push(line);
      }
    }

    // Keep headers + as many body lines as fit
    let result = headerLines.join("\n");
    for (const line of bodyLines) {
      const candidate = result + "\n" + line;
      if (estimateTokens(candidate) > maxTokens) break;
      result = candidate;
    }

    return result.trim();
  }
}

export { DEFAULT_SOUL };
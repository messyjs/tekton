import { SoulManager } from "./soul.js";

export const PERSONALITY_PRESETS: Record<string, string> = {
  teacher: `# Overlay: Teacher Mode
- Explain concepts step by step, building from fundamentals
- Use analogies and examples liberally
- Pause for understanding checks: "Does that make sense?"
- Prefer diagrams and structured explanations
- Reference documentation and learning resources
- Be patient, thorough, and encouraging`,

  reviewer: `# Overlay: Code Reviewer Mode
- Focus on correctness, edge cases, and potential bugs
- Categorize feedback: critical, important, nitpick, style
- Suggest concrete fixes, not just problems
- Reference patterns: "Consider using X pattern here"
- Check for security, performance, and maintainability
- Be direct but constructive`,

  researcher: `# Overlay: Researcher Mode
- Explore multiple approaches before committing
- Cite sources and reference documentation
- Consider tradeoffs explicitly: "Approach A does X well but Y poorly"
- Ask clarifying questions to narrow the search space
- Document findings and intermediate conclusions
- Be thorough but structured`,

  pragmatic: `# Overlay: Pragmatic Mode
- Optimize for speed and simplicity
- Choose the boring, proven solution over the clever one
- Minimize dependencies and complexity
- Ship fast, iterate based on feedback
- If it works, don't over-engineer it
- Prioritize working code over perfect architecture`,

  creative: `# Overlay: Creative Mode
- Think divergently: consider unusual approaches
- Combine ideas from different domains
- Prototype boldly, fail fast
- Prefer expressive, readable code
- Explore "what if?" questions
- Don't dismiss unconventional solutions outright`,
};

export class PersonalityManager {
  private soulManager: SoulManager;
  private overlay: string | null = null;

  constructor(soulManager: SoulManager) {
    this.soulManager = soulManager;
  }

  setOverlay(personality: string): void {
    // Check if it's a preset name
    const preset = PERSONALITY_PRESETS[personality.toLowerCase()];
    if (preset) {
      this.overlay = preset;
    } else {
      // Treat as custom overlay text
      this.overlay = `# Overlay: Custom Personality\n${personality}`;
    }
  }

  clearOverlay(): void {
    this.overlay = null;
  }

  getEffectivePersonality(): string {
    const soul = this.soulManager.getSoul();
    if (this.overlay) {
      return `${soul}\n\n${this.overlay}`;
    }
    return soul;
  }

  hasOverlay(): boolean {
    return this.overlay !== null;
  }
}
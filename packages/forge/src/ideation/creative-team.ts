/**
 * Creative Team — Orchestrates multiple personas responding to user input.
 *
 * Selects which persona responds based on conversation state and content,
 * delegates to LLM via the session system, and tracks rotations.
 */
import { ChatRoom, type ChatRoomConfig } from "./chat-room.js";
import type { Persona } from "./personas/strategist.js";
import { strategist } from "./personas/strategist.js";
import { architect } from "./personas/architect.js";
import { uxThinker } from "./personas/ux-thinker.js";
import { type ProductBrief } from "../types.js";
import { generateBrief } from "./brief-generator.js";

export interface CreativeTeamConfig {
  minExchanges: number;
  /** Optional custom personas, defaults to [strategist, architect, uxThinker] */
  personas?: Persona[];
}

export interface CreativeTeamResponse {
  persona: string;
  response: string;
  suggestWrapUp: boolean;
}

const DEFAULT_PERSONAS: Persona[] = [strategist, architect, uxThinker];

/**
 * Keyword signals that route to specific personas.
 */
const PERSONA_KEYWORDS: Record<string, string[]> = {
  [architect.name]: [
    "performance", "scalab", "architecture", "technical", "database", "infrastructure",
    "latency", "throughput", "dependency", "backend", "server", "api", "stack",
    "deploy", "hosting", "framework", "library", "protocol",
  ],
  [uxThinker.name]: [
    "ux", "user experience", "interface", "usability", "accessible", "a11y",
    "design", "mobile", "responsive", "friction", "flow", "onboard", "click",
    "navigate", "button", "layout", "screen", "feel", "intuitive",
  ],
};

export class CreativeTeam {
  private chatRoom: ChatRoom;
  private personas: Persona[];
  private rotationIndex = 0;

  constructor(config: CreativeTeamConfig & { minExchanges: number }) {
    this.personas = config.personas ?? DEFAULT_PERSONAS;
    const chatConfig: ChatRoomConfig = {
      minExchanges: config.minExchanges,
      personas: this.personas,
    };
    this.chatRoom = new ChatRoom(chatConfig);
  }

  /** Get the next persona to respond, using content-based routing or round-robin. */
  private selectPersona(userMessage: string, phase: string): Persona {
    const msgLower = userMessage.toLowerCase();

    // Phase 1: Content-based routing
    for (const persona of this.personas) {
      const keywords = PERSONA_KEYWORDS[persona.name];
      if (keywords) {
        for (const keyword of keywords) {
          if (msgLower.includes(keyword)) {
            return persona;
          }
        }
      }
    }

    // Phase 2: Round-robin fallback
    const persona = this.personas[this.rotationIndex % this.personas.length];
    this.rotationIndex++;
    return persona;
  }

  /**
   * Process a user message and generate a persona response.
   *
   * In production, this calls the LLM via delegate_task. For testing,
   * a responseGenerator can be injected.
   */
  async getNextResponse(
    userMessage: string,
    responseGenerator?: (systemPrompt: string, userMessage: string) => Promise<string>,
  ): Promise<CreativeTeamResponse> {
    this.chatRoom.addUserMessage(userMessage);

    const phase = this.chatRoom.getPhase();
    const persona = this.selectPersona(userMessage, phase);

    // Build system prompt combining persona + conversation context
    const phaseGuidance = phase === "exploring"
      ? "We're still exploring this idea broadly. Ask probing questions."
      : phase === "converging"
        ? "We're starting to converge. Begin synthesizing what you've heard."
        : "We should wrap up soon. Focus on final synthesis and clarity.";

    const systemPrompt = [
      persona.systemPromptSegment,
      "",
      `## Conversation Phase: ${phase}`,
      phaseGuidance,
      "",
      "## Conversation so far:",
      this.chatRoom.getTranscript(),
    ].join("\n");

    let response: string;
    if (responseGenerator) {
      response = await responseGenerator(systemPrompt, userMessage);
    } else {
      // Default: simple template response for testing without LLM
      response = `[${persona.name}] I'll think about "${userMessage.slice(0, 60)}..." from my perspective as ${persona.role}.`;
    }

    this.chatRoom.addPersonaMessage(persona.name, response);

    return {
      persona: persona.name,
      response,
      suggestWrapUp: this.chatRoom.canWrapUp(),
    };
  }

  /** Generate a ProductBrief from the full conversation transcript. */
  async generateBrief(responseGenerator?: (transcript: string) => Promise<ProductBrief>): Promise<ProductBrief> {
    const transcript = this.chatRoom.getTranscript();
    if (responseGenerator) {
      return responseGenerator(transcript);
    }
    return generateBrief(transcript);
  }

  /** Get the underlying ChatRoom. */
  getChatRoom(): ChatRoom {
    return this.chatRoom;
  }

  /** Reset state for a new conversation. */
  reset(): void {
    this.chatRoom.reset();
    this.rotationIndex = 0;
  }
}
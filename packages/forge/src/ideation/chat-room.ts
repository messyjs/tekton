/**
 * Chat Room — Manages multi-persona ideation conversation state.
 */
import type { Persona } from "./personas/strategist.js";

export interface ChatMessage {
  role: "user" | "persona";
  personaName?: string;
  text: string;
  timestamp: number;
}

export type ConversationPhase = "exploring" | "converging" | "ready-to-wrap";

export interface ChatRoomConfig {
  minExchanges: number;
  personas: Persona[];
}

export class ChatRoom {
  private messages: ChatMessage[] = [];
  private config: ChatRoomConfig;
  private exchangeCount = 0;

  constructor(config: ChatRoomConfig) {
    this.config = config;
  }

  /** Add a user message and increment exchange counter. */
  addUserMessage(text: string): void {
    this.messages.push({
      role: "user",
      text,
      timestamp: Date.now(),
    });
    this.exchangeCount++;
  }

  /** Add a persona response message. */
  addPersonaMessage(personaName: string, text: string): void {
    this.messages.push({
      role: "persona",
      personaName,
      text,
      timestamp: Date.now(),
    });
  }

  /** Get the full conversation as formatted text. */
  getTranscript(): string {
    return this.messages
      .map((m) => {
        if (m.role === "user") {
          return `User: ${m.text}`;
        }
        return `${m.personaName}: ${m.text}`;
      })
      .join("\n\n");
  }

  /** Count of user messages (exchanges). */
  getExchangeCount(): number {
    return this.exchangeCount;
  }

  /** Can the conversation wrap up? */
  canWrapUp(): boolean {
    return this.exchangeCount >= this.config.minExchanges;
  }

  /** Get the current conversation phase. */
  getPhase(): ConversationPhase {
    const half = Math.ceil(this.config.minExchanges / 2);
    if (this.exchangeCount >= this.config.minExchanges) return "ready-to-wrap";
    if (this.exchangeCount >= half) return "converging";
    return "exploring";
  }

  /** Get all messages. */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /** Reset the chat room. */
  reset(): void {
    this.messages = [];
    this.exchangeCount = 0;
  }
}
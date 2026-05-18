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
export declare class ChatRoom {
    private messages;
    private config;
    private exchangeCount;
    constructor(config: ChatRoomConfig);
    /** Add a user message and increment exchange counter. */
    addUserMessage(text: string): void;
    /** Add a persona response message. */
    addPersonaMessage(personaName: string, text: string): void;
    /** Get the full conversation as formatted text. */
    getTranscript(): string;
    /** Count of user messages (exchanges). */
    getExchangeCount(): number;
    /** Can the conversation wrap up? */
    canWrapUp(): boolean;
    /** Get the current conversation phase. */
    getPhase(): ConversationPhase;
    /** Get all messages. */
    getMessages(): ChatMessage[];
    /** Reset the chat room. */
    reset(): void;
}
//# sourceMappingURL=chat-room.d.ts.map
/**
 * Creative Team — Orchestrates multiple personas responding to user input.
 *
 * Selects which persona responds based on conversation state and content,
 * delegates to LLM via the session system, and tracks rotations.
 */
import { ChatRoom } from "./chat-room.js";
import type { Persona } from "./personas/strategist.js";
import { type ProductBrief } from "../types.js";
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
export declare class CreativeTeam {
    private chatRoom;
    private personas;
    private rotationIndex;
    constructor(config: CreativeTeamConfig & {
        minExchanges: number;
    });
    /** Get the next persona to respond, using content-based routing or round-robin. */
    private selectPersona;
    /**
     * Process a user message and generate a persona response.
     *
     * In production, this calls the LLM via delegate_task. For testing,
     * a responseGenerator can be injected.
     */
    getNextResponse(userMessage: string, responseGenerator?: (systemPrompt: string, userMessage: string) => Promise<string>): Promise<CreativeTeamResponse>;
    /** Generate a ProductBrief from the full conversation transcript. */
    generateBrief(responseGenerator?: (transcript: string) => Promise<ProductBrief>): Promise<ProductBrief>;
    /** Get the underlying ChatRoom. */
    getChatRoom(): ChatRoom;
    /** Reset state for a new conversation. */
    reset(): void;
}
//# sourceMappingURL=creative-team.d.ts.map
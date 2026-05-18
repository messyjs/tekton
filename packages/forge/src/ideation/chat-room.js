export class ChatRoom {
    messages = [];
    config;
    exchangeCount = 0;
    constructor(config) {
        this.config = config;
    }
    /** Add a user message and increment exchange counter. */
    addUserMessage(text) {
        this.messages.push({
            role: "user",
            text,
            timestamp: Date.now(),
        });
        this.exchangeCount++;
    }
    /** Add a persona response message. */
    addPersonaMessage(personaName, text) {
        this.messages.push({
            role: "persona",
            personaName,
            text,
            timestamp: Date.now(),
        });
    }
    /** Get the full conversation as formatted text. */
    getTranscript() {
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
    getExchangeCount() {
        return this.exchangeCount;
    }
    /** Can the conversation wrap up? */
    canWrapUp() {
        return this.exchangeCount >= this.config.minExchanges;
    }
    /** Get the current conversation phase. */
    getPhase() {
        const half = Math.ceil(this.config.minExchanges / 2);
        if (this.exchangeCount >= this.config.minExchanges)
            return "ready-to-wrap";
        if (this.exchangeCount >= half)
            return "converging";
        return "exploring";
    }
    /** Get all messages. */
    getMessages() {
        return [...this.messages];
    }
    /** Reset the chat room. */
    reset() {
        this.messages = [];
        this.exchangeCount = 0;
    }
}
//# sourceMappingURL=chat-room.js.map
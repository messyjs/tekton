import { describe, it, expect } from "vitest";
import { ChatRoom } from "../../src/ideation/chat-room.js";
import { strategist, architect, uxThinker } from "../../src/ideation/index.js";

describe("Chat Room", () => {
  const config = { minExchanges: 4, personas: [strategist, architect, uxThinker] };

  it("starts in exploring phase", () => {
    const room = new ChatRoom(config);
    expect(room.getPhase()).toBe("exploring");
    expect(room.getExchangeCount()).toBe(0);
  });

  it("transitions to converging at half minExchanges", () => {
    const room = new ChatRoom(config);
    room.addUserMessage("Hello");
    room.addUserMessage("I want to build something");
    // minExchanges=4, half=2 → converging
    expect(room.getPhase()).toBe("converging");
    expect(room.getExchangeCount()).toBe(2);
  });

  it("transitions to ready-to-wrap at minExchanges", () => {
    const room = new ChatRoom(config);
    room.addUserMessage("msg1");
    room.addUserMessage("msg2");
    room.addUserMessage("msg3");
    room.addUserMessage("msg4");
    expect(room.getPhase()).toBe("ready-to-wrap");
  });

  it("cannot wrap up before minimum exchanges", () => {
    const room = new ChatRoom(config);
    expect(room.canWrapUp()).toBe(false);
    room.addUserMessage("msg1");
    room.addUserMessage("msg2");
    room.addUserMessage("msg3");
    expect(room.canWrapUp()).toBe(false);
  });

  it("can wrap up at minimum exchanges", () => {
    const room = new ChatRoom(config);
    room.addUserMessage("1");
    room.addUserMessage("2");
    room.addUserMessage("3");
    room.addUserMessage("4");
    expect(room.canWrapUp()).toBe(true);
  });

  it("transcript includes all messages", () => {
    const room = new ChatRoom(config);
    room.addUserMessage("I need a VST plugin");
    room.addPersonaMessage("Nova", "Who is this plugin for?");
    const transcript = room.getTranscript();
    expect(transcript).toContain("User: I need a VST plugin");
    expect(transcript).toContain("Nova: Who is this plugin for?");
  });

  it("reset clears all state", () => {
    const room = new ChatRoom(config);
    room.addUserMessage("hello");
    room.addPersonaMessage("Nova", "hi");
    room.reset();
    expect(room.getExchangeCount()).toBe(0);
    expect(room.getPhase()).toBe("exploring");
    expect(room.getTranscript()).toBe("");
  });

  it("getMessages returns all messages", () => {
    const room = new ChatRoom(config);
    room.addUserMessage("msg1");
    room.addPersonaMessage("Nova", "resp1");
    const msgs = room.getMessages();
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("user");
    expect(msgs[1].role).toBe("persona");
  });
});
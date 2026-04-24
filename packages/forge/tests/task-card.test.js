import { describe, it, expect } from "vitest";
import { createTaskCard, updateStatus, getNextReady, getDependencyOrder } from "@tekton/forge";
describe("Task Card", () => {
    it("creates a task card with UUID", () => {
        const card = createTaskCard("plan-1", "dsp-engineer", "Implement Oscillator", "Create sine/saw/square oscillators");
        expect(card.id).toMatch(/^tc-/);
        expect(card.planId).toBe("plan-1");
        expect(card.role).toBe("dsp-engineer");
        expect(card.title).toBe("Implement Oscillator");
        expect(card.status).toBe("pending");
        expect(card.dependencies).toEqual([]);
    });
    it("creates with dependencies", () => {
        const card = createTaskCard("plan-1", "dev", "Task", "Desc", ["tc-abc", "tc-def"]);
        expect(card.dependencies).toEqual(["tc-abc", "tc-def"]);
    });
    it("valid status transition: pending → in-progress", () => {
        const card = createTaskCard("plan-1", "dev", "Task", "Desc");
        const updated = updateStatus(card, "in-progress");
        expect(updated.status).toBe("in-progress");
    });
    it("valid status transition: in-progress → completed", () => {
        const card = { ...createTaskCard("plan-1", "dev", "Task", "Desc"), status: "in-progress" };
        const updated = updateStatus(card, "completed");
        expect(updated.status).toBe("completed");
    });
    it("valid status transition: in-progress → failed", () => {
        const card = { ...createTaskCard("plan-1", "dev", "Task", "Desc"), status: "in-progress" };
        const updated = updateStatus(card, "failed");
        expect(updated.status).toBe("failed");
    });
    it("valid status transition: failed → in-progress (retry)", () => {
        const card = { ...createTaskCard("plan-1", "dev", "Task", "Desc"), status: "failed" };
        const updated = updateStatus(card, "in-progress");
        expect(updated.status).toBe("in-progress");
    });
    it("valid status transition: blocked → pending (unblocked)", () => {
        const card = { ...createTaskCard("plan-1", "dev", "Task", "Desc"), status: "blocked" };
        const updated = updateStatus(card, "pending");
        expect(updated.status).toBe("pending");
    });
    it("invalid transition throws: pending → completed", () => {
        const card = createTaskCard("plan-1", "dev", "Task", "Desc");
        expect(() => updateStatus(card, "completed")).toThrow("Invalid status transition");
    });
    it("invalid transition throws: completed → in-progress", () => {
        const card = { ...createTaskCard("plan-1", "dev", "Task", "Desc"), status: "completed" };
        expect(() => updateStatus(card, "in-progress")).toThrow("Invalid status transition");
    });
    it("getNextReady returns tasks with met dependencies", () => {
        const cardA = createTaskCard("plan-1", "dev", "A", "Desc A");
        const cardB = { ...createTaskCard("plan-1", "dev", "B", "Desc B", [cardA.id]), status: "pending" };
        const cardC = createTaskCard("plan-1", "dev", "C", "No deps");
        // Before A completes, B is not ready
        let ready = getNextReady([cardA, cardB, cardC]);
        expect(ready.map(c => c.title)).toContain("A");
        expect(ready.map(c => c.title)).toContain("C");
        expect(ready.map(c => c.title)).not.toContain("B");
        // After A completes, B is ready
        const completedA = { ...cardA, status: "completed" };
        ready = getNextReady([completedA, cardB, cardC]);
        expect(ready.map(c => c.title)).toContain("B");
    });
    it("getDependencyOrder produces valid topological sort", () => {
        const cardA = createTaskCard("plan-1", "dev", "A", "No deps");
        const cardB = { ...createTaskCard("plan-1", "dev", "B", "After A", [cardA.id]), status: "pending" };
        const cardC = { ...createTaskCard("plan-1", "dev", "C", "After A", [cardA.id]), status: "pending" };
        const cardD = { ...createTaskCard("plan-1", "dev", "D", "After B and C", [cardB.id, cardC.id]), status: "pending" };
        const order = getDependencyOrder([cardD, cardB, cardC, cardA]);
        const orderIds = order.map(c => c.id);
        // A must come before B and C
        expect(orderIds.indexOf(cardA.id)).toBeLessThan(orderIds.indexOf(cardB.id));
        expect(orderIds.indexOf(cardA.id)).toBeLessThan(orderIds.indexOf(cardC.id));
        // B and C must come before D
        expect(orderIds.indexOf(cardB.id)).toBeLessThan(orderIds.indexOf(cardD.id));
        expect(orderIds.indexOf(cardC.id)).toBeLessThan(orderIds.indexOf(cardD.id));
    });
    it("getDependencyOrder detects cycles and throws", () => {
        const cardA = { ...createTaskCard("plan-1", "dev", "A", "After B", ["tc-b"]), status: "pending" };
        cardA.id = "tc-a";
        const cardB = { ...createTaskCard("plan-1", "dev", "B", "After A", ["tc-a"]), status: "pending" };
        cardB.id = "tc-b";
        expect(() => getDependencyOrder([cardA, cardB])).toThrow("Circular dependency");
    });
});
//# sourceMappingURL=task-card.test.js.map
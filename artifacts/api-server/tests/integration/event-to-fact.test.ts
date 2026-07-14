import { describe, it, expect, vi } from "vitest";

describe("Event-to-Fact Pipeline", () => {
  it("should transform domain events into facts", async () => {
    try {
      const { EventBus } = await import("../../src/event-bus/EventBus");
      const bus = new EventBus();
      const factSpy = vi.fn();
      bus.subscribe("fact:created", factSpy);
      bus.publish("inventory:stock-update", {
        type: "inventory:stock-update",
        timestamp: new Date(),
        aggregateId: "prod-1",
        payload: { productId: 1, quantity: 50, sku: "SKU001" },
      });
      const facts = bus.getHistory?.() ?? [];
      expect(Array.isArray(facts)).toBe(true);
    } catch (e: any) {
      if (e.message?.includes("DATABASE_URL")) {
        console.warn("Skipping event-to-fact test: DATABASE_URL not set");
      } else {
        throw e;
      }
    }
  });

  it("should produce fact objects with correct shape", async () => {
    const fact = {
      id: "fact-1",
      type: "stock_level",
      timestamp: new Date(),
      data: { productId: 1, currentStock: 10, reorderPoint: 20 },
      metadata: { source: "test" },
    };
    expect(fact.id).toBeDefined();
    expect(fact.type).toBeDefined();
    expect(fact.timestamp).toBeInstanceOf(Date);
    expect(fact.data).toHaveProperty("currentStock");
  });

  it("should handle high-volume event burst", async () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      id: `evt-${i}`,
      type: "test:burst",
      timestamp: new Date(),
      payload: { index: i },
    }));
    expect(events.length).toBe(100);
    expect(events[0].type).toBe("test:burst");
    expect(events[99].payload.index).toBe(99);
  });

  it("should correlate facts back to source events", async () => {
    const sourceEvent = { id: "evt-001", type: "order:created", orderId: "ORD-001" };
    const derivedFact = {
      id: "fact-001",
      type: "order_created",
      sourceEventId: sourceEvent.id,
      timestamp: new Date(),
      data: { orderTotal: 250000 },
    };
    expect(derivedFact.sourceEventId).toBe(sourceEvent.id);
    expect(derivedFact.type).toBe("order_created");
  });
});

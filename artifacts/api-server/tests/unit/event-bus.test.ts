import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/event-bus/EventStore", () => ({
  EventStore: class {
    async append() { return 42; }
    async replay() { return []; }
  },
}));

describe("EventBus", () => {
  it("should publish event to subscribers", async () => {
    const { EventBus } = await import("../../src/event-bus/EventBus");
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe("test_event", handler);
    await bus.publish({ type: "test_event", aggregateId: "test", timestamp: new Date() } as any);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: "test_event" }));
  });

  it("should handle multiple subscribers", async () => {
    const { EventBus } = await import("../../src/event-bus/EventBus");
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.subscribe("test_event", h1);
    bus.subscribe("test_event", h2);
    await bus.publish({ type: "test_event", aggregateId: "test", timestamp: new Date() } as any);
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });
});

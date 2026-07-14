import { describe, it, expect } from "vitest";

describe("MetricStore", () => {
  it("should record and retrieve metrics", async () => {
    const { MetricStore } = await import("../../src/business-intelligence/core/MetricStore");
    const store = new MetricStore(60000);
    store.set({ id: "m1", name: "inventory.stock", value: { qty: 50 }, domain: "inventory", timestamp: new Date() });
    const metrics = store.getByDomain("inventory");
    expect(metrics.length).toBeGreaterThan(0);
  });

  it("should filter by domain", async () => {
    const { MetricStore } = await import("../../src/business-intelligence/core/MetricStore");
    const store = new MetricStore(60000);
    store.set({ id: "m2", name: "sales.revenue", value: { amount: 1000 }, domain: "sales", timestamp: new Date() });
    store.set({ id: "m3", name: "inventory.stock", value: { qty: 50 }, domain: "inventory", timestamp: new Date() });
    const sales = store.getByDomain("sales");
    expect(sales.length).toBe(1);
    expect(sales[0].name).toBe("sales.revenue");
  });

  it("should clear all metrics", async () => {
    const { MetricStore } = await import("../../src/business-intelligence/core/MetricStore");
    const store = new MetricStore(60000);
    store.set({ id: "m4", name: "test.metric", value: 1, domain: "test", timestamp: new Date() });
    expect(store.size()).toBe(1);
    store.clear();
    expect(store.size()).toBe(0);
  });

  it("should get metric by name", async () => {
    const { MetricStore } = await import("../../src/business-intelligence/core/MetricStore");
    const store = new MetricStore(60000);
    store.set({ id: "m5", name: "test.specific", value: 42, domain: "test", timestamp: new Date() });
    const found = store.getByName("test.specific");
    expect(found.length).toBe(1);
  });

  it("should handle TTL expiry via clear", async () => {
    const { MetricStore } = await import("../../src/business-intelligence/core/MetricStore");
    const store = new MetricStore(1);
    store.set({ id: "m6", name: "test.ttl", value: 1, domain: "test", timestamp: new Date() });
    expect(store.size()).toBe(1);
    await new Promise(r => setTimeout(r, 10));
    expect(store.size()).toBe(0);
  });
});

describe("InsightEngine", () => {
  it("should run generators and return insights", async () => {
    const { InsightEngine } = await import("../../src/business-intelligence/core/InsightEngine");
    const engine = new InsightEngine();
    const insights = engine.run();
    expect(Array.isArray(insights)).toBe(true);
  });
});

describe("FactEngine", () => {
  it("should run generators from insights", async () => {
    const { FactEngine } = await import("../../src/business-intelligence/core/FactEngine");
    const engine = new FactEngine();
    const facts = engine.run([]);
    expect(Array.isArray(facts)).toBe(true);
  });
});

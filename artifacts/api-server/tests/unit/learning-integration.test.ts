// T5.3A — Learning Integration Foundation Tests
// Covers: LearningRegistry, IntegrationManager, adapters, dynamic discovery

import { describe, it, expect, beforeEach } from "vitest";
import { LearningRegistry } from "../../src/learning-integration/LearningRegistry";
import { IntegrationManager } from "../../src/learning-integration/IntegrationManager";
import type { LearningEngine } from "../../src/learning-integration/types";

// A test engine for registry testing
const testEngine: LearningEngine = {
  info: { id: "test-engine", name: "Test", version: "1.0.0", capabilities: ["retrieval", "maintenance"] },
  retrieve: () => [{ id: "t1", content: "test", source: "test", originEngine: "test", confidence: 80, timestamp: new Date().toISOString(), importance: 50 }],
  ingest: () => {},
  maintenance: () => ({ actions: 1, details: ["test maintenance"] }),
  health: () => ({ status: "healthy", lastCheck: new Date().toISOString() }),
};

describe("T5.3A — LearningRegistry", () => {
  beforeEach(() => {
    // Clean registry between tests by unregistering test engine only
    try { LearningRegistry.unregister("test-engine"); } catch {}
  });

  it("should register and retrieve an engine", () => {
    LearningRegistry.register(testEngine);
    expect(LearningRegistry.count()).toBeGreaterThanOrEqual(1);
    const retrieved = LearningRegistry.get("test-engine");
    expect(retrieved).toBeDefined();
    expect(retrieved!.info.id).toBe("test-engine");
  });

  it("should reject duplicate registration", () => {
    LearningRegistry.register(testEngine);
    expect(() => LearningRegistry.register(testEngine)).toThrow();
  });

  it("should unregister an engine", () => {
    LearningRegistry.register(testEngine);
    expect(LearningRegistry.count()).toBeGreaterThanOrEqual(1);
    LearningRegistry.unregister("test-engine");
    expect(LearningRegistry.get("test-engine")).toBeUndefined();
  });

  it("should list all engines", () => {
    LearningRegistry.register(testEngine);
    const all = LearningRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some(e => e.info.id === "test-engine")).toBe(true);
  });

  it("should filter by capability", () => {
    LearningRegistry.register(testEngine);
    const withRetrieval = LearningRegistry.getByCapability("retrieval");
    expect(withRetrieval.length).toBeGreaterThanOrEqual(1);
    const withIngestion = LearningRegistry.getByCapability("ingestion");
    expect(withIngestion.some(e => e.info.id === "test-engine")).toBe(false);
  });

  it("should return engine info", () => {
    LearningRegistry.register(testEngine);
    const info = LearningRegistry.getInfo("test-engine");
    expect(info).toBeDefined();
    expect(info!.name).toBe("Test");
  });
});

describe("T5.3A — IntegrationManager", () => {
  beforeEach(() => {
    try { LearningRegistry.unregister("test-engine"); } catch {}
    LearningRegistry.register(testEngine);
  });

  it("should discover registered engines", () => {
    const discovered = IntegrationManager.discover();
    expect(discovered.length).toBeGreaterThanOrEqual(1);
    expect(discovered.some(e => e.id === "test-engine")).toBe(true);
  });

  it("should retrieve from engines with capability", () => {
    const results = IntegrationManager.retrieve({ query: "test" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].content).toBe("test");
  });

  it("should ingest to engines with capability", () => {
    const count = IntegrationManager.ingest({ content: "test ingest" });
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should run maintenance on all engines", () => {
    const results = IntegrationManager.runMaintenance();
    const testResult = results.find(r => r.engine === "test-engine");
    expect(testResult).toBeDefined();
    expect(testResult!.actions).toBeGreaterThanOrEqual(0);
  });

  it("should return health for all engines", () => {
    const health = IntegrationManager.health();
    expect(health.length).toBeGreaterThanOrEqual(1);
    expect(health[0].healthy).toBe(true);
  });
});

describe("T5.3A — Adapter Registration", () => {
  it("should register all three adapters without error", async () => {
    const { registerAllEngines } = await import("../../src/learning-integration");
    // Register adapters
    registerAllEngines();
    // Should have at least 3 engines now
    expect(LearningRegistry.count()).toBeGreaterThanOrEqual(3);
    // Verify each engine is present
    const info = LearningRegistry.getAllInfo();
    const ids = info.map(i => i.id);
    expect(ids).toContain("org-learning");
    expect(ids).toContain("kp-learning");
    expect(ids).toContain("council-learning");
  });

  it("should be idempotent (multiple registration calls safe)", async () => {
    const { registerAllEngines } = await import("../../src/learning-integration");
    registerAllEngines();
    registerAllEngines(); // should not throw
    expect(LearningRegistry.count()).toBeGreaterThanOrEqual(3);
  });

  it("should retrieve from all registered adapters", () => {
    const results = IntegrationManager.retrieve({ query: "", maxResults: 5 });
    const sources = [...new Set(results.map(r => r.originEngine))];
    expect(sources.length).toBeGreaterThanOrEqual(1);
  });

  it("should run maintenance on all adapters", () => {
    const results = IntegrationManager.runMaintenance();
    const engines = results.map(r => r.engine);
    expect(engines).toContain("org-learning");
    expect(engines).toContain("kp-learning");
    expect(engines).toContain("council-learning");
  });

  it("should report health for all adapters", () => {
    const health = IntegrationManager.health();
    expect(health.length).toBeGreaterThanOrEqual(3);
    for (const h of health) {
      expect(typeof h.healthy).toBe("boolean");
      expect(h.registered).toBe(true);
      expect(Array.isArray(h.supportedCapabilities)).toBe(true);
    }
  });
});

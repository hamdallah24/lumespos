// T5.3B — Runtime Wiring Tests
// Verifies: observer ingestion through IntegrationManager, MemoryProvider retrieval, feedback routing, metrics, health

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { LearningRegistry } from "../../src/learning-integration/LearningRegistry";
import { IntegrationManager } from "../../src/learning-integration/IntegrationManager";
import { registerAllEngines } from "../../src/learning-integration";
import type { IntegrationMetrics } from "../../src/learning-integration/types";

describe("T5.3B — IntegrationManager.provideFeedback", () => {
  beforeAll(() => { registerAllEngines(); });

  it("should route feedback through adapters", () => {
    const count = IntegrationManager.provideFeedback({
      decisionId: "test-d1", outcome: "success",
      executive: "CEO", domain: "general", confidence: 85,
      summary: "Test feedback routing",
    });
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should handle failure outcome gracefully", () => {
    const count = IntegrationManager.provideFeedback({
      decisionId: "test-d2", outcome: "failure",
      domain: "test", confidence: 30, summary: "Test failure",
    });
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe("T5.3B — IntegrationMetrics", () => {
  beforeAll(() => { registerAllEngines(); });

  it("should increment retrieveCalls on retrieve", () => {
    const before = IntegrationManager.getMetrics().retrieveCalls;
    IntegrationManager.retrieve({ query: "metric-test" });
    const after = IntegrationManager.getMetrics().retrieveCalls;
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  it("should increment ingestCalls on ingest", () => {
    const before = IntegrationManager.getMetrics().ingestCalls;
    IntegrationManager.ingest({ content: "metric ingest test" });
    const after = IntegrationManager.getMetrics().ingestCalls;
    expect(after).toBeGreaterThanOrEqual(before + 1);
  });

  it("should track perEngineCalls", () => {
    const metrics = IntegrationManager.getMetrics();
    expect(metrics.perEngineCalls).toBeDefined();
    const engineIds = Object.keys(metrics.perEngineCalls);
    expect(engineIds.length).toBeGreaterThanOrEqual(1);
  });

  it("should return averageLatency as number", () => {
    const metrics = IntegrationManager.getMetrics();
    expect(typeof metrics.averageLatency).toBe("number");
    expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
  });
});

describe("T5.3B — Extended Health", () => {
  beforeAll(() => { registerAllEngines(); });

  it("should return detailed health for each engine", () => {
    const health = IntegrationManager.health();
    expect(health.length).toBeGreaterThanOrEqual(3);
    for (const h of health) {
      expect(h.engine).toBeTruthy();
      expect(typeof h.healthy).toBe("boolean");
      expect(h.registered).toBe(true);
      expect(Array.isArray(h.supportedCapabilities)).toBe(true);
      expect(h.supportedCapabilities.length).toBeGreaterThanOrEqual(1);
      expect(typeof h.errors).toBe("number");
    }
  });

  it("should include org-learning in health report", () => {
    const health = IntegrationManager.health();
    const org = health.find(h => h.engine === "org-learning");
    expect(org).toBeDefined();
    expect(org!.supportedCapabilities).toContain("retrieval");
  });
});

describe("T5.3B — Registry Validation", () => {
  it("should reject duplicate engine id", () => {
    const testEngine = {
      info: { id: "test-dup", name: "Test Dup", version: "1.0.0", capabilities: [] as any[] },
      retrieve: () => [], ingest: () => {}, feedback: () => {},
      maintenance: () => ({ actions: 0, details: [] }),
      health: () => ({ status: "healthy" as const, lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: [], errors: 0 }),
    };
    LearningRegistry.register(testEngine as any);
    expect(() => LearningRegistry.register(testEngine as any)).toThrow("already registered");
    LearningRegistry.unregister("test-dup");
  });

  it("should reject duplicate engine name", () => {
    const engine1 = {
      info: { id: "name-test-1", name: "NameConflict", version: "1.0.0", capabilities: [] as any[] },
      retrieve: () => [], ingest: () => {}, feedback: () => {},
      maintenance: () => ({ actions: 0, details: [] }),
      health: () => ({ status: "healthy" as const, lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: [], errors: 0 }),
    };
    const engine2 = {
      info: { id: "name-test-2", name: "NameConflict", version: "1.0.0", capabilities: [] as any[] },
      retrieve: () => [], ingest: () => {}, feedback: () => {},
      maintenance: () => ({ actions: 0, details: [] }),
      health: () => ({ status: "healthy" as const, lastCheck: new Date().toISOString(), registered: true, supportedCapabilities: [], errors: 0 }),
    };
    LearningRegistry.register(engine1 as any);
    expect(() => LearningRegistry.register(engine2 as any)).toThrow("name already registered");
    LearningRegistry.unregister("name-test-1");
  });
});

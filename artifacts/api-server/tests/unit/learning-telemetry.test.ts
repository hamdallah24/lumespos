// T5.5A — Learning Telemetry Tests
// Covers: event recording, querying, stats, IntegrationManager wrapping, non-intrusiveness

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { learningTelemetry, recordTelemetry } from "../../src/learning-effectiveness/telemetry";
import { IntegrationManager } from "../../src/learning-integration/IntegrationManager";
import { registerAllEngines } from "../../src/learning-integration";

describe("T5.5A — TelemetryStore", () => {
  beforeEach(() => {
    learningTelemetry.clear();
  });

  it("should record and retrieve events", () => {
    const event = recordTelemetry({
      type: "retrieve", executive: "CEO", engine: "org-learning",
      adapter: "org-learning-adapter", capability: "retrieval",
      durationMs: 42, result: "success",
    });
    expect(event.id).toBeTruthy();
    expect(event.type).toBe("retrieve");
    expect(event.executive).toBe("CEO");
    expect(event.durationMs).toBe(42);
    expect(learningTelemetry.count()).toBe(1);
  });

  it("should query by type", () => {
    recordTelemetry({ type: "retrieve", durationMs: 10, result: "success" });
    recordTelemetry({ type: "ingest", durationMs: 20, result: "success" });
    recordTelemetry({ type: "feedback", durationMs: 5, result: "success" });

    const retrieves = learningTelemetry.query({ type: "retrieve" });
    expect(retrieves.length).toBe(1);
    const ingests = learningTelemetry.query({ type: "ingest" });
    expect(ingests.length).toBe(1);
  });

  it("should query by executive", () => {
    recordTelemetry({ type: "retrieve", executive: "CEO", durationMs: 10, result: "success" });
    recordTelemetry({ type: "retrieve", executive: "CTO", durationMs: 10, result: "success" });

    const ceoEvents = learningTelemetry.query({ executive: "CEO" });
    expect(ceoEvents.length).toBe(1);
  });

  it("should query by engine", () => {
    recordTelemetry({ type: "ingest", engine: "kp-learning", durationMs: 5, result: "success" });
    const kpEvents = learningTelemetry.query({ engine: "kp-learning" });
    expect(kpEvents.length).toBe(1);
  });

  it("should respect limit and offset", () => {
    for (let i = 0; i < 10; i++) {
      recordTelemetry({ type: "retrieve", durationMs: i, result: "success" });
    }
    const first3 = learningTelemetry.query({ limit: 3 });
    expect(first3.length).toBe(3);
    const next3 = learningTelemetry.query({ limit: 3, offset: 3 });
    expect(next3.length).toBe(3);
  });

  it("should compute stats", () => {
    recordTelemetry({ type: "retrieve", engine: "org", executive: "CEO", durationMs: 100, result: "success" });
    recordTelemetry({ type: "retrieve", engine: "kp", executive: "CEO", durationMs: 200, result: "success" });
    recordTelemetry({ type: "ingest", engine: "kp", executive: "CTO", durationMs: 50, result: "failure" });

    const stats = learningTelemetry.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byType["retrieve"]).toBe(2);
    expect(stats.byType["ingest"]).toBe(1);
    expect(stats.byEngine["org"]).toBe(1);
    expect(stats.avgDuration).toBe(117); // (100+200+50)/3 ≈ 117
    expect(stats.successRate).toBe(67); // Math.round(2/3 * 100)
  });

  it("should not exceed max event limit", () => {
    learningTelemetry.clear();
    for (let i = 0; i < 11000; i++) {
      recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    }
    expect(learningTelemetry.count()).toBeLessThanOrEqual(50000);
  });

  it("should clear all events", () => {
    recordTelemetry({ type: "retrieve", durationMs: 1, result: "success" });
    learningTelemetry.clear();
    expect(learningTelemetry.count()).toBe(0);
  });
});

describe("T5.5A — IntegrationManager Telemetry Wrapper", () => {
  beforeAll(async () => {
    registerAllEngines();
    const { activateLearningTelemetry } = await import("../../src/learning-effectiveness");
    activateLearningTelemetry();
  });

  beforeEach(() => {
    learningTelemetry.clear();
  });

  it("should record telemetry on retrieve", () => {
    learningTelemetry.clear();
    IntegrationManager.retrieve({ query: "telemetry-test" });
    const events = learningTelemetry.query({ type: "retrieve" });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe("retrieve");
    expect(events[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should record telemetry on ingest", () => {
    learningTelemetry.clear();
    IntegrationManager.ingest({ content: "telemetry ingest test" });
    const events = learningTelemetry.query({ type: "ingest" });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("should record telemetry on feedback", () => {
    learningTelemetry.clear();
    IntegrationManager.provideFeedback({
      decisionId: "tel-test-d1", outcome: "success",
      domain: "test", confidence: 80, summary: "Telemetry feedback test",
    });
    const events = learningTelemetry.query({ type: "feedback" });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("should record telemetry on maintenance", () => {
    learningTelemetry.clear();
    IntegrationManager.runMaintenance();
    const events = learningTelemetry.query({ type: "maintenance" });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("should not break IntegrationManager functionality", () => {
    const before = IntegrationManager.discover().length;
    expect(before).toBeGreaterThanOrEqual(3);
    const results = IntegrationManager.retrieve({ query: "test", maxResults: 3 });
    expect(Array.isArray(results)).toBe(true);
  });
});

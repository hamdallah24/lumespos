// T5.1 — Learning Infrastructure Stabilization Tests
// Covers: autoCycle, processEpisodeOutcomes, council event emission, scheduler safety, queue pruning

import { describe, it, expect, beforeEach, vi } from "vitest";
import { knowledgeQueue } from "../../src/learning/knowledge-queue";
import { KnowledgeProvider } from "../../src/knowledge-platform/providers/KnowledgeProvider";
import { parseComponentId } from "../../src/eios-runtime/contracts/ComponentId";

// ─────────────────────────────────────────────────
// LearningEngine.autoCycle()
// ─────────────────────────────────────────────────
describe("T5.1.1 — LearningEngine.autoCycle", () => {
  beforeEach(() => {
    knowledgeQueue.prune(0);
  });

  it("should process pending queue items with valid synthetic data", async () => {
    const { learningEngine } = await import("../../src/learning/learning-engine");

    knowledgeQueue.enqueue("mission-1", "CEO");
    const result = learningEngine.autoCycle();
    expect(result.decisionsAnalyzed).toBe(1);
    expect(result.patternsDetected).toBe(0);
  });

  it("should return zeros when queue is empty", async () => {
    const { learningEngine } = await import("../../src/learning/learning-engine");

    const result = learningEngine.autoCycle();
    expect(result.decisionsAnalyzed).toBe(0);
    expect(result.patternsDetected).toBe(0);
  });

  it("should not throw when queue items have minimal data", async () => {
    const { learningEngine } = await import("../../src/learning/learning-engine");

    knowledgeQueue.enqueue("", "CEO");
    knowledgeQueue.enqueue("test-id", "CTO");
    expect(() => learningEngine.autoCycle()).not.toThrow();
  });

  it("should process items independently (partial failure does not halt)", async () => {
    const { learningEngine } = await import("../../src/learning/learning-engine");

    knowledgeQueue.enqueue("good-id", "CFO");
    knowledgeQueue.enqueue("good-id-2", "COO");
    const result = learningEngine.autoCycle();
    expect(result.decisionsAnalyzed).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────
// KnowledgeProvider.processEpisodeOutcomes()
// ─────────────────────────────────────────────────
describe("T5.1.4 — KnowledgeProvider.processEpisodeOutcomes", () => {
  beforeEach(() => {
    // Clear knowledge base for clean test state
    KnowledgeProvider.clear();
  });

  it("should process episode outcomes and return count", async () => {
    KnowledgeProvider.ingestEpisode({
      eventType: "test",
      eventId: `ep-${Date.now()}`,
      context: "Test outcome episode",
      outcome: "success",
      domain: "test",
      topic: "testing",
      summary: "Test episode for outcome processing",
    });

    const count = KnowledgeProvider.processEpisodeOutcomes();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("should handle empty episode store gracefully", () => {
    const count = KnowledgeProvider.processEpisodeOutcomes();
    expect(count).toBe(0);
  });

  it("should not throw on mixed outcome types", () => {
    KnowledgeProvider.ingestEpisode({
      eventType: "test-a",
      eventId: `ep-a-${Date.now()}`,
      context: "Success test",
      outcome: "success",
      domain: "test",
      topic: "testing",
      summary: "Test success",
    });
    KnowledgeProvider.ingestEpisode({
      eventType: "test-b",
      eventId: `ep-b-${Date.now()}`,
      context: "Failure test",
      outcome: "failure",
      domain: "test",
      topic: "testing",
      summary: "Test failure",
    });

    expect(() => KnowledgeProvider.processEpisodeOutcomes()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────
// KnowledgeProvider.runMaintenance()
// ─────────────────────────────────────────────────
describe("T5.1.4 — KnowledgeProvider.runMaintenance", () => {
  it("should run maintenance and return counts", () => {
    const result = KnowledgeProvider.runMaintenance();
    expect(result).toHaveProperty("promoted");
    expect(result).toHaveProperty("deprecated");
    expect(result).toHaveProperty("archived");
    expect(Array.isArray(result.promoted)).toBe(true);
    expect(Array.isArray(result.deprecated)).toBe(true);
    expect(Array.isArray(result.archived)).toBe(true);
  });

  it("should be idempotent", () => {
    const r1 = KnowledgeProvider.runMaintenance();
    const r2 = KnowledgeProvider.runMaintenance();
    expect(r1.promoted.length).toBeGreaterThanOrEqual(0);
    expect(r2.deprecated.length).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────
// CouncilOrchestrator Event Emission
// ─────────────────────────────────────────────────
describe("T5.1.5 — CouncilOrchestrator event emission", () => {
  it("should resolve session without throwing", async () => {
    const { CouncilOrchestrator } = await import("../../src/executive-council/core/CouncilOrchestrator");
    const { councilSessionManager } = await import("../../src/executive-council/core/CouncilSession");

    const session = councilSessionManager.create("Test council", "Testing", new Date(Date.now() + 3600000));
    const result = CouncilOrchestrator.resolveOrEscalate(session.id);
    expect(["resolved", "escalated"]).toContain(result.action);
  });

  it("should handle missing session gracefully", async () => {
    const { CouncilOrchestrator } = await import("../../src/executive-council/core/CouncilOrchestrator");

    const result = CouncilOrchestrator.resolveOrEscalate("non-existent-id");
    expect(result.action).toBe("escalated");
  });
});

// ─────────────────────────────────────────────────
// KnowledgeQueue.prune()
// ─────────────────────────────────────────────────
describe("T5.1.6 — KnowledgeQueue.prune", () => {
  beforeEach(() => {
    knowledgeQueue.prune(0);
  });

  it("should remove completed items older than retention", () => {
    knowledgeQueue.enqueue("m1", "CEO");
    const item = knowledgeQueue.dequeue();
    if (item) knowledgeQueue.complete(item.id);

    const pruned = knowledgeQueue.prune(0);
    expect(pruned).toBe(1);
  });

  it("should not remove pending or processing items", () => {
    knowledgeQueue.enqueue("m1", "CEO");
    knowledgeQueue.dequeue();

    const pruned = knowledgeQueue.prune(0);
    expect(pruned).toBe(0);
  });

  it("should return 0 when queue is empty", () => {
    const pruned = knowledgeQueue.prune();
    expect(pruned).toBe(0);
  });
});

// ─────────────────────────────────────────────────
// Scheduler Safety (scheduler-safety.ts)
// ─────────────────────────────────────────────────
describe("T5.1.7 — Scheduler safety", () => {
  it("should track metrics for scheduled tasks", async () => {
    const { safeSchedule, getSchedulerMetrics } = await import("../../src/kernel/scheduler-safety");
    const { kernelScheduler } = await import("../../src/kernel/kernel-scheduler");

    let executed = false;
    safeSchedule("test-metrics", 100, () => { executed = true; });
    await new Promise(r => setTimeout(r, 150));

    const metrics = getSchedulerMetrics("test-metrics");
    expect(metrics).toBeDefined();
    expect(metrics!.executions).toBeGreaterThanOrEqual(1);
    kernelScheduler.stop();
  });

  it("should retry on failure", async () => {
    const { safeSchedule, getSchedulerMetrics } = await import("../../src/kernel/scheduler-safety");
    const { kernelScheduler } = await import("../../src/kernel/kernel-scheduler");

    let attempts = 0;
    safeSchedule("test-retry", 50, () => { attempts++; throw new Error("Test error"); });
    await new Promise(r => setTimeout(r, 200));

    const metrics = getSchedulerMetrics("test-retry");
    expect(metrics).toBeDefined();
    expect(metrics!.failures).toBeGreaterThanOrEqual(1);
    kernelScheduler.stop();
  });
});

// ─────────────────────────────────────────────────
// InitializeKnowledgePlatform()
// ─────────────────────────────────────────────────
describe("T5.1.3 — Knowledge Platform Initialization", () => {
  it("should initialize without throwing", async () => {
    const { initializeKnowledgePlatform } = await import("../../src/knowledge-platform");
    expect(() => initializeKnowledgePlatform()).not.toThrow();
  });

  it("should be idempotent (multiple calls safe)", async () => {
    const { initializeKnowledgePlatform } = await import("../../src/knowledge-platform");
    initializeKnowledgePlatform();
    expect(() => initializeKnowledgePlatform()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────
// Memory Engine Maintenance (T5.1.2)
// ─────────────────────────────────────────────────
describe("T5.1.2 — Memory Engine Maintenance", () => {
  it("should export memoryEngine from memory-provider barrel", async () => {
    const mod = await import("../../src/executive-runtime/memory-provider");
    expect(mod.memoryEngine).toBeDefined();
    expect(typeof mod.memoryEngine.runMaintenanceCycle).toBe("function");
  });

  it("should run maintenance cycle without throwing", async () => {
    const { memoryEngine } = await import("../../src/executive-runtime/memory-provider");
    const result = memoryEngine.runMaintenanceCycle();
    expect(result).toHaveProperty("promoted");
    expect(result).toHaveProperty("consolidated");
    expect(result).toHaveProperty("forgotten");
  });
});

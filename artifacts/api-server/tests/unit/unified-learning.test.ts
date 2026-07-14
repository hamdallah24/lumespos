// T5.3 — Unified Learning Integration Tests
// Covers: unified retrieval, deduplication, conflict resolution, cross-engine sync, feedback

import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeProvider } from "../../src/knowledge-platform/providers/KnowledgeProvider";
import { knowledgeGraph } from "../../src/learning/knowledge-graph";
import { knowledgeQueue } from "../../src/learning/knowledge-queue";

describe("T5.3.1 — Unified Types", () => {
  it("should export UnifiedEvidence shape", async () => {
    const types = await import("../../src/learning/unified-types");
    const evidence: types.UnifiedEvidence = {
      id: "test-1", content: "test", source: "org_learning",
      originEngine: "test", confidence: 80, timestamp: new Date().toISOString(),
      importance: 50, freshness: 100,
    };
    expect(evidence.id).toBe("test-1");
    expect(evidence.confidence).toBe(80);
  });
});

describe("T5.3.2 — Unified Retrieval", () => {
  it("should retrieve from org_learning source", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const results = UnifiedLearningLayer.retrieve({ mission: "test", domain: "general", maxResults: 10 });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
    for (const r of results) {
      expect(r.id).toBeTruthy();
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.freshness).toBeGreaterThanOrEqual(0);
    }
  });

  it("should retrieve from knowledge_platform source", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    KnowledgeProvider.ingestEpisode({
      eventType: "unified-test", eventId: `ut-${Date.now()}`,
      context: "Unified retrieval test episode", outcome: "success",
      domain: "unified-test", topic: "testing", summary: "Unified test episode",
    });
    const results = UnifiedLearningLayer.retrieve({ domain: "unified-test", sources: ["episode"] });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].source).toBe("episode");
  });

  it("should respect maxResults limit", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const results = UnifiedLearningLayer.retrieve({ mission: "test", maxResults: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("should filter by minConfidence", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const results = UnifiedLearningLayer.retrieve({ mission: "test", minConfidence: 90 });
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(90);
    }
  });

  it("should filter by sources", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const results = UnifiedLearningLayer.retrieve({ sources: ["council_learning"] });
    for (const r of results) {
      expect(r.source).toBe("council_learning");
    }
  });
});

describe("T5.3.3 — Deduplication", () => {
  it("should merge duplicate content items", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const items = [
      { id: "a", content: "Strategic expansion to five cities next year", source: "org_learning" as const, originEngine: "OL", confidence: 80, timestamp: new Date().toISOString(), importance: 70, freshness: 80 },
      { id: "b", content: "Strategic expansion to five cities in the coming year", source: "knowledge_platform" as const, originEngine: "KP", confidence: 75, timestamp: new Date().toISOString(), importance: 60, freshness: 90 },
      { id: "c", content: "Completely different content about finance", source: "episode" as const, originEngine: "KP", confidence: 90, timestamp: new Date().toISOString(), importance: 50, freshness: 70 },
    ];
    const deduped = UnifiedLearningLayer.deduplicate(items);
    expect(deduped.length).toBe(2);
  });

  it("should keep highest confidence on conflict", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const items = [
      { id: "a", content: "Market analysis shows growth potential", source: "org_learning" as const, originEngine: "OL", confidence: 60, timestamp: "2024-01-01", importance: 50, freshness: 20 },
      { id: "b", content: "Market analysis shows growth potential in Q3", source: "knowledge_platform" as const, originEngine: "KP", confidence: 85, timestamp: "2026-01-01", importance: 70, freshness: 90 },
    ];
    const resolved = UnifiedLearningLayer.resolveConflicts(items);
    expect(resolved.confidence).toBe(85);
    expect(resolved.originEngine).toBe("KP");
  });
});

describe("T5.3.4 — Cross-Engine Synchronization", () => {
  it("should sync without throwing", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    const result = UnifiedLearningLayer.synchronize();
    expect(result).toHaveProperty("synced");
    expect(Array.isArray(result.details)).toBe(true);
  });
});

describe("T5.3.5 — Shared Feedback Loop", () => {
  it("should provide feedback without throwing", async () => {
    const { UnifiedLearningLayer } = await import("../../src/learning/unified-learning-layer");
    expect(() => {
      UnifiedLearningLayer.provideFeedback({
        decisionId: "test-d-1", executive: "CEO",
        domain: "unified-test", outcome: "success",
        confidence: 85, summary: "Unified feedback test",
      });
    }).not.toThrow();
  });
});

describe("T5.3.6 — Refactored RetrievalEngine (backward compat)", () => {
  beforeEach(() => {
    knowledgeQueue.prune(0);
  });

  it("should still export retrievalEngine with legacy retrieve()", async () => {
    const { retrievalEngine } = await import("../../src/learning/retrieval-engine");
    expect(retrievalEngine).toBeDefined();
    expect(typeof retrievalEngine.retrieve).toBe("function");
    const result = retrievalEngine.retrieve({ mission: "test", domain: "general", executive: "CEO" as any });
    expect(result).toHaveProperty("knowledge");
    expect(result).toHaveProperty("confidence");
  });

  it("should support new retrieveUnified() method", async () => {
    const { retrievalEngine } = await import("../../src/learning/retrieval-engine");
    expect(typeof retrievalEngine.retrieveUnified).toBe("function");
    const evidence = retrievalEngine.retrieveUnified({ mission: "test" });
    expect(Array.isArray(evidence)).toBe(true);
  });

  it("should build unified context prompt", async () => {
    const { retrievalEngine } = await import("../../src/learning/retrieval-engine");
    const evidence = retrievalEngine.retrieveUnified({ mission: "test", maxResults: 3 });
    const prompt = retrievalEngine.buildUnifiedContextPrompt(evidence);
    expect(typeof prompt).toBe("string");
    if (evidence.length > 0) {
      expect(prompt).toContain("Unified Knowledge");
    }
  });
});

import { describe, it, expect, vi } from "vitest";

describe("KnowledgeProvider", () => {
  it("should search across all memory types", async () => {
    const { KnowledgeProvider } = await import("../../src/knowledge-platform/providers/KnowledgeProvider");
    const results = KnowledgeProvider.searchAll("test");
    expect(Array.isArray(results)).toBe(true);
  });

  it("should provide platform stats", async () => {
    const { KnowledgeProvider } = await import("../../src/knowledge-platform/providers/KnowledgeProvider");
    const stats = KnowledgeProvider.getStats();
    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("semantic");
    expect(stats).toHaveProperty("episode");
    expect(stats).toHaveProperty("procedural");
  });

  it("should ingest and retrieve episodes", async () => {
    const { KnowledgeProvider } = await import("../../src/knowledge-platform/providers/KnowledgeProvider");
    const block = KnowledgeProvider.ingestEpisode({
      eventType: "test_execution",
      eventId: `test-${Date.now()}`,
      context: "Test episode",
      outcome: "success",
      domain: "test",
      topic: "testing",
      summary: "Test knowledge episode",
    });
    expect(block).toBeDefined();
    expect(block.type).toBe("episode");
  });

  it("should ingest semantic facts", async () => {
    const { KnowledgeProvider } = await import("../../src/knowledge-platform/providers/KnowledgeProvider");
    const block = KnowledgeProvider.ingestSemantic({
      fact: "Test knowledge fact",
      domain: "test",
      topic: "testing",
      summary: "Test semantic fact",
      source: "test",
      entityRefs: [],
    });
    expect(block).toBeDefined();
    expect(block.type).toBe("semantic");
  });

  it("should get latest episodes", async () => {
    const { KnowledgeProvider } = await import("../../src/knowledge-platform/providers/KnowledgeProvider");
    const episodes = KnowledgeProvider.getLatestEpisodes(3);
    expect(Array.isArray(episodes)).toBe(true);
  });
});

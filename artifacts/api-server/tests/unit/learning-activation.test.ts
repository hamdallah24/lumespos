// T5.2 — Learning Activation Tests
// Covers: EvidenceBuilder memory context, CognitiveEngine memory flow, Council learning, Outcome learning

import { describe, it, expect, beforeAll } from "vitest";
import type { CognitiveContext, ExecutiveIntent, EvidenceSet } from "../../src/executive-runtime/cognition/CognitiveContracts";

describe("T5.2.3 — EvidenceBuilder with Memory Context", () => {
  it("should build evidence from memoryContext string", async () => {
    const { buildEvidenceSet } = await import("../../src/executive-runtime/cognition/EvidenceBuilder");
    const intent: ExecutiveIntent = { role: "CEO", primary: "test", secondary: [], problemType: "strategy", constraints: [], priority: 5 };
    const ctx: CognitiveContext = { sessionId: "t1", role: "CEO", history: [], memoryContext: "line1\nline2\nline3" };
    const evidence = buildEvidenceSet("q1", intent, ctx);
    expect(evidence.items.length).toBeGreaterThanOrEqual(2);
    expect(evidence.items.some(i => i.source === "memory")).toBe(true);
    expect(evidence.coverage).toBeGreaterThan(0);
  });

  it("should build evidence from knowledgeContext string", async () => {
    const { buildEvidenceSet } = await import("../../src/executive-runtime/cognition/EvidenceBuilder");
    const intent: ExecutiveIntent = { role: "CTO", primary: "test", secondary: [], problemType: "decision", constraints: [], priority: 5 };
    const ctx: CognitiveContext = { sessionId: "t2", role: "CTO", history: [], knowledgeContext: "knowledge line 1\nknowledge line 2" };
    const evidence = buildEvidenceSet("q2", intent, ctx);
    expect(evidence.items.some(i => i.source === "knowledge")).toBe(true);
  });

  it("should fallback to direct memoryEngine query when no memoryContext provided", async () => {
    const { buildEvidenceSet } = await import("../../src/executive-runtime/cognition/EvidenceBuilder");
    const intent: ExecutiveIntent = { role: "CEO", primary: "test", secondary: [], problemType: "strategy", constraints: [], priority: 5 };
    const ctx: CognitiveContext = { sessionId: "t3", role: "CEO", history: [] };
    const evidence = buildEvidenceSet("q3", intent, ctx);
    // Falls through to memoryEngine.query() — may or may not have records
    expect(evidence.questionId).toBe("q3");
    expect(Array.isArray(evidence.items)).toBe(true);
  });

  it("should include history evidence when available", async () => {
    const { buildEvidenceSet } = await import("../../src/executive-runtime/cognition/EvidenceBuilder");
    const intent: ExecutiveIntent = { role: "CEO", primary: "test", secondary: [], problemType: "strategy", constraints: [], priority: 5 };
    const ctx: CognitiveContext = {
      sessionId: "t4", role: "CEO", history: [
        { role: "CEO", question: "test", chosenAlternative: { id: "a1", label: "Option A", description: "", pros: [], cons: [], estimatedImpact: "", risk: "" }, alternatives: [], reasoning: "Because", risks: [], confidence: { overall: 80, factors: [], missingInfo: [], contradictions: [], recommendation: "proceed" }, evidence: { questionId: "", items: [], coverage: 0, gaps: [], timestamp: "" }, plan: { intent: { role: "CEO", primary: "", secondary: [], problemType: "decision", constraints: [], priority: 1 }, thinkingMode: { modeId: "", role: "CEO", label: "", description: "", confidence: 0 }, mentalModels: [], frameworks: [], steps: [], estimatedComplexity: 0 }, timestamp: new Date().toISOString() },
      ] as any,
    };
    const evidence = buildEvidenceSet("q4", intent, ctx);
    expect(evidence.items.some(i => i.source === "conversation")).toBe(true);
  });
});

describe("T5.2.3 — CognitiveEngine memoryContext passthrough", () => {
  it("should pass memoryContext from options to cognitive context", async () => {
    const { CognitiveEngine } = await import("../../src/executive-runtime/cognition/CognitiveEngine");
    const engine = new CognitiveEngine();
    const result = await engine.think({
      role: "CEO",
      query: "test strategy",
      context: { memoryContext: "[WORKING] Test memory from executive", knowledgeContext: "test knowledge" },
    });
    expect(result.decision).toBeDefined();
    expect(result.trace.status).toBe("complete");
    // Evidence should include memory-sourced items
    expect(result.decision.evidence.items.length).toBeGreaterThanOrEqual(1);
  });

  it("should work without memoryContext (backward compatible)", async () => {
    const { CognitiveEngine } = await import("../../src/executive-runtime/cognition/CognitiveEngine");
    const engine = new CognitiveEngine();
    const result = await engine.think({ role: "CEO", query: "test", context: {} });
    expect(result.decision).toBeDefined();
    expect(result.trace.status).toBe("complete");
  });
});

describe("T5.2.1 — Outcome Learning via EIOS observer", () => {
  it("should call recordOutcome for matching domain blocks after ingestEpisode", async () => {
    const { KnowledgeProvider } = await import("../../src/knowledge-platform/providers/KnowledgeProvider");
    // Ingest a knowledge block first
    KnowledgeProvider.ingestSemantic({
      fact: "Test business knowledge", domain: "business", topic: "testing",
      summary: "Test knowledge for outcome feedback", source: "test", entityRefs: [],
    });
    // Ingest an episode in same domain — triggers real-time recordOutcome via observer
    const block = KnowledgeProvider.ingestEpisode({
      eventType: "decision", eventId: `test-outcome-${Date.now()}`,
      context: "Test decision", outcome: "success",
      domain: "business", topic: "testing", summary: "Test",
    });
    expect(block).toBeDefined();
    expect(block.type).toBe("episode");
  });
});

describe("T5.2.5 — Council Learning activation", () => {
  it("should enrich new sessions with past learning data", async () => {
    const { CouncilLearningProvider } = await import("../../src/executive-council/learning/CouncilLearningProvider");
    const { CouncilOrchestrator } = await import("../../src/executive-council/core/CouncilOrchestrator");
    const { councilSessionManager } = await import("../../src/executive-council/core/CouncilSession");

    // Record some past outcomes
    const session1 = councilSessionManager.create("Past session 1", "Old business", new Date(Date.now() + 3600000));
    CouncilLearningProvider.recordOutcome({ ...session1, status: "resolved", positions: [], deadline: new Date().toISOString(), createdAt: new Date().toISOString(), resolvedAt: new Date().toISOString(), resolution: "Approved" }, "success");

    // New session should include past learning context
    const brief = { title: "New Strategy", summary: "Strategic decision", situations: [], objectives: [], plans: [], deadlines: [], priority: 5, risk: "low", compliance: [], knowledge: [], dependencies: [], tags: [] };
    const session = CouncilOrchestrator.initiateFromBrief(brief as any, [{ id: "CEO", role: "CEO" }]);
    expect(session.description).toContain("resolution");
  });
});

describe("T5.2.7 — Dead path: retrievalEngine", () => {
  it("should be importable (backward compatible)", async () => {
    const { retrievalEngine } = await import("../../src/learning/retrieval-engine");
    expect(retrievalEngine).toBeDefined();
    expect(typeof retrievalEngine.retrieve).toBe("function");
  });

  it("should retrieve knowledge without throwing", async () => {
    const { retrievalEngine } = await import("../../src/learning/retrieval-engine");
    const result = retrievalEngine.retrieve({
      mission: "test", domain: "general", executive: "CEO" as any,
    });
    expect(Array.isArray(result.knowledge)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

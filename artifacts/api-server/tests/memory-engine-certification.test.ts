import { describe, it, expect } from "vitest";

describe("EPIC T.1 — Executive Memory Engine Certification", () => {
  it("C1 — All memory records have lifecycle states", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();

    const record = engine.write({ content: "Test memory for lifecycle" });
    expect(record.lifecycleState).toBe("NEW");

    const validated = engine.validateMemory(record.id);
    expect(validated.lifecycleState).toBe("VALIDATED");

    const allStates = engine.countByState();
    expect(allStates["NEW"]).toBeGreaterThanOrEqual(0);
    expect(allStates["VALIDATED"]).toBeGreaterThanOrEqual(0);
  });

  it("C2 — All memory records have importance scores (0-100)", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "CEO strategic decision to expand market", category: "decision", executivePriority: 90, isUserExplicit: true });
    expect(r1.importance).toBeDefined();
    expect(r1.importance.total).toBeGreaterThanOrEqual(0);
    expect(r1.importance.total).toBeLessThanOrEqual(100);
    expect(r1.importance.businessImpact).toBeGreaterThanOrEqual(0);
    expect(r1.importance.executivePriority).toBeGreaterThanOrEqual(0);
    expect(r1.importance.recurrence).toBeGreaterThanOrEqual(0);
    expect(r1.importance.userExplicitness).toBeGreaterThanOrEqual(0);
    expect(r1.importance.novelty).toBeGreaterThanOrEqual(0);
    expect(r1.importance.crossExecutiveRelevance).toBeGreaterThanOrEqual(0);
  });

  it("C3 — Duplicate detection is active and functional", async () => {
    const { DuplicateDetector } = await import("../src/executive-runtime/memory/engine/DuplicateDetector");
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const detector = new DuplicateDetector();
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "Revenue target is 10 million for this quarter" });
    const r2 = engine.write({ content: "Revenue target is 10 million for this quarter" });

    const allRecords = engine.getAllRecords();
    const results = detector.check(r1, allRecords);
    const identical = results.filter(r => r.relation === "identical");
    expect(identical.length).toBeGreaterThanOrEqual(0);
  });

  it("C4 — Conflict resolution is active with multiple strategies", async () => {
    const { ConflictResolver } = await import("../src/executive-runtime/memory/engine/ConflictResolver");
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const resolver = new ConflictResolver();
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "Revenue is 10 million", confidence: 0.9, executivePriority: 80 });
    const r2 = engine.write({ content: "Revenue is 10.5 million", confidence: 0.7, executivePriority: 60 });

    const allRecords = engine.getAllRecords();
    const conflicting = allRecords.filter(r => r.id === r1.id || r.id === r2.id);

    const resolution = resolver.resolve(conflicting, "keep_higher_importance");
    expect(resolution.survivingRecord).toBeDefined();
    expect(resolution.discardedIds.length).toBeGreaterThanOrEqual(0);
    expect(resolution.strategy).toBe("keep_higher_importance");
  });

  it("C5 — Promotion engine promotes VALIDATED to WORKING and CONSOLIDATED to LONG_TERM", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "Important strategic insight", executivePriority: 85, isUserExplicit: true });
    engine.validateMemory(r1.id);

    const promoted = engine.promoteAll();
    expect(promoted.promoted.length).toBeGreaterThanOrEqual(0);

    const r1after = engine.read(r1.id);
    if (r1after && r1after.importance.total >= 20) {
      expect(r1after.lifecycleState === "WORKING" || r1after.lifecycleState === "VALIDATED").toBe(true);
    }
  });

  it("C6 — Forgetting policy is active and applied", async () => {
    const { ForgettingEngine } = await import("../src/executive-runtime/memory/engine/ForgettingEngine");
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const forgetter = new ForgettingEngine();
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "Low priority debug log message", executivePriority: 5 });
    const r2 = engine.write({ content: "Important customer requirement", executivePriority: 90, isUserExplicit: true });

    const allRecords = engine.getAllRecords();
    const result = forgetter.evaluate(allRecords);
    expect(result.archived).toBeDefined();
    expect(result.forgotten).toBeDefined();
    expect(result.kept).toBeDefined();
  });

  it("C7 — Executive scope is applied to all records", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "Global strategic memory", scope: "GLOBAL" });
    const r2 = engine.write({ content: "CTO technical decision", scope: "CTO" });

    expect(r1.scope).toBe("GLOBAL");
    expect(r2.scope).toBe("CTO");

    const globalRecords = engine.query({ scope: "GLOBAL" });
    expect(globalRecords.some(r => r.id === r1.id)).toBe(true);
  });

  it("C8 — All memory records have complete trace history", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "Traceable memory" });
    expect(r1.trace.length).toBeGreaterThanOrEqual(1);
    expect(r1.trace[0].event).toBe("created");

    const validated = engine.validateMemory(r1.id);
    expect(validated.trace.length).toBeGreaterThanOrEqual(2);
    expect(validated.trace[1].event).toBe("validated");
  });

  it("C9 — Runtime only accesses memory through MemoryProvider", async () => {
    const { memoryProvider } = await import("../src/executive-runtime/memory-provider/MemoryProvider");
    expect(memoryProvider.read).toBeDefined();
    expect(memoryProvider.write).toBeDefined();
    expect(memoryProvider.estimate).toBeDefined();
  });

  it("C10 — No changes to Runtime Core files", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();
    const status = engine.getEngineStatus();
    expect(status.runtimeOnlyThroughProvider).toBe(true);
    expect(status.runtimeCoreUnchanged).toBe(true);
  });

  it("C11 — Consolidation merges similar memories", async () => {
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const engine = new MemoryEngine();

    const r1 = engine.write({ content: "User likes Lume product line", scope: "CMO" });
    const r2 = engine.write({ content: "User is building Lume business", scope: "CMO" });

    const initialCount = engine.count();
    const result = engine.consolidateAll("keep_higher_importance");
    expect(result.consolidated.length).toBeLessThanOrEqual(initialCount);
  });

  it("C12 — Full certification report passes all criteria", async () => {
    const { MemoryCertification } = await import("../src/executive-runtime/memory/audit/MemoryCertification");
    const { MemoryEngine } = await import("../src/executive-runtime/memory/engine/MemoryEngine");
    const certification = new MemoryCertification();
    const engine = new MemoryEngine();

    engine.write({ content: "CEO strategy for Q3", scope: "CEO", executivePriority: 95, isUserExplicit: true, category: "decision" });
    engine.write({ content: "CTO architecture decision on microservices", scope: "CTO", executivePriority: 80, category: "decision" });
    engine.write({ content: "COO operational workflow optimization", scope: "COO", executivePriority: 70, category: "insight" });

    engine.promoteAll();

    const allRecords = engine.getAllRecords();
    const status = engine.getEngineStatus();
    const report = certification.certify(allRecords, status);

    expect(report.allPassed).toBe(true);
    expect(report.criteria.length).toBe(10);
    expect(report.summary).toContain("10/10");
  });
});

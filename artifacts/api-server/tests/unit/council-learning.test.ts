import { describe, it, expect, beforeEach } from "vitest";
import type { CouncilSession } from "../../src/executive-council/core/CouncilSession";

function makeSession(overrides: Partial<CouncilSession> = {}): CouncilSession {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "Test Session",
    description: "Test description",
    status: "resolved",
    positions: [],
    deadline: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    resolution: "Approved",
    ...overrides,
  };
}

beforeEach(async () => {
  const { clearCouncilOutcomes } = await import("../../src/executive-council/learning/CouncilOutcomeTracker");
  clearCouncilOutcomes();
});

describe("CouncilOutcomeTracker", () => {
  it("should record and retrieve outcomes", async () => {
    const { recordCouncilOutcome, getCouncilOutcomes } = await import("../../src/executive-council/learning/CouncilOutcomeTracker");

    const rec = recordCouncilOutcome({
      sessionId: "s1", sessionTitle: "T1", outcome: "success",
      resolution: "Approved", executiveCount: 3,
      approvalCount: 2, rejectionCount: 1, abstainCount: 0, durationMs: 5000,
    });
    expect(rec.sessionId).toBe("s1");
    expect(rec.recordedAt).toBeTruthy();

    const all = getCouncilOutcomes();
    expect(all.length).toBe(1);
  });

  it("should compute stats", async () => {
    const { recordCouncilOutcome, getCouncilOutcomeStats } = await import("../../src/executive-council/learning/CouncilOutcomeTracker");

    recordCouncilOutcome({ sessionId: "s1", sessionTitle: "T1", outcome: "success", resolution: "OK", executiveCount: 2, approvalCount: 2, rejectionCount: 0, abstainCount: 0, durationMs: 1000 });
    recordCouncilOutcome({ sessionId: "s2", sessionTitle: "T2", outcome: "failure", resolution: "No", executiveCount: 2, approvalCount: 0, rejectionCount: 2, abstainCount: 0, durationMs: 3000 });

    const stats = getCouncilOutcomeStats();
    expect(stats.total).toBe(2);
    expect(stats.success).toBe(1);
    expect(stats.failure).toBe(1);
    expect(stats.successRate).toBe(50);
    expect(stats.averageDurationMs).toBe(2000);
  });
});

describe("CouncilPatternDetector", () => {
  it("should detect escalation trend with 2+ escalated sessions", async () => {
    const { detectCouncilPatterns } = await import("../../src/executive-council/learning/CouncilPatternDetector");

    const sessions = [
      makeSession({ id: "s1", status: "escalated" }),
      makeSession({ id: "s2", status: "escalated" }),
      makeSession({ id: "s3", status: "resolved" }),
    ];

    const patterns = detectCouncilPatterns(sessions);
    const escalation = patterns.find(p => p.type === "escalation_trend");
    expect(escalation).toBeDefined();
    expect(escalation!.triggerCount).toBe(2);
  });

  it("should detect consensus resolution style", async () => {
    const { detectCouncilPatterns } = await import("../../src/executive-council/learning/CouncilPatternDetector");

    const sessions = [
      makeSession({
        id: "s1", status: "resolved",
        positions: [
          { executiveId: "CEO", role: "CEO", position: "approve", reasoning: "Yes", submittedAt: new Date().toISOString() },
          { executiveId: "CTO", role: "CTO", position: "approve", reasoning: "OK", submittedAt: new Date().toISOString() },
          { executiveId: "CFO", role: "CFO", position: "reject", reasoning: "No", submittedAt: new Date().toISOString() },
        ],
      }),
      makeSession({
        id: "s2", status: "resolved",
        positions: [
          { executiveId: "CEO", role: "CEO", position: "approve", reasoning: "Yes", submittedAt: new Date().toISOString() },
          { executiveId: "COO", role: "COO", position: "approve", reasoning: "OK", submittedAt: new Date().toISOString() },
        ],
      }),
    ];

    const patterns = detectCouncilPatterns(sessions);
    const consensus = patterns.find(p => p.type === "resolution_style");
    expect(consensus).toBeDefined();
  });
});

describe("CouncilLearningEngine", () => {
  it("should record and analyze outcomes", async () => {
    const { CouncilLearningEngine } = await import("../../src/executive-council/learning/CouncilLearningEngine");

    const session = makeSession({ id: "s1", positions: [
      { executiveId: "CEO", role: "CEO", position: "approve", reasoning: "Yes", submittedAt: new Date().toISOString() },
    ]});

    const rec = CouncilLearningEngine.recordOutcome(session, "success");
    expect(rec.outcome).toBe("success");
    expect(rec.executiveCount).toBe(1);

    const patterns = CouncilLearningEngine.analyze([session]);
    expect(Array.isArray(patterns)).toBe(true);
  });

  it("should provide stats", async () => {
    const { CouncilLearningEngine } = await import("../../src/executive-council/learning/CouncilLearningEngine");

    CouncilLearningEngine.recordOutcome(makeSession({ id: "s1" }), "success");
    CouncilLearningEngine.recordOutcome(makeSession({ id: "s2" }), "failure");

    const _ = CouncilLearningEngine.analyze([
      makeSession({ id: "s1", status: "resolved" }),
      makeSession({ id: "s2", status: "escalated" }),
    ]);

    const stats = CouncilLearningEngine.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.trackedOutcomes).toBe(2);
  });
});

describe("CouncilLearningProvider", () => {
  it("should provide unified facade", async () => {
    const { CouncilLearningProvider } = await import("../../src/executive-council/learning/CouncilLearningProvider");

    const session = makeSession({ id: "s1" });
    CouncilLearningProvider.recordOutcome(session, "success");

    const outcomes = CouncilLearningProvider.getOutcomes();
    expect(outcomes.length).toBe(1);

    const stats = CouncilLearningProvider.getStats();
    expect(stats.trackedOutcomes).toBe(1);
  });
});

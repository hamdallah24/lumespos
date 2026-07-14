import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { clearDecisions } = await import("../../src/executive-memory/DecisionRecorder");
  const { clearOutcomeLog } = await import("../../src/executive-memory/OutcomeTracker");
  clearDecisions();
  clearOutcomeLog();
});

describe("DecisionRecorder", () => {
  it("should record a decision", async () => {
    const { recordDecision, getDecisionById } = await import("../../src/executive-memory/DecisionRecorder");
    const d = recordDecision({
      executive: "CEO",
      domain: "strategy",
      title: "Market Expansion",
      description: "Expand to new region",
      alternatives: ["Option A", "Option B"],
      selectedOption: "Option A",
    });
    expect(d.id).toBeTruthy();
    expect(d.executive).toBe("CEO");
    expect(d.outcome).toBe("pending");

    const fetched = getDecisionById(d.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe("Market Expansion");
  });

  it("should query decisions by filter", async () => {
    const { recordDecision, queryDecisions } = await import("../../src/executive-memory/DecisionRecorder");
    recordDecision({ executive: "CTO", domain: "technology", title: "Stack Choice", alternatives: ["A", "B"], selectedOption: "A" });
    recordDecision({ executive: "CFO", domain: "finance", title: "Budget Plan", alternatives: ["X", "Y"], selectedOption: "X" });

    const tech = queryDecisions({ domain: "technology" });
    expect(tech.length).toBe(1);
    expect(tech[0].executive).toBe("CTO");

    const cfo = queryDecisions({ executive: "CFO" });
    expect(cfo.length).toBe(1);
  });

  it("should update decision outcome", async () => {
    const { recordDecision, updateDecisionOutcome, getDecisionById } = await import("../../src/executive-memory/DecisionRecorder");
    const d = recordDecision({ executive: "CEO", domain: "strategy", title: "Test", alternatives: [], selectedOption: "X" });
    const updated = updateDecisionOutcome(d.id, "success");
    expect(updated).toBe(true);

    const fetched = getDecisionById(d.id);
    expect(fetched!.outcome).toBe("success");
    expect(fetched!.outcomeUpdatedAt).toBeTruthy();
  });
});

describe("MemoryRecallEngine", () => {
  it("should recall decisions for an executive", async () => {
    const { recordDecision } = await import("../../src/executive-memory/DecisionRecorder");
    const { recallForExecutive } = await import("../../src/executive-memory/MemoryRecallEngine");

    recordDecision({ executive: "COO", domain: "operations", title: "Op1", alternatives: [], selectedOption: "A" });
    recordDecision({ executive: "COO", domain: "operations", title: "Op2", alternatives: [], selectedOption: "B" });

    const recall = recallForExecutive("COO");
    expect(recall.total).toBe(2);
    expect(recall.contextPrompt).toContain("COO");
  });

  it("should build context prompt with outcomes", async () => {
    const { recordDecision, updateDecisionOutcome } = await import("../../src/executive-memory/DecisionRecorder");
    const { recallDecisions } = await import("../../src/executive-memory/MemoryRecallEngine");

    const d1 = recordDecision({ executive: "CEO", domain: "strategy", title: "Good Decision", alternatives: ["A", "B"], selectedOption: "A" });
    const d2 = recordDecision({ executive: "CEO", domain: "strategy", title: "Bad Decision", alternatives: ["C", "D"], selectedOption: "C" });
    updateDecisionOutcome(d1.id, "success");
    updateDecisionOutcome(d2.id, "failure");

    const recall = recallDecisions({ executive: "CEO" });
    expect(recall.contextPrompt).toContain("50%");
  });
});

describe("OutcomeTracker", () => {
  it("should record outcome and adjust confidence", async () => {
    const { recordDecision, getDecisionById } = await import("../../src/executive-memory/DecisionRecorder");
    const { recordOutcome, getOutcomeStats } = await import("../../src/executive-memory/OutcomeTracker");

    const d = recordDecision({ executive: "CEO", domain: "strategy", title: "Test", alternatives: [], selectedOption: "X", confidence: 70 });
    const ok = recordOutcome({ decisionId: d.id, outcome: "failure", notes: "Did not work" });
    expect(ok).toBe(true);

    const fetched = getDecisionById(d.id);
    expect(fetched!.outcome).toBe("failure");
    expect(fetched!.confidence).toBe(50);

    const stats = getOutcomeStats();
    expect(stats.total).toBe(1);
    expect(stats.failure).toBe(1);
    expect(stats.successRate).toBe(0);
  });

  it("should compute outcome stats", async () => {
    const { recordDecision } = await import("../../src/executive-memory/DecisionRecorder");
    const { recordOutcome, getOutcomeStats } = await import("../../src/executive-memory/OutcomeTracker");

    const d1 = recordDecision({ executive: "CEO", domain: "strategy", title: "S1", alternatives: [], selectedOption: "A" });
    const d2 = recordDecision({ executive: "CTO", domain: "technology", title: "S2", alternatives: [], selectedOption: "B" });
    const d3 = recordDecision({ executive: "CFO", domain: "finance", title: "S3", alternatives: [], selectedOption: "C" });

    recordOutcome({ decisionId: d1.id, outcome: "success" });
    recordOutcome({ decisionId: d2.id, outcome: "success" });
    recordOutcome({ decisionId: d3.id, outcome: "failure" });

    const stats = getOutcomeStats();
    expect(stats.total).toBe(3);
    expect(stats.success).toBe(2);
    expect(stats.failure).toBe(1);
    expect(stats.successRate).toBe(67);
  });
});

describe("PatternDetector", () => {
  it("should detect executive tendencies", async () => {
    const { recordDecision } = await import("../../src/executive-memory/DecisionRecorder");
    const { detectPatterns } = await import("../../src/executive-memory/PatternDetector");

    for (let i = 0; i < 5; i++) {
      recordDecision({ executive: "CTO", domain: "technology", title: `Tech ${i}`, alternatives: ["X", "Y"], selectedOption: "X" });
    }
    recordDecision({ executive: "CTO", domain: "operations", title: "Op", alternatives: ["A", "B"], selectedOption: "A" });

    const patterns = detectPatterns();
    const techTendency = patterns.find((p) => p.label.includes("CTO") && p.label.includes("technology"));
    expect(techTendency).toBeDefined();
    expect(techTendency!.triggerCount).toBeGreaterThanOrEqual(5);
  });

  it("should detect domain outcome patterns", async () => {
    const { recordDecision } = await import("../../src/executive-memory/DecisionRecorder");
    const { recordOutcome } = await import("../../src/executive-memory/OutcomeTracker");
    const { detectPatterns } = await import("../../src/executive-memory/PatternDetector");

    for (let i = 0; i < 4; i++) {
      const d = recordDecision({ executive: "CEO", domain: "governance", title: `Gov ${i}`, alternatives: ["X", "Y"], selectedOption: "X" });
      recordOutcome({ decisionId: d.id, outcome: "failure" });
    }

    const patterns = detectPatterns();
    const govPattern = patterns.find((p) => p.type === "domain_outcome" && p.label.includes("governance"));
    expect(govPattern).toBeDefined();
  });

  it("should detect recurring decisions", async () => {
    const { recordDecision } = await import("../../src/executive-memory/DecisionRecorder");
    const { detectPatterns } = await import("../../src/executive-memory/PatternDetector");

    for (let i = 0; i < 4; i++) {
      recordDecision({ executive: "COO", domain: "operations", title: `Reorder ${i}`, alternatives: ["Vendor A", "Vendor B"], selectedOption: "Vendor A" });
    }

    const patterns = detectPatterns();
    const recurring = patterns.find((p) => p.type === "recurring_decision" && p.label.includes("Vendor A"));
    expect(recurring).toBeDefined();
    expect(recurring!.triggerCount).toBe(4);
  });
});

describe("ExecutiveMemoryProvider", () => {
  it("should provide unified facade", async () => {
    const { ExecutiveMemoryProvider } = await import("../../src/executive-memory/ExecutiveMemoryProvider");

    ExecutiveMemoryProvider.recordDecision({ executive: "CEO", domain: "strategy", title: "Decision 1", alternatives: ["A", "B"], selectedOption: "A" });
    ExecutiveMemoryProvider.recordDecision({ executive: "CTO", domain: "technology", title: "Decision 2", alternatives: ["C", "D"], selectedOption: "C" });

    const all = ExecutiveMemoryProvider.getAllDecisions();
    expect(all.length).toBe(2);

    const recall = ExecutiveMemoryProvider.recall({ executive: "CEO" });
    expect(recall.total).toBe(1);

    const stats = ExecutiveMemoryProvider.getStats();
    expect(stats.totalDecisions).toBe(2);
    expect(stats.byExecutive["CEO"]).toBe(1);

    const patterns = ExecutiveMemoryProvider.detectPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(0);
  });

  it("should initialize without error", async () => {
    const { initializeExecutiveMemory } = await import("../../src/executive-memory");
    expect(() => initializeExecutiveMemory()).not.toThrow();
  });
});

import { describe, it, expect, beforeEach } from "vitest";

beforeEach(async () => {
  const { clearProposals } = await import("../../src/self-evolution/EvolutionProposalManager");
  clearProposals();
});

describe("EvolutionProposalManager", () => {
  it("should create and retrieve a proposal", async () => {
    const { createProposal, getProposal } = await import("../../src/self-evolution/EvolutionProposalManager");

    const p = createProposal({
      title: "Refactor Auth",
      description: "Migrate to JWT-based auth",
      proposedAction: "refactor",
      target: "src/auth",
      rationale: "Security improvements needed",
      risk: "medium",
      tags: ["security", "auth"],
    });

    expect(p.id).toBeTruthy();
    expect(p.title).toBe("Refactor Auth");
    expect(p.status).toBe("proposed");
    expect(p.tags).toContain("security");

    const fetched = getProposal(p.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe("Refactor Auth");
  });

  it("should approve and reject proposals", async () => {
    const { createProposal, approveProposal, rejectProposal, getProposal } = await import("../../src/self-evolution/EvolutionProposalManager");

    const p1 = createProposal({ title: "T1", description: "D1", proposedAction: "create_doc", target: "doc.md", rationale: "Need doc", risk: "low" });
    const p2 = createProposal({ title: "T2", description: "D2", proposedAction: "update_doc", target: "doc2.md", rationale: "Update needed", risk: "low" });

    const approved = approveProposal(p1.id);
    expect(approved).toBeDefined();
    expect(approved!.status).toBe("approved");
    expect(approved!.approvedBy).toBe("Founder");

    const rejected = rejectProposal(p2.id);
    expect(rejected).toBeDefined();
    expect(rejected!.status).toBe("rejected");

    expect(getProposal(p1.id)!.status).toBe("approved");
    expect(getProposal(p2.id)!.status).toBe("rejected");
  });

  it("should mark as implemented", async () => {
    const { createProposal, approveProposal, markImplemented, getProposal } = await import("../../src/self-evolution/EvolutionProposalManager");

    const p = createProposal({ title: "T", description: "D", proposedAction: "refactor", target: "x.ts", rationale: "Fix", risk: "high" });
    approveProposal(p.id);
    const implemented = markImplemented(p.id);
    expect(implemented).toBeDefined();
    expect(implemented!.status).toBe("implemented");
  });

  it("should list pending proposals", async () => {
    const { createProposal, getPendingProposals } = await import("../../src/self-evolution/EvolutionProposalManager");

    createProposal({ title: "P1", description: "D1", proposedAction: "create_doc", target: "a.md", rationale: "R1", risk: "low" });
    createProposal({ title: "P2", description: "D2", proposedAction: "update_doc", target: "b.md", rationale: "R2", risk: "medium" });

    expect(getPendingProposals().length).toBe(2);
  });
});

describe("EvolutionMetricsTracker", () => {
  it("should compute metrics", async () => {
    const { createProposal, approveProposal, markImplemented } = await import("../../src/self-evolution/EvolutionProposalManager");
    const { computeEvolutionMetrics } = await import("../../src/self-evolution/EvolutionMetricsTracker");

    const p1 = createProposal({ title: "T1", description: "D1", proposedAction: "create_doc", target: "a.md", rationale: "R1", risk: "low" });
    const p2 = createProposal({ title: "T2", description: "D2", proposedAction: "refactor", target: "b.ts", rationale: "R2", risk: "high" });

    approveProposal(p1.id);
    markImplemented(p1.id);

    const metrics = computeEvolutionMetrics();
    expect(metrics.totalProposals).toBe(2);
    expect(metrics.approved).toBe(0);
    expect(metrics.implemented).toBe(1);
    expect(metrics.pending).toBe(1);
    expect(metrics.approvalRate).toBeGreaterThan(0);
  });
});

describe("EvolutionEngine", () => {
  it("should manage full lifecycle", async () => {
    const { EvolutionEngine } = await import("../../src/self-evolution/EvolutionEngine");

    const p = EvolutionEngine.propose({
      title: "Refactor Engine",
      description: "Refactor the evolution engine",
      proposedAction: "refactor",
      target: "src/engine",
      rationale: "Performance",
      risk: "high",
      tags: ["performance"],
    });

    expect(p.status).toBe("proposed");

    EvolutionEngine.approve(p.id);
    expect(EvolutionEngine.get(p.id)!.status).toBe("approved");

    EvolutionEngine.implement(p.id);
    expect(EvolutionEngine.get(p.id)!.status).toBe("implemented");

    const metrics = EvolutionEngine.getMetrics();
    expect(metrics.totalProposals).toBe(1);
    expect(metrics.implemented).toBe(1);
  });
});

describe("SelfEvolutionProvider", () => {
  it("should provide unified facade", async () => {
    const { SelfEvolutionProvider } = await import("../../src/self-evolution/SelfEvolutionProvider");

    const p = SelfEvolutionProvider.propose({
      title: "Facade Test",
      description: "Test",
      proposedAction: "create_doc",
      target: "test.md",
      rationale: "Test",
      risk: "low",
    });

    expect(p.title).toBe("Facade Test");

    SelfEvolutionProvider.approve(p.id);
    expect(SelfEvolutionProvider.getProposal(p.id)!.status).toBe("approved");

    SelfEvolutionProvider.implement(p.id);

    const all = SelfEvolutionProvider.getAll();
    expect(all.length).toBe(1);

    const metrics = SelfEvolutionProvider.getMetrics();
    expect(metrics.totalProposals).toBe(1);
  });

  it("should initialize without error", async () => {
    const { initializeSelfEvolution } = await import("../../src/self-evolution");
    expect(() => initializeSelfEvolution()).not.toThrow();
  });
});

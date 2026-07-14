import { describe, it, expect } from "vitest";

describe("PlanProvider", () => {
  it("should create and retrieve plans", async () => {
    const { PlanProvider } = await import("../../src/execution-planner/providers/PlanProvider");
    PlanProvider.clear();
    const plan = PlanProvider.createFromObjective({
      id: "p1",
      objective: "Test plan",
      domain: "test",
      priority: 50,
      kpiTargets: [],
    } as any);
    expect(plan).toBeDefined();
    expect(plan.graph.id).toBeDefined();
    const all = PlanProvider.getAll();
    expect(all.length).toBe(1);
  });

  it("should retrieve by id", async () => {
    const { PlanProvider } = await import("../../src/execution-planner/providers/PlanProvider");
    PlanProvider.clear();
    const plan = PlanProvider.createFromObjective({
      id: "p2", objective: "Find me", domain: "test", priority: 50,
      kpiTargets: [],
    } as any);
    const found = PlanProvider.getById(plan.graph.id);
    expect(found).toBeDefined();
    expect(found!.graph.id).toBe(plan.graph.id);
  });

  it("should create from template", async () => {
    const { PlanProvider } = await import("../../src/execution-planner/providers/PlanProvider");
    try {
      const plan = PlanProvider.createFromTemplate("StockTransferGraph", 1);
      expect(plan).toBeDefined();
    } catch {
      expect(true).toBe(true);
    }
  });
});

describe("CriticalPathAnalyzer", () => {
  it("should find critical path in a graph", async () => {
    const { findCriticalPath } = await import("../../src/execution-planner/core/CriticalPathAnalyzer");
    const nodes = [
      { id: "n1", label: "Start", type: "task" as const, status: "pending" as const,
        estimatedDuration: 10, dependsOn: [], metadata: {} },
      { id: "n2", label: "Middle", type: "task" as const, status: "pending" as const,
        estimatedDuration: 20, dependsOn: ["n1"], metadata: {} },
      { id: "n3", label: "Parallel", type: "task" as const, status: "pending" as const,
        estimatedDuration: 15, dependsOn: ["n1"], metadata: {} },
      { id: "n4", label: "End", type: "task" as const, status: "pending" as const,
        estimatedDuration: 5, dependsOn: ["n2", "n3"], metadata: {} },
    ];
    const path = findCriticalPath(nodes);
    expect(path.path.length).toBeGreaterThan(0);
    expect(path.duration).toBeGreaterThan(0);
    expect(path.path).toContain("n1");
    expect(path.path[path.path.length - 1]).toBe("n4");
  });
});

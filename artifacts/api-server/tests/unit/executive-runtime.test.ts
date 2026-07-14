import { describe, it, expect } from "vitest";

describe("BriefGenerator", () => {
  it("should generate an executive brief", async () => {
    const { BriefGenerator } = await import("../../src/executive-runtime/core/BriefGenerator");
    const brief = BriefGenerator.generate({
      role: "COO",
      situations: [],
      objectives: [],
      plans: [],
      knowledge: [],
    });
    expect(brief).toBeDefined();
    expect(brief.role).toBe("COO");
    expect(brief.id).toContain("BRIEF-");
    expect(brief.actionItems).toEqual([]);
  });

  it("should include critical situations in pending approvals", async () => {
    const { BriefGenerator } = await import("../../src/executive-runtime/core/BriefGenerator");
    const brief = BriefGenerator.generate({
      role: "COO",
      situations: [{ id: "sit-1", title: "Stock Critical", severity: "critical", description: "test", domain: "inventory", detectedAt: new Date(), facts: [], candidateDecisions: [] } as any],
      objectives: [],
      plans: [],
      knowledge: [],
    });
    expect(brief.pendingApprovals.length).toBeGreaterThan(0);
    expect(brief.pendingApprovals[0]).toContain("Stock Critical");
  });
});

describe("CEORuntime", () => {
  it("should export ceoRuntime with required interface", async () => {
    const { ceoRuntime } = await import("../../src/executive-runtime/executives/CEO");
    expect(ceoRuntime).toBeDefined();
    expect(ceoRuntime.name).toBe("CEORuntime");
    expect(typeof ceoRuntime.execute).toBe("function");
    expect(typeof ceoRuntime.health).toBe("function");
  });

  it("should return health status", async () => {
    const { ceoRuntime } = await import("../../src/executive-runtime/executives/CEO");
    const h = ceoRuntime.health();
    expect(h.status).toBe("healthy");
  });
});

describe("CTORuntime", () => {
  it("should export ctoProgram with required interface", async () => {
    const { ctoProgram } = await import("../../src/executive-runtime/executives/CTO");
    expect(ctoProgram).toBeDefined();
    expect(ctoProgram.name).toBe("CTOProgram");
    expect(typeof ctoProgram.execute).toBe("function");
    expect(typeof ctoProgram.health).toBe("function");
  });

  it("should have 15-stage pipeline configured", async () => {
    const { ctoProgram } = await import("../../src/executive-runtime/executives/CTO");
    const h = ctoProgram.health();
    expect(h.custom.kernelServicesUsed).toBe(15);
  });
});

describe("SubExecutives", () => {
  it("should export CFO runtime", async () => {
    const { cfoRuntime } = await import("../../src/executive-runtime/executives/CFO");
    expect(cfoRuntime).toBeDefined();
    expect(cfoRuntime.name).toBe("CFORuntime");
    expect(typeof cfoRuntime.execute).toBe("function");
  });

  it("should export CMO runtime", async () => {
    const { cmoRuntime } = await import("../../src/executive-runtime/executives/CMO");
    expect(cmoRuntime).toBeDefined();
    expect(cmoRuntime.name).toBe("CMORuntime");
  });

  it("should export CAIO runtime", async () => {
    const { caioRuntime } = await import("../../src/executive-runtime/executives/CAIO");
    expect(caioRuntime).toBeDefined();
    expect(caioRuntime.name).toBe("CAIORuntime");
  });

  it("should export CKO runtime", async () => {
    const { ckoRuntime } = await import("../../src/executive-runtime/executives/CKO");
    expect(ckoRuntime).toBeDefined();
    expect(ckoRuntime.name).toBe("CKORuntime");
  });
});

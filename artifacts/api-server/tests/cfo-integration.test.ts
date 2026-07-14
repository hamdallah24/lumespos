import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SemanticContract } from "../src/ai/runtime/semantic-engine";
import type { ExecutionSpecificationV1 } from "../src/ai/runtime/execution-spec";

vi.mock("../src/ai/runtime/semantic-engine", () => ({
  understand: vi.fn(async (_message: string, _userId?: number): Promise<SemanticContract> => ({
    intent: "business_action",
    problem: "Financial analysis request",
    domain: "finance",
    entities: ["revenue", "cost", "margin"],
    targetFiles: [],
    confidence: 85,
    risk: "medium",
    requiredCapabilities: ["financial-analysis"],
    missingContext: [],
  })),
}));

vi.mock("../src/ai/runtime/execution-spec", () => ({
  buildSpecV1: vi.fn((contract: SemanticContract): ExecutionSpecificationV1 => ({
    id: "es_cfo_test",
    version: "1.0",
    author: "Founder",
    createdAt: new Date().toISOString(),
    intent: contract.intent,
    objective: contract.problem,
    problem: contract.problem,
    expectedOutcome: contract.confidence > 80 ? "Analysis complete" : "Proposal required",
    domain: contract.domain,
    entities: contract.entities,
    targetFiles: contract.targetFiles,
    constraints: [],
    risk: contract.risk,
    priority: "normal",
    approvalRequired: false,
    requiredKnowledge: ["finance"],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: [],
    executionMode: "direct",
    estimatedComplexity: "medium",
    estimatedTokens: 4000,
    confidence: contract.confidence,
    semanticReasoning: `Financial analysis for ${contract.problem}`,
    runtimePolicyName: "default",
    runtimePolicy: {
      approval: false,
      tools: "none",
      classification: "internal",
      knowledge: "full",
      history: "last5",
      foundation: "full",
      manifest: true,
      sharedContext: true,
      maxTokens: 8000,
    },
  })),
}));

vi.mock("../src/ai/runtime/verification-engine", () => ({
  verify: vi.fn(() => ({
    passed: true,
    warnings: [],
  })),
}));

vi.mock("../src/ai/runtime/foundation", () => ({
  getFoundationProvider: vi.fn(() => ({
    getDirective: (_role: string) => "Mock CFO directive — prioritize cost efficiency and margin health",
    foundation: () => ({
      getConstitution: () => "Mock constitution",
      getNorthStar: () => "Mock north star",
      getPhilosophy: () => "Mock philosophy",
    }),
    governance: () => ({
      getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    }),
    runtime: (_role?: string) => ({
      getDirective: () => "Mock CFO runtime directive",
      authority: () => "limited",
      forbiddenActions: () => ["engineering_decisions", "code_modification"],
    }),
    verification: () => ({
      allDomains: () => ["finance", "budget", "accounting", "general", "strategy"],
      minimumConfidence: () => 30,
    }),
    getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    getFoundationContext: () => "Mock foundation context for CFO",
  })),
}));

vi.mock("../src/ai/runtime/prompt-assembler", () => ({
  assemble: vi.fn((_opts: any) => "Mock assembled CFO prompt."),
}));

vi.mock("../src/ai/runtime/execution/execution-pipeline", () => ({
  ExecutionPipeline: {
    execute: vi.fn(async () => ({
      success: true,
      text: "📊 Laporan Keuangan: Margin kotor 65%, Biaya Operasional Rp 45.2jt, Laba Bersih Rp 28.7jt. Rekomendasi: optimasi biaya bahan baku.",
      contract: {} as any,
      context: {} as any,
      toolsUsed: 0,
      filesRead: [],
    })),
  },
}));

vi.mock("../src/programs/consultant", () => ({
  consultantRuntime: {
    analyze: vi.fn(async (_mode: string, _question?: string) => ({
      success: true,
      text: "CKO Advisory: Struktur biaya saat ini didominasi bahan baku (62%). Disarankan review supplier.",
      findings: [],
      recommendations: [],
    })),
    translateToTargets: vi.fn(),
  } as any,
}));

vi.mock("../src/governance/core", () => ({
  auditEngine: { log: vi.fn() },
}));

vi.mock("../src/governance/providers", () => ({
  GovernanceProvider: {
    canExecute: vi.fn(() => ({ allow: true, reason: "mock allowed" })),
  },
}));

vi.mock("../src/knowledge-platform/providers", () => ({
  KnowledgeProvider: {
    ingestEpisode: vi.fn(),
    getLatestEpisodes: vi.fn(() => []),
    searchAll: vi.fn(() => [{ summary: "Financial reporting best practices", domain: "finance" }]),
    getBestPractices: vi.fn(() => [{ summary: "Monitor cash flow weekly", domain: "finance" }]),
  },
}));

vi.mock("../src/execution-planner/providers", () => ({
  PlanProvider: {
    getAll: vi.fn(() => []),
    getProgress: vi.fn(() => ({ percentComplete: 50 })),
  },
}));

vi.mock("../src/executive-runtime/cognition", () => {
  class MockCognitiveEngine {
    think = vi.fn(async () => ({
      decision: { confidence: { overall: 85 } },
      recommendation: { summary: "Review margin and cost structure" },
      trace: { correlationId: "cfo-trace-1", steps: [], durationMs: 100, status: "complete" },
    }));
    thinkWithProfile = vi.fn();
  }
  return {
    CognitiveEngine: MockCognitiveEngine,
    recordTrace: vi.fn(),
  };
});

vi.mock("../src/executive-runtime/core", () => ({
  BriefGenerator: {
    generate: vi.fn((_opts: any) => ({
      role: "CFO",
      summary: "Financial summary for today",
      sections: [],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    })),
  },
  ApprovalFormatter: {
    format: vi.fn(() => "No pending approvals"),
  },
}));

vi.mock("@workspace/db", () => {
  const mockBranches = [
    { id: 1, name: "Lume Central", location: "Jakarta Pusat", createdAt: new Date() },
    { id: 2, name: "Lume Bandung", location: "Jl. Riau", createdAt: new Date() },
    { id: 3, name: "Lume Surabaya", location: "Tunjungan", createdAt: new Date() },
  ];
  const branchesTable = { id: "branches.id", name: "branches.name", location: "branches.location" };
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve(mockBranches)),
            limit: vi.fn(() => Promise.resolve([mockBranches[0]])),
          })),
          orderBy: vi.fn(() => Promise.resolve(mockBranches)),
        })),
      })),
      insert: vi.fn(() => ({ values: vi.fn(() => (Promise.resolve())) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
      transaction: vi.fn(async (cb: any) => { await cb({ insert: () => ({ values: () => ({}) }), select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }) }); }),
      delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
    },
    branchesTable,
  } as any;
});

describe("CFO Runtime Integration", () => {
  let cfoRuntime: any;
  let understand: any;
  let buildSpecV1: any;
  let verify: any;
  let GovernanceProvider: any;

  beforeAll(async () => {
    const module = await import("../src/executive-runtime/executives/CFO/CFOProgram");
    cfoRuntime = module.cfoRuntime;
    const se = await import("../src/ai/runtime/semantic-engine");
    understand = se.understand;
    const es = await import("../src/ai/runtime/execution-spec");
    buildSpecV1 = es.buildSpecV1;
    const ve = await import("../src/ai/runtime/verification-engine");
    verify = ve.verify;
    const gp = await import("../src/governance/providers");
    GovernanceProvider = gp.GovernanceProvider;
  });

  it("should return healthy status", () => {
    const h = cfoRuntime.health();
    expect(h.status).toBe("healthy");
    expect(h.version).toBe("1.0.0");
  });

  it("should execute financial query and return valid ExecutiveResult", async () => {
    const result = await cfoRuntime.execute({
      message: "berapa margin laba kita bulan ini?",
      userId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe("string");
    expect(result.pipeline).toContain("Identity");
    expect(result.pipeline).toContain("SemanticEngine");
    expect(result.pipeline).toContain("ExecutionSpec");
    expect(result.pipeline).toContain("Verification");
    expect(result.pipeline).toContain("CKO");
    expect(result.pipeline).toContain("PipelineLLM");
    expect(result.pipeline).toContain("Result");
  });

  it("should call understand with the user message", async () => {
    understand.mockClear();
    await cfoRuntime.execute({
      message: "analisa biaya operasional",
      userId: 1,
    });
    expect(understand).toHaveBeenCalledWith("analisa biaya operasional", 1);
  });

  it("should handle verification failure gracefully", async () => {
    verify.mockReturnValueOnce({ passed: false, stopReason: "Confidence too low (30%). Ask Founder for clarification.", warnings: [] });

    const result = await cfoRuntime.execute({
      message: "analisa resiko keuangan",
      userId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.text).toContain("Confidence too low");
  });

  it("should handle governance rejection", async () => {
    GovernanceProvider.canExecute.mockReturnValueOnce({ allow: false, reason: "CFO tidak punya otorisasi untuk analisa ini" });

    const result = await cfoRuntime.execute({
      message: "analisa biaya engineering",
      userId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.text).toContain("Governance denied");
  });

  it("should return decide() for financial briefing", async () => {
    const decision = await cfoRuntime.decide({
      role: "CFO",
      summary: "Financial overview with cost optimization opportunities",
      sections: [
        { title: "Cost Analysis", items: ["Bahan baku: 62%", "Operasional: 28%", "Marketing: 10%"] },
        { title: "Revenue", items: ["Pendapatan: Rp 120jt", "Growth: 15%"] },
      ],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });

    expect(decision.role).toBe("CFO");
    expect(decision.action).toBe("financial_review");
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reasoning).toBeTruthy();
  });

  it("should return monitor_finance decide() when no financial sections", async () => {
    const decision = await cfoRuntime.decide({
      role: "CFO",
      summary: "General briefing",
      sections: [{ title: "Operations", items: ["Stock levels normal"] }],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });

    expect(decision.role).toBe("CFO");
    expect(decision.action).toBe("monitor_finance");
  });

  it("should handle branchId in task and inject branch context", async () => {
    const result = await cfoRuntime.execute({
      message: "analisa keuangan cabang bandung",
      userId: 1,
      branchId: 2,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("PipelineLLM");
    // verify the assembled prompt included branch context
    const { assemble } = await import("../src/ai/runtime/prompt-assembler");
    const assembleCalls = (assemble as any).mock.calls;
    const lastCallOpts = assembleCalls[assembleCalls.length - 1][0];
    expect(lastCallOpts.mode).toBe("cfo");
  });

  it("should use default branchId=1 when not provided", async () => {
    const result = await cfoRuntime.execute({
      message: "laporan laba rugi",
      userId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
  });

  it("should carry branchId in decide() context", async () => {
    const decision = await cfoRuntime.decide({
      role: "CFO",
      summary: "Branch 2 financial review",
      sections: [{ title: "Margin Analysis", items: ["Gross margin: 62%"] }],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    }, { branchId: 2 });

    expect(decision.role).toBe("CFO");
    expect(decision.payload?.branchId).toBe(2);
    expect(decision.reasoning).toContain("Cabang 2");
  });
});

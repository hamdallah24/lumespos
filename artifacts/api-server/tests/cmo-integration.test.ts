import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SemanticContract } from "../src/ai/runtime/semantic-engine";
import type { ExecutionSpecificationV1 } from "../src/ai/runtime/execution-spec";

vi.mock("../src/ai/runtime/semantic-engine", () => ({
  understand: vi.fn(async (_message: string, _userId?: number): Promise<SemanticContract> => ({
    intent: "business_action",
    problem: "Marketing analysis request",
    domain: "marketing",
    entities: ["campaign", "customer", "sales"],
    targetFiles: [],
    confidence: 85,
    risk: "medium",
    requiredCapabilities: ["market-analysis"],
    missingContext: [],
  })),
}));

vi.mock("../src/ai/runtime/execution-spec", () => ({
  buildSpecV1: vi.fn((contract: SemanticContract): ExecutionSpecificationV1 => ({
    id: "es_cmo_test",
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
    requiredKnowledge: ["marketing"],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: [],
    executionMode: "direct",
    estimatedComplexity: "medium",
    estimatedTokens: 4000,
    confidence: contract.confidence,
    semanticReasoning: `Marketing analysis for ${contract.problem}`,
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
  verify: vi.fn(() => ({ passed: true, warnings: [] })),
}));

vi.mock("../src/ai/runtime/foundation", () => ({
  getFoundationProvider: vi.fn(() => ({
    getDirective: (_role: string) => "Mock CMO directive — tingkatkan brand awareness dan customer engagement",
    foundation: () => ({
      getConstitution: () => "Mock constitution",
      getNorthStar: () => "Mock north star",
      getPhilosophy: () => "Mock philosophy",
    }),
    governance: () => ({
      getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    }),
    runtime: (_role?: string) => ({
      getDirective: () => "Mock CMO runtime directive",
      authority: () => "limited",
      forbiddenActions: () => ["inventory_management", "production_planning"],
    }),
    verification: () => ({
      allDomains: () => ["marketing", "customer", "sales", "general", "strategy"],
      minimumConfidence: () => 30,
    }),
    getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    getFoundationContext: () => "Mock foundation context for CMO",
  })),
}));

vi.mock("../src/ai/runtime/prompt-assembler", () => ({
  assemble: vi.fn((_opts: any) => "Mock assembled CMO prompt."),
}));

vi.mock("../src/ai/llm/llm-adapter", () => ({
  callDeepSeek: vi.fn(async (_prompt: string, _msg: string, _userId: number, _mode: string, _tokens: number, _tools: boolean) =>
    "📈 Analisa Marketing: Campaign performa 78% | Customer acquisition +12% MoM | Top produk: Es Kopi, Thai Tea. Rekomendasi: tingkatkan promosi Thai Tea di sosial media."
  ),
}));

vi.mock("../src/operational-truth", () => ({
  OperationalTruthProvider: {
    getMarketingContext: vi.fn(async () => ({
      todaySales: { total: 0, count: 0, period: "today", branchId: 1 },
      topProducts: [],
      products: [],
      branches: [{ id: 1, name: "Lume Central", location: "Jakarta Pusat" }],
      timestamp: new Date().toISOString(),
      source: "mock",
      confidence: 100,
      missingDomains: [],
      errors: [],
      version: 1,
      rawTexts: {},
    })),
    getBranchContextString: vi.fn(async (_branchId: number) => "## Context Cabang\n- Lume Central\n- Lume Bandung"),
  },
}));

vi.mock("../src/programs/consultant", () => ({
  consultantRuntime: {
    analyze: vi.fn(async (_mode: string, _question?: string) => ({
      success: true,
      text: "CKO Advisory: Tren pasar menunjukkan peningkatan permintaan minuman berbasis susu. Disarankan campaign targeting anak muda.",
      findings: [],
      recommendations: [],
    })),
    translateToTargets: vi.fn(),
  } as any,
}));

vi.mock("../src/governance/core", () => ({
  auditEngine: { log: vi.fn() },
}));

vi.mock("../src/knowledge-platform/providers", () => ({
  KnowledgeProvider: {
    ingestEpisode: vi.fn(),
    getLatestEpisodes: vi.fn(() => []),
    searchAll: vi.fn(() => []),
    getBestPractices: vi.fn(() => []),
  },
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
    searchAll: vi.fn(() => [{ summary: "Marketing campaign best practices", domain: "marketing" }]),
    getBestPractices: vi.fn(() => [{ summary: "Run promo bundling untuk meningkatkan average order", domain: "marketing" }]),
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
      decision: { confidence: { overall: 75 } },
      recommendation: { summary: "Review campaign performance and customer trends" },
      trace: { correlationId: "cmo-trace-1", steps: [], durationMs: 100, status: "complete" },
    }));
    thinkWithProfile = vi.fn();
  }
  return { CognitiveEngine: MockCognitiveEngine, recordTrace: vi.fn() };
});

vi.mock("../src/executive-runtime/core", () => ({
  BriefGenerator: {
    generate: vi.fn((_opts: any) => ({
      role: "CMO",
      summary: "Marketing performance summary",
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

describe("CMO Runtime Integration", () => {
  let cmoRuntime: any;
  let understand: any;
  let verify: any;
  let GovernanceProvider: any;

  beforeAll(async () => {
    const module = await import("../src/executive-runtime/executives/CMO/CMOProgram");
    cmoRuntime = module.cmoRuntime;
    const se = await import("../src/ai/runtime/semantic-engine");
    understand = se.understand;
    const ve = await import("../src/ai/runtime/verification-engine");
    verify = ve.verify;
    const gp = await import("../src/governance/providers");
    GovernanceProvider = gp.GovernanceProvider;
  });

  const userMessages = [
    "gimana performa campaign marketing kita bulan ini?",
    "analisa tren produk yang lagi naik",
    "buat strategi promo untuk increasing average order value",
    "customer insight untuk cabang bandung",
    "apa yang lagi trend di pasar minuman kekinian?",
    "review campaign social media kita",
  ] as const;

  it("should return healthy status", () => {
    const h = cmoRuntime.health();
    expect(h.status).toBe("healthy");
    expect(h.version).toBe("1.0.0");
  });

  it.each(userMessages)("should process user message: '%s'", async (msg) => {
    const result = await cmoRuntime.execute({ message: msg, userId: 1 });
    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe("string");
  });

  it("should call understand with the user message", async () => {
    understand.mockClear();
    await cmoRuntime.execute({ message: "analisa customer segments", userId: 1 });
    expect(understand).toHaveBeenCalledWith("analisa customer segments", 1);
  });

  it("should handle verification failure", async () => {
    verify.mockReturnValueOnce({ passed: false, stopReason: "Confidence too low. Ask Founder.", warnings: [] });
    const result = await cmoRuntime.execute({ message: "analisa resiko campaign", userId: 1 });
    expect(result.success).toBe(false);
    expect(result.text).toContain("Confidence too low");
  });

  it("should handle governance rejection", async () => {
    GovernanceProvider.canExecute.mockReturnValueOnce({ allow: false, reason: "CMO tidak punya otorisasi" });
    const result = await cmoRuntime.execute({ message: "atur stok produk", userId: 1 });
    expect(result.success).toBe(false);
    expect(result.text).toContain("Governance denied");
  });

  it("should return decide() with action items", async () => {
    const decision = await cmoRuntime.decide({
      role: "CMO",
      summary: "Marketing review with pending campaigns",
      sections: [],
      pendingApprovals: [],
      actionItems: [{ id: "ai-1", title: "Review campaign budget", priority: "high" }],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });
    expect(decision.role).toBe("CMO");
    expect(decision.action).toBe("market_analysis");
    expect(decision.confidence).toBeGreaterThan(0);
  });

  it("should return monitor_market when no action items", async () => {
    const decision = await cmoRuntime.decide({
      role: "CMO",
      summary: "General briefing",
      sections: [],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });
    expect(decision.role).toBe("CMO");
    expect(decision.action).toBe("monitor_market");
  });

  it("should handle branchId in marketing query", async () => {
    const result = await cmoRuntime.execute({
      message: "customer insight untuk cabang bandung",
      userId: 1,
      branchId: 2,
    });
    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("MarketingContext");
  });

  it("should default to branchId=1 when not provided", async () => {
    const result = await cmoRuntime.execute({
      message: "gimana tren pasar kita?",
      userId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("should carry branchId in decide() context", async () => {
    const decision = await cmoRuntime.decide({
      role: "CMO",
      summary: "Branch 2 campaign review",
      sections: [],
      pendingApprovals: [],
      actionItems: [{ id: "ai-1", title: "Review promo", priority: "high" }],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    }, { branchId: 2 });
    expect(decision.role).toBe("CMO");
    expect(decision.payload?.branchId).toBe(2);
    expect(decision.reasoning).toContain("Cabang 2");
  });

  describe("pipeline stages", () => {
    it.each([
      ["gimana performa campaign marketing kita bulan ini?"],
      ["analisa tren produk yang lagi naik"],
      ["buat strategi promo untuk increasing average order value"],
    ])("should have complete pipeline for '%s'", async (msg) => {
      const result = await cmoRuntime.execute({ message: msg, userId: 1 });
      expect(result.pipeline).toContain("Identity");
      expect(result.pipeline).toContain("SemanticEngine");
      expect(result.pipeline).toContain("ExecutionSpec");
      expect(result.pipeline).toContain("Verification");
      expect(result.pipeline).toContain("CKO");
      expect(result.pipeline).toContain("MarketingContext");
      expect(result.pipeline).toContain("LLM");
      expect(result.pipeline).toContain("Result");
    });
  });
});

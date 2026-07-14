import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SemanticContract } from "../src/ai/runtime/semantic-engine";
import type { ExecutionSpecificationV1 } from "../src/ai/runtime/execution-spec";

vi.mock("../src/ai/runtime/semantic-engine", () => ({
  understand: vi.fn(async (_message: string, _userId?: number): Promise<SemanticContract> => ({
    intent: "business_action",
    problem: "HR analysis request",
    domain: "hr",
    entities: ["personnel", "shift", "staff"],
    targetFiles: [],
    confidence: 85,
    risk: "medium",
    requiredCapabilities: ["hr-analysis"],
    missingContext: [],
  })),
}));

vi.mock("../src/ai/runtime/execution-spec", () => ({
  buildSpecV1: vi.fn((contract: SemanticContract): ExecutionSpecificationV1 => ({
    id: "es_chro_test",
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
    requiredKnowledge: ["hr"],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: [],
    executionMode: "direct",
    estimatedComplexity: "medium",
    estimatedTokens: 4000,
    confidence: contract.confidence,
    semanticReasoning: `HR analysis for ${contract.problem}`,
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
    getDirective: (_role: string) => "Mock CHRO directive — optimalkan SDM dan jadwal shift",
    foundation: () => ({
      getConstitution: () => "Mock constitution",
      getNorthStar: () => "Mock north star",
      getPhilosophy: () => "Mock philosophy",
    }),
    governance: () => ({
      getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    }),
    runtime: (_role?: string) => ({
      getDirective: () => "Mock CHRO runtime directive",
      authority: () => "limited",
      forbiddenActions: () => ["inventory_management", "financial_decisions"],
    }),
    verification: () => ({
      allDomains: () => ["hr", "personnel", "scheduling", "general", "strategy"],
      minimumConfidence: () => 30,
    }),
    getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    getFoundationContext: () => "Mock foundation context for CHRO",
  })),
}));

vi.mock("../src/ai/runtime/prompt-assembler", () => ({
  assemble: vi.fn((_opts: any) => "Mock assembled CHRO prompt."),
}));

vi.mock("../src/ai/runtime/execution/execution-pipeline", () => ({
  ExecutionPipeline: {
    execute: vi.fn(async () => ({
      success: true,
      text: "👥 Laporan SDM: Total karyawan 24 | Shift hari ini 8 staff | Kehadiran 92% | Jadwal minggu ini sudah lengkap. Rekomendasi: tambah 2 staff untuk shift malam.",
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
      text: "CKO Advisory: Retensi karyawan 85%. Disarankan review benefit dan jenjang karir.",
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
    searchAll: vi.fn(() => [{ summary: "HR shift management best practices", domain: "hr" }]),
    getBestPractices: vi.fn(() => [{ summary: "Rotasi shift setiap 2 minggu untuk menjaga produktivitas", domain: "hr" }]),
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
      decision: { confidence: { overall: 80 } },
      recommendation: { summary: "Review staffing levels and shift coverage" },
      trace: { correlationId: "chro-trace-1", steps: [], durationMs: 100, status: "complete" },
    }));
    thinkWithProfile = vi.fn();
  }
  return { CognitiveEngine: MockCognitiveEngine, recordTrace: vi.fn() };
});

vi.mock("../src/executive-runtime/core", () => ({
  BriefGenerator: {
    generate: vi.fn((_opts: any) => ({
      role: "CHRO",
      summary: "HR summary for today",
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

describe("CHRO Runtime Integration", () => {
  let chroRuntime: any;
  let understand: any;
  let verify: any;
  let GovernanceProvider: any;

  beforeAll(async () => {
    const module = await import("../src/executive-runtime/executives/CHRO/CHROProgram");
    chroRuntime = module.chroRuntime;
    const se = await import("../src/ai/runtime/semantic-engine");
    understand = se.understand;
    const ve = await import("../src/ai/runtime/verification-engine");
    verify = ve.verify;
    const gp = await import("../src/governance/providers");
    GovernanceProvider = gp.GovernanceProvider;
  });

  const userMessages = [
    "gimana jadwal shift hari ini?",
    "siapa aja staff yang libur minggu ini?",
    "review kehadiran karyawan bulan ini",
    "butuh tambahan staff untuk cabang bandung",
    "laporan turnover karyawan",
    "optimasi jadwal shift untuk weekend",
  ] as const;

  it("should return healthy status", () => {
    const h = chroRuntime.health();
    expect(h.status).toBe("healthy");
    expect(h.version).toBe("1.0.0");
  });

  it.each(userMessages)("should process user message: '%s'", async (msg) => {
    const result = await chroRuntime.execute({ message: msg, userId: 1 });
    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe("string");
  });

  it("should call understand with the user message", async () => {
    understand.mockClear();
    await chroRuntime.execute({ message: "siapa staff baru?", userId: 1 });
    expect(understand).toHaveBeenCalledWith("siapa staff baru?", 1);
  });

  it("should handle verification failure", async () => {
    verify.mockReturnValueOnce({ passed: false, stopReason: "Confidence too low. Ask Founder.", warnings: [] });
    const result = await chroRuntime.execute({ message: "analisa resiko SDM", userId: 1 });
    expect(result.success).toBe(false);
    expect(result.text).toContain("Confidence too low");
  });

  it("should handle governance rejection", async () => {
    GovernanceProvider.canExecute.mockReturnValueOnce({ allow: false, reason: "CHRO tidak punya otorisasi" });
    const result = await chroRuntime.execute({ message: "ubah gaji karyawan", userId: 1 });
    expect(result.success).toBe(false);
    expect(result.text).toContain("Governance denied");
  });

  it("should return decide() with HR sections", async () => {
    const decision = await chroRuntime.decide({
      role: "CHRO",
      summary: "HR overview with staffing needs",
      sections: [
        { title: "Personnel", items: ["Total: 24 staff", "Hadir: 22"] },
        { title: "Shift Coverage", items: ["Pagi: 8", "Siang: 10", "Malam: 4"] },
      ],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });
    expect(decision.role).toBe("CHRO");
    expect(decision.action).toBe("hr_review");
    expect(decision.confidence).toBeGreaterThan(0);
  });

  it("should return monitor_hr when no HR sections", async () => {
    const decision = await chroRuntime.decide({
      role: "CHRO",
      summary: "General briefing",
      sections: [{ title: "Operations", items: ["Stock levels normal"] }],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });
    expect(decision.role).toBe("CHRO");
    expect(decision.action).toBe("monitor_hr");
  });

  it("should handle branchId in HR query", async () => {
    const result = await chroRuntime.execute({
      message: "data karyawan cabang surabaya",
      userId: 1,
      branchId: 3,
    });
    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("PipelineLLM");
  });

  it("should default to branchId=1 when not provided", async () => {
    const result = await chroRuntime.execute({
      message: "siapa aja yang masuk shift hari ini?",
      userId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("should carry branchId in decide() context", async () => {
    const decision = await chroRuntime.decide({
      role: "CHRO",
      summary: "Branch 3 staffing review",
      sections: [{ title: "Personnel", items: ["Staff: 12"] }],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    }, { branchId: 3 });
    expect(decision.role).toBe("CHRO");
    expect(decision.payload?.branchId).toBe(3);
    expect(decision.reasoning).toContain("Cabang 3");
  });

  describe("pipeline stages", () => {
    it.each([
      ["gimana jadwal shift hari ini?"],
      ["laporan turnover karyawan"],
      ["optimasi jadwal shift untuk weekend"],
    ])("should have complete pipeline for '%s'", async (msg) => {
      const result = await chroRuntime.execute({ message: msg, userId: 1 });
      expect(result.pipeline).toContain("Identity");
      expect(result.pipeline).toContain("SemanticEngine");
      expect(result.pipeline).toContain("ExecutionSpec");
      expect(result.pipeline).toContain("Verification");
      expect(result.pipeline).toContain("CKO");
      expect(result.pipeline).toContain("Context");
      expect(result.pipeline).toContain("PipelineLLM");
      expect(result.pipeline).toContain("Result");
    });
  });
});

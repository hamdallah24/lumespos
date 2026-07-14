import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SemanticContract } from "../src/ai/runtime/semantic-engine";
import type { ExecutionSpecificationV1 } from "../src/ai/runtime/execution-spec";

vi.mock("../src/ai/runtime/semantic-engine", () => ({
  understand: vi.fn(async (_message: string, _userId?: number): Promise<SemanticContract> => ({
    intent: "business_action",
    problem: "AI system analysis request",
    domain: "ai",
    entities: ["system", "knowledge", "automation"],
    targetFiles: [],
    confidence: 85,
    risk: "medium",
    requiredCapabilities: ["ai-analysis"],
    missingContext: [],
  })),
}));

vi.mock("../src/ai/runtime/execution-spec", () => ({
  buildSpecV1: vi.fn((contract: SemanticContract): ExecutionSpecificationV1 => ({
    id: "es_caio_test",
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
    requiredKnowledge: ["ai", "system"],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: [],
    executionMode: "direct",
    estimatedComplexity: "medium",
    estimatedTokens: 4000,
    confidence: contract.confidence,
    semanticReasoning: `AI system analysis for ${contract.problem}`,
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
    getDirective: (_role: string) => "Mock CAIO directive — maintain AI system health and knowledge quality",
    foundation: () => ({
      getConstitution: () => "Mock constitution",
      getNorthStar: () => "Mock north star",
      getPhilosophy: () => "Mock philosophy",
    }),
    governance: () => ({
      getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    }),
    runtime: (_role?: string) => ({
      getDirective: () => "Mock CAIO runtime directive",
      authority: () => "limited",
      forbiddenActions: () => ["business_decisions", "financial_operations"],
    }),
    verification: () => ({
      allDomains: () => ["ai", "system", "knowledge", "general", "strategy"],
      minimumConfidence: () => 30,
    }),
    getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    getFoundationContext: () => "Mock foundation context for CAIO",
  })),
}));

vi.mock("../src/ai/runtime/prompt-assembler", () => ({
  assemble: vi.fn((_opts: any) => "Mock assembled CAIO prompt."),
}));

vi.mock("../src/ai/runtime/execution/execution-pipeline", () => ({
  ExecutionPipeline: {
    execute: vi.fn(async () => ({
      success: true,
      text: "🤖 Sistem AI: Health 92% | Knowledge Base: 1,240 blok | Episode: 890 | Anomali: 3 terdeteksi. Rekomendasi: review automasi retrain.",
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
      text: "CKO Advisory: Sistem knowledge saat ini memiliki coverage 78%. Disarankan penambahan domain finance dan inventory.",
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
    searchAll: vi.fn(() => [{ summary: "AI system monitoring best practices", domain: "ai", type: "semantic" }]),
    getBestPractices: vi.fn(() => [{ summary: "Retrain models quarterly", domain: "ai" }]),
    getStats: vi.fn(() => ({ total: 1240, semantic: 520, episode: 890, procedural: 180, learning: { confirmed: 95, proposed: 12, archived: 34 } })),
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
      recommendation: { summary: "Review AI system health and knowledge gaps" },
      trace: { correlationId: "caio-trace-1", steps: [], durationMs: 100, status: "complete" },
    }));
    thinkWithProfile = vi.fn();
  }
  return { CognitiveEngine: MockCognitiveEngine, recordTrace: vi.fn() };
});

vi.mock("../src/executive-runtime/core", () => ({
  BriefGenerator: {
    generate: vi.fn((_opts: any) => ({
      role: "CAIO",
      summary: "AI system health summary",
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

describe("CAIO Runtime Integration", () => {
  let caioRuntime: any;
  let understand: any;
  let verify: any;
  let GovernanceProvider: any;

  beforeAll(async () => {
    const module = await import("../src/executive-runtime/executives/CAIO/CAIOProgram");
    caioRuntime = module.caioRuntime;
    const se = await import("../src/ai/runtime/semantic-engine");
    understand = se.understand;
    const ve = await import("../src/ai/runtime/verification-engine");
    verify = ve.verify;
    const gp = await import("../src/governance/providers");
    GovernanceProvider = gp.GovernanceProvider;
  });

  it("should return healthy status", () => {
    const h = caioRuntime.health();
    expect(h.status).toBe("healthy");
    expect(h.version).toBe("1.0.0");
  });

  it("should execute AI system query and return valid ExecutiveResult", async () => {
    const result = await caioRuntime.execute({
      message: "gimana kesehatan sistem AI kita?",
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
    expect(result.pipeline).toContain("Context");
    expect(result.pipeline).toContain("PipelineLLM");
    expect(result.pipeline).toContain("Result");
  });

  it("should call understand with the user message", async () => {
    understand.mockClear();
    await caioRuntime.execute({
      message: "analisa knowledge platform",
      userId: 1,
    });
    expect(understand).toHaveBeenCalledWith("analisa knowledge platform", 1);
  });

  it("should handle verification failure gracefully", async () => {
    verify.mockReturnValueOnce({ passed: false, stopReason: "Confidence too low (30%). Ask Founder for clarification.", warnings: [] });

    const result = await caioRuntime.execute({
      message: "analisa resiko sistem",
      userId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.text).toContain("Confidence too low");
  });

  it("should handle governance rejection", async () => {
    GovernanceProvider.canExecute.mockReturnValueOnce({ allow: false, reason: "CAIO tidak punya otorisasi untuk ini" });

    const result = await caioRuntime.execute({
      message: "ubah konfigurasi server",
      userId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.text).toContain("Governance denied");
  });

  it("should return decide() for system review", async () => {
    const decision = await caioRuntime.decide({
      role: "CAIO",
      summary: "System health with AI recommendations",
      sections: [
        { title: "System Health", items: ["Knowledge: 92%", "Automation: 85%"] },
        { title: "AI Performance", items: ["Accuracy: 94%", "Latency: 120ms"] },
      ],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });

    expect(decision.role).toBe("CAIO");
    expect(decision.action).toBe("system_review");
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reasoning).toBeTruthy();
  });

  it("should return monitor_system when no AI/system sections", async () => {
    const decision = await caioRuntime.decide({
      role: "CAIO",
      summary: "General briefing",
      sections: [{ title: "Operations", items: ["Stock levels normal"] }],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });

    expect(decision.role).toBe("CAIO");
    expect(decision.action).toBe("monitor_system");
  });

  it("should handle branchId in task and inject branch context", async () => {
    const result = await caioRuntime.execute({
      message: "analisa sistem AI cabang surabaya",
      userId: 1,
      branchId: 3,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("PipelineLLM");
  });

  it("should use default branchId=1 when not provided", async () => {
    const result = await caioRuntime.execute({
      message: "health check sistem",
      userId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
  });

  it("should carry branchId in decide() context", async () => {
    const decision = await caioRuntime.decide({
      role: "CAIO",
      summary: "Branch 3 AI system review",
      sections: [{ title: "System Performance", items: ["Uptime: 99.5%"] }],
      pendingApprovals: [],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    }, { branchId: 3 });

    expect(decision.role).toBe("CAIO");
    expect(decision.payload?.branchId).toBe(3);
    expect(decision.reasoning).toContain("Cabang 3");
  });
});

/**
 * EPIC QA-CEO.1 — Integration Test: CEO Runtime execute()
 * Uses vi.mock() to intercept external deps (LLM, FS, DB).
 * Tests the full pipeline with controlled inputs.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SemanticContract } from "../src/ai/runtime/semantic-engine";
import type { ExecutionSpecificationV1 } from "../src/ai/runtime/execution-spec";
import type { VerificationResult } from "../src/ai/runtime/verification-engine";
import type { CEOResult } from "../src/executive-runtime/executives/CEO/CEOProgram";

// ── Module Mocks ────────────────────────────────────────────────
// Must be before any test imports so hoisting applies

vi.mock("../src/ai/llm/llm-adapter", () => ({
  callDeepSeek: vi.fn(async (_system: string, _user: string, _userId: number, _mode: string, _maxTokens?: number): Promise<string> => {
    return "Berdasarkan analisis strategis, saya merekomendasikan fokus pada ekspansi pasar dengan pendekatan bertahap.";
  }),
}));

vi.mock("../src/ai/runtime/semantic-engine", () => ({
  understand: vi.fn(async (_message: string, _userId?: number, _ckoTargets?: any): Promise<SemanticContract> => ({
    intent: "business_action",
    problem: "Strategic growth planning",
    domain: "strategy",
    entities: ["growth", "expansion", "market"],
    targetFiles: [],
    confidence: 85,
    risk: "medium",
    requiredCapabilities: ["strategic-planning", "business-analysis"],
    missingContext: [],
  })),
}));

vi.mock("../src/ai/runtime/execution-spec", () => ({
  buildSpecV1: vi.fn((contract: SemanticContract): ExecutionSpecificationV1 => ({
    id: "es_test_001",
    version: "1.0",
    author: "Founder",
    createdAt: new Date().toISOString(),
    intent: contract.intent,
    objective: contract.problem,
    problem: contract.problem,
    expectedOutcome: contract.confidence > 80 ? "Resolved directly" : "Proposal required",
    domain: contract.domain,
    entities: contract.entities,
    targetFiles: contract.targetFiles,
    constraints: [],
    risk: contract.risk,
    priority: "normal",
    approvalRequired: false,
    requiredKnowledge: ["foundation", "strategy"],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: [],
    executionMode: "direct",
    estimatedComplexity: "medium",
    estimatedTokens: 2000,
    confidence: contract.confidence,
    semanticReasoning: `User requesting ${contract.problem}`,
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
  verify: vi.fn((_spec: ExecutionSpecificationV1): VerificationResult => ({
    passed: true,
    warnings: [],
  })),
}));

vi.mock("../src/ai/runtime/foundation", () => ({
  getFoundationProvider: vi.fn(() => ({
    getDirective: (_role: string) => "Mock CEO directive content",
    foundation: () => ({
      getConstitution: () => "Mock constitution",
      getNorthStar: () => "Mock north star",
      getPhilosophy: () => "Mock philosophy",
    }),
    governance: () => ({
      getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    }),
    runtime: (_role?: string) => ({
      getDirective: () => "Mock runtime directive",
      authority: () => "full",
      forbiddenActions: () => [],
    }),
    verification: () => ({
      allDomains: () => ["strategy", "engineering", "business", "general"],
      minimumConfidence: () => 30,
    }),
    getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    getFoundationContext: () => "Mock foundation context",
  })),
}));

vi.mock("../src/ai/runtime/organization-engine", () => ({
  organizationEngine: {
    delegateBySpec: vi.fn(() => [
      { runtimeId: "RUNTIME-003", runtime: "COO", reason: "Strategic operations", fallback: false },
      { runtimeId: "RUNTIME-004", runtime: "CFO", reason: "Financial planning", fallback: false },
    ]),
    name: "MockOrganizationEngine",
    version: "1.0.0",
    capabilities: ["delegation"],
    dependencies: [],
    health: () => ({ status: "healthy", uptime: 0, dependencies: [], version: "1.0.0" }),
    getTree: () => [],
    find: () => null,
    delegate: () => null,
    delegateAll: () => [],
    healthReport: () => ({ total: 0, healthy: 0, busy: 0, planned: 0, offline: 0 }),
    chain: () => [],
    subordinates: () => [],
    canAccept: () => false,
    load: () => {},
  } as any,
}));

vi.mock("../src/ai/runtime/prompt-assembler", () => ({
  assemble: vi.fn((_opts: any) => "Mock assembled prompt content."),
}));

vi.mock("../src/knowledge/KnowledgeBackbone", () => ({
  knowledgeBackbone: {
    summarizeMemory: (_role: string) => `Mock ${_role} memory content`,
  } as any,
}));

vi.mock("../src/execution-planner/providers", () => ({
  PlanProvider: {
    getAll: () => [],
  } as any,
}));

vi.mock("../src/governance/core", () => ({
  auditEngine: {
    log: () => {},
  } as any,
}));

vi.mock("../src/knowledge-platform/providers", () => ({
  KnowledgeProvider: {
    ingestEpisode: () => {},
    getLatestEpisodes: () => [],
  } as any,
}));

vi.mock("../src/governance/providers", () => ({
  GovernanceProvider: {
    canExecute: () => ({ allow: true, reason: "mock allowed" }),
  } as any,
}));

// These singletons have in-memory default state, no file/network I/O at import
vi.mock("../src/organization/executive-collaboration", () => ({
  executiveCollaboration: {} as any,
}));

vi.mock("../src/services/ai-mission-service", () => ({
  aiMissionService: { create: () => 1 } as any,
}));

vi.mock("../src/ai/runtime/mission-engine", () => ({
  missionRuntime: {
    create: () => ({ id: "mock-mission-1" }),
    transition: () => {},
    get: () => ({ id: "mock-mission-1", dbMissionId: 1 }),
  } as any,
}));

vi.mock("../src/ai/runtime/mission-background-engine", () => ({
  missionEngine: {
    triggerTick: () => {},
  } as any,
}));

vi.mock("../src/programs/consultant", () => ({
  consultantRuntime: {
    translateToTargets: async () => ({
      domain: "strategy",
      targetFiles: [],
      entities: ["growth"],
      businessContext: "Strategic planning context",
    }),
  } as any,
}));

// ── Tests ───────────────────────────────────────────────────────

describe("CEO Runtime Integration", () => {
  let ceoRuntime: any;
  let callDeepSeek: any;
  let understand: any;
  let buildSpecV1: any;
  let verify: any;
  let delegateBySpec: any;

  beforeAll(async () => {
    // Dynamic imports so mocks are hoisted first
    const ceoModule = await import("../src/executive-runtime/executives/CEO/CEOProgram");
    ceoRuntime = ceoModule.ceoRuntime;
    const llmAdapter = await import("../src/ai/llm/llm-adapter");
    callDeepSeek = llmAdapter.callDeepSeek;
    const se = await import("../src/ai/runtime/semantic-engine");
    understand = se.understand;
    const es = await import("../src/ai/runtime/execution-spec");
    buildSpecV1 = es.buildSpecV1;
    const ve = await import("../src/ai/runtime/verification-engine");
    verify = ve.verify;
    const oe = await import("../src/ai/runtime/organization-engine");
    delegateBySpec = oe.organizationEngine.delegateBySpec;
  });

  it("should return healthy status", () => {
    const h = ceoRuntime.health();
    expect(h.status).toBe("healthy");
  });

  it("should execute strategic query and return valid CEOResult structure", async () => {
    const ctx = {
      message: "What is our growth strategy for next quarter?",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
      onState: vi.fn(),
    };

    const result: CEOResult = await ceoRuntime.execute(ctx);

    // Verify structure
    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(50);

    // Verify decision structure
    expect(result.decision).toBeDefined();
    expect(result.decision.goal).toBeTruthy();
    expect(["normal", "high", "critical"]).toContain(result.decision.priority);
    expect(["low", "medium", "high"]).toContain(result.decision.risk);

    // Verify pipeline has expected stages
    expect(result.pipeline).toContain("Identity");
    expect(result.pipeline).toContain("SemanticEngine");
    expect(result.pipeline).toContain("ExecutionSpec");
    expect(result.pipeline).toContain("Verification");
    expect(result.pipeline).toContain("OrganizationEngine");
    expect(result.pipeline).toContain("CognitiveEngine");
    expect(result.pipeline).toContain("PromptAssembly");
    expect(result.pipeline).toContain("ExecutiveReport");

    // Verify mocked functions were called
    expect(understand).toHaveBeenCalled();
    expect(buildSpecV1).toHaveBeenCalled();
    expect(verify).toHaveBeenCalled();
    expect(delegateBySpec).toHaveBeenCalled();
  });

  it("should delegate to appropriate executives for strategic query", async () => {
    const ctx = {
      message: "What is our growth strategy for next quarter?",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
      onState: vi.fn(),
    };

    const result: CEOResult = await ceoRuntime.execute(ctx);

    expect(result.decision.delegation).not.toBeNull();
    expect(result.decision.delegation!.runtime).toContain("COO");
    expect(result.decision.delegation!.reason).toBeTruthy();
  });

  it("should handle greeting through full cognitive pipeline", async () => {
    (understand as any).mockResolvedValueOnce({
      intent: "greeting",
      problem: "Greeting",
      domain: "general",
      entities: [],
      targetFiles: [],
      confidence: 100,
      risk: "low",
      requiredCapabilities: [],
      missingContext: [],
    });

    const ctx = {
      message: "Hello",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
      onState: vi.fn(),
    };

    const result: CEOResult = await ceoRuntime.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    // Greeting now goes through full cognitive pipeline + LLM
    expect(result.pipeline).toContain("CognitiveEngine");
    expect(result.pipeline).toContain("PromptAssembly");
    // Still no multi-exec dispatch (greeting not in delegation trigger)
    expect(result.decision.delegation).toBeDefined();
  });

  it("should handle create mission request", async () => {
    (understand as any).mockResolvedValueOnce({
      intent: "business_action",
      problem: "Market analysis mission",
      domain: "strategy",
      entities: ["market", "analysis"],
      targetFiles: [],
      confidence: 90,
      risk: "medium",
      requiredCapabilities: ["strategic-planning"],
      missingContext: [],
    });

    const ctx = {
      message: "buat misi untuk analisis pasar",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
      onState: vi.fn(),
    };

    const result: CEOResult = await ceoRuntime.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.text).toContain("Misi");
    expect(result.pipeline).toContain("BackgroundMission");
  });

  it("should handle approval request", async () => {
    const ctx = {
      message: "[CEO APPROVAL] CTO proposes new authentication system",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
      onState: vi.fn(),
    };

    const result: CEOResult = await ceoRuntime.execute(ctx);

    expect(result.success).toBe(true);
    expect(result.decision.goal).toBe("approve_implementation_plan");
    expect(result.pipeline).toContain("ApprovalHandler");
    // CognitiveEngine should now be in the approval pipeline (BUG-002 fix)
    expect(result.pipeline).toContain("CognitiveEngine");
    expect(result.text).toMatch(/APPROVED|REJECTED/);
  });

  it("should verify decision has cognitive reasoning context", async () => {
    const ctx = {
      message: "What is our growth strategy for next quarter?",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
      onState: vi.fn(),
    };

    const result: CEOResult = await ceoRuntime.execute(ctx);

    // Decision reasoning should come from semantic engine + cognitive
    expect(result.decision.reasoning).toBeTruthy();
    expect(result.decision.reasoning.length).toBeGreaterThan(10);
    // Expected outcome should be defined
    expect(result.decision.expectedOutcome).toBeTruthy();
  });
});

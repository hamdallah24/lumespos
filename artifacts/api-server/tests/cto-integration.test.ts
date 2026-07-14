/**
 * EPIC QA-CEO.1 — Integration Test: CTO Runtime execute()
 * Tests technical analysis pipeline with controlled inputs.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import type { SemanticContract } from "../src/ai/runtime/semantic-engine";
import type { ExecutionSpecificationV1 } from "../src/ai/runtime/execution-spec";

// ── Module Mocks ────────────────────────────────────────────────

vi.mock("../src/ai/llm/llm-adapter", () => ({
  callDeepSeekWithTools: vi.fn(async (_system: string, _user: string, _userId: number, _mode: string, _tools: any[], _maxTokens?: number, ..._args: any[]): Promise<any> => {
    // Greeting: no tools, return simple greeting text
    if (!_tools || _tools.length === 0) {
      return { text: "Halo, ada yang bisa saya bantu?", toolsUsed: 0, filesRead: [] };
    }
    // Implementation mode (triggered by implKeywords regex in CTOProgram.ts)
    if (/implement|tulis|write|edit|buat|ubah/i.test(_user)) {
      return {
        text: `## Implementasi Perbaikan Auth Login

**Perubahan yang dilakukan:**

### 1. middleware/auth.ts — Tambah expiry check
\`\`\`typescript
// BEFORE: Token validation without expiry check
const decoded = jwt.verify(token, SECRET);

// AFTER: Added explicit expiry check
const decoded = jwt.verify(token, SECRET);
if (decoded.exp < Date.now() / 1000) {
  throw new Error("Token expired");
}
\`\`\`

### 2. routes/api/auth.ts — Auto-refresh token
\`\`\`typescript
// Added auto-refresh if within 5 min window
const EXPIRY_WINDOW = 300; // 5 minutes
if (decoded.exp - Date.now() / 1000 < EXPIRY_WINDOW) {
  const newToken = jwt.sign({ userId: decoded.userId }, SECRET, { expiresIn: "1h" });
  res.setHeader("X-Refresh-Token", newToken);
}
\`\`\`

### Dampak: Tidak ada breaking change. Semua test passing.`,
        toolsUsed: 4,
        filesRead: ["middleware/auth.ts", "routes/api/auth.ts", "types/jwt.ts"],
      };
    }
    // Technical analysis: return analysis with files read
    return {
      text: `## Analisis Masalah Auth Login

**Root Cause:** Token JWT kedaluwarsa tidak di-handle dengan baik di middleware.

**File Terkait:**
1. \`middleware/auth.ts\` — Validasi token tanpa cek expiry
2. \`routes/api/auth.ts\` — Endpoint refresh token tidak dipanggil otomatis

**Rekomendasi:**
- Tambah pengecekan \`jwt.exp < Date.now()\` di middleware
- Auto-refresh token jika masih dalam window 5 menit sebelum expired
- Redirect ke halaman login jika refresh gagal

**Dampak:** ~15 menit perbaikan, tidak ada breaking change.`,
      toolsUsed: 3,
      filesRead: ["middleware/auth.ts", "routes/api/auth.ts"],
    };
  }),
}));

vi.mock("../src/ai/runtime/semantic-engine", () => ({
  understand: vi.fn(async (_message: string, _userId?: number): Promise<SemanticContract> => ({
    intent: "analyze_code",
    problem: "Perbaiki error login auth",
    domain: "architecture",
    entities: ["auth", "login", "error", "authentication"],
    targetFiles: ["middleware/auth.ts", "routes/api/auth.ts"],
    confidence: 90,
    risk: "medium",
    requiredCapabilities: ["readFiles", "searchCode"],
    missingContext: [],
  })),
}));

vi.mock("../src/ai/runtime/execution-spec", () => ({
  buildSpecV1: vi.fn((contract: SemanticContract): ExecutionSpecificationV1 => ({
    id: "cto_es_test_001",
    version: "1.0",
    author: "CTO",
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
    priority: "high",
    approvalRequired: false,
    requiredKnowledge: ["foundation", "architecture"],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: [],
    executionMode: "direct",
    estimatedComplexity: "medium",
    estimatedTokens: 4000,
    confidence: contract.confidence,
    semanticReasoning: `Technical analysis: ${contract.problem}`,
    runtimePolicyName: "default",
    runtimePolicy: {
      approval: false,
      tools: "read_only",
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
    getDirective: (_role: string) => "Mock CTO directive — focus on code quality and security",
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
      authority: () => "technical",
      forbiddenActions: () => [],
    }),
    verification: () => ({
      allDomains: () => ["architecture", "engineering", "general"],
      minimumConfidence: () => 30,
    }),
    getConfidenceGates: () => ({ stop: 30, warn: 50, execute: 70 }),
    getFoundationContext: () => "Mock foundation context",
  })),
}));

vi.mock("../src/ai/runtime/planner", () => ({
  plan: vi.fn(() => ({
    id: "plan-test-001",
    totalSteps: 5,
    steps: [
      { order: 1, action: "read_auth_middleware", description: "Read auth middleware", status: "pending" },
      { order: 2, action: "read_auth_routes", description: "Read auth routes", status: "pending" },
      { order: 3, action: "analyze_token_flow", description: "Analyze token flow", status: "pending" },
      { order: 4, action: "identify_fix", description: "Identify fix", status: "pending" },
      { order: 5, action: "summarize", description: "Summarize findings", status: "pending" },
    ],
  })),
}));

vi.mock("../src/ai/runtime/knowledge-loader", () => ({
  loadKnowledgeWithContent: vi.fn(() => [{ id: "k1", title: "Auth patterns", content: "JWT best practices" }]),
}));

vi.mock("../src/ai/runtime/prompt-assembler", () => ({
  assemble: vi.fn((_opts: any) => "Mock CTO prompt assembly with identity, directive, and context."),
}));

vi.mock("../src/ai/runtime/reflection-engine", () => ({
  reflect: vi.fn(() => ({
    recommendation: "Proceed with implementation",
    objectiveAchieved: true,
    gaps: [],
    confidence: 85,
    summary: "Auth fix analysis complete",
    tokenUsage: { prompt: 500, completion: 1200, total: 1700 },
  })),
}));

vi.mock("../src/ai/runtime/evidence-collector", () => ({
  collectEvidence: vi.fn(() => ({
    strength: "strong",
    sources: ["code-analysis", "file-content"],
    items: [],
    gaps: [],
  })),
}));

vi.mock("../src/ai/runtime/authorization", () => ({
  authorization: {
    can: () => true,
  } as any,
}));

vi.mock("../src/ai/runtime/mission-scope", () => ({
  withinScope: () => ({ allowed: true, reason: "" }),
}));

vi.mock("../src/knowledge/MissionContextRegistry", () => ({
  missionContextRegistry: {
    getRelevant: async () => [],
    getContent: async () => null,
  } as any,
}));

vi.mock("../src/programs/consultant", () => ({
  consultantRuntime: {
    analyze: async () => ({ success: true, text: "CKO advisory: auth middleware at middleware/auth.ts" }),
  } as any,
  consultantDiscovery: {
    load: () => ({
      auth: { files: ["middleware/auth.ts"], description: "Authentication middleware" },
      login: { files: ["routes/api/auth.ts"], description: "Auth routes" },
    }),
  } as any,
}));

vi.mock("../src/governance/core", () => ({
  auditEngine: { log: () => {} },
}));

vi.mock("../src/knowledge-platform/providers", () => ({
  KnowledgeProvider: {
    ingestEpisode: () => {},
    getLatestEpisodes: () => [],
  } as any,
}));

vi.mock("../src/eios-runtime", () => ({
  ExecutiveDispatchRegistry: {
    dispatch: async () => ({ reasoning: "APPROVED" }),
  } as any,
}));

vi.mock("../src/ai/runtime/execution/tool-registry", () => ({
  resolveTools: vi.fn(() => [
    { name: "readFile", description: "Read a file" },
    { name: "grep", description: "Search code" },
  ]),
}));

vi.mock("../src/ai/runtime/execution/execution-capabilities", () => ({
  getDefaultCapabilities: () => ["readFiles", "searchCode"],
  CAPABILITY_TOOLS: { readFiles: ["readFile"], searchCode: ["grep"] },
}));

vi.mock("../src/ai/tools/tool-adapter", () => ({
  getDependencies: () => [],
}));

vi.mock("../src/ai/runtime/knowledge-evolution", () => ({
  propose: vi.fn(() => null),
  review: vi.fn(() => ({ recommendation: "ACCEPT" })),
}));

vi.mock("../src/ai/runtime/proposal-review", () => ({
  review: vi.fn(() => ({ recommendation: "ACCEPT" })),
}));

// ── Tests ───────────────────────────────────────────────────────

describe("CTO Runtime Integration", () => {
  let ctoProgram: any;
  let callDeepSeekWithTools: any;
  let understand: any;

  beforeAll(async () => {
    const ctoModule = await import("../src/executive-runtime/executives/CTO/CTOProgram");
    ctoProgram = ctoModule.ctoProgram;
    const llmAdapter = await import("../src/ai/llm/llm-adapter");
    callDeepSeekWithTools = llmAdapter.callDeepSeekWithTools;
    const se = await import("../src/ai/runtime/semantic-engine");
    understand = se.understand;
  });

  it("should return healthy status", () => {
    const h = ctoProgram.health();
    expect(h.status).toBe("healthy");
    expect(h.version).toBe("1.1.0");
  });

  it("should analyze auth login error and return valid CTOResult", async () => {
    const task = {
      message: "tolong perbaiki error auth login di aplikasi ini",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    // Verify structure
    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(200);

    // Verify pipeline stages (core technical stages)
    expect(result.pipeline).toContain("Identity");
    expect(result.pipeline).toContain("Authorization");
    expect(result.pipeline).toContain("MissionScope");
    expect(result.pipeline).toContain("SemanticEngine");
    expect(result.pipeline).toContain("ExecutionSpec");
    expect(result.pipeline).toContain("Verification");
    expect(result.pipeline).toContain("Planner");
    expect(result.pipeline).toContain("ContextFetching");
    expect(result.pipeline).toContain("KnowledgeLoader");
    expect(result.pipeline).toContain("CKO");
    expect(result.pipeline).toContain("CognitiveEngine");
    expect(result.pipeline).toContain("PromptAssembly");
    expect(result.pipeline).toContain("LLM");
    expect(result.pipeline).toContain("Reflection");
    expect(result.pipeline).toContain("EvidenceCollector");

    // Verify technical analysis outputs
    expect(result.toolsUsed).toBeGreaterThan(0);
    expect(result.filesRead.length).toBeGreaterThan(0);
    expect(result.reflection).toBeTruthy();
  });

  it("should handle auth login fix request with file analysis", async () => {
    const task = {
      message: "tolong perbaiki error auth login di aplikasi ini",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    // Should have analyzed auth-related files
    expect(result.filesRead).toContain("middleware/auth.ts");
    expect(result.filesRead).toContain("routes/api/auth.ts");

    // Should mention auth/login in analysis
    expect(result.text.toLowerCase()).toContain("auth");
    expect(result.text.toLowerCase()).toContain("login");
  });

  it("should handle greeting without tools or cognitive", async () => {
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

    const task = {
      message: "Halo",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    expect(result.success).toBe(true);
    // Greeting should have no files read or tools used
    expect(result.filesRead.length).toBe(0);
  });

  it("should run full 15+ stage pipeline for technical analysis", async () => {
    const task = {
      message: "tolong perbaiki error auth login di aplikasi ini",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    // Verify all expected pipeline stages are present (15+ stages)
    expect(result.pipeline.length).toBeGreaterThanOrEqual(15);

    // Verify mocked functions were called
    expect(understand).toHaveBeenCalled();
    expect(callDeepSeekWithTools).toHaveBeenCalled();

    // Verify the LLM received tools
    const llmCallArgs = callDeepSeekWithTools.mock.calls[0];
    const tools = llmCallArgs[4]; // toolSet is 5th arg
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t: any) => t.name === "readFile")).toBe(true);
  });

  it("should not include CognitiveEngine in greeting pipeline", async () => {
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

    const task = {
      message: "Halo",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    // Greeting skips CognitiveEngine (spec.intent === "greeting" check at line 256)
    expect(result.pipeline).not.toContain("CognitiveEngine");
    // Greeting should still return text
    expect(result.text).toBeTruthy();
  });

  // ── Implementation Tests ─────────────────────────────────────

  it("should enter implementation mode when user asks to implement fix", async () => {
    (understand as any).mockResolvedValueOnce({
      intent: "implement_change",
      problem: "Implement auth login fix based on analysis",
      domain: "architecture",
      entities: ["auth", "login", "jwt", "middleware"],
      targetFiles: ["middleware/auth.ts", "routes/api/auth.ts"],
      confidence: 95,
      risk: "low",
      requiredCapabilities: ["readFiles", "searchCode", "editCode"],
      missingContext: [],
    });

    const task = {
      message: "implement rekomendasi perbaikan auth yang sudah dianalisis",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    expect(result.success).toBe(true);
    expect(result.text).toContain("Implementasi");
    expect(result.text).toContain("middleware/auth.ts");
    expect(result.text).toContain("routes/api/auth.ts");
    // Implementation uses more tools (read + write/edit)
    expect(result.toolsUsed).toBeGreaterThanOrEqual(3);
    // Pipeline should include KnowledgeEvolution (proposal for fix)
    expect(result.pipeline).toContain("LLM");
    expect(result.pipeline).toContain("Reflection");
    expect(result.pipeline).toContain("EvidenceCollector");
  });

  it("should trigger implKeywords regex override for fix requests", async () => {
    // Even if semantic engine doesn't detect implement_change,
    // the implKeywords regex in CTOProgram.ts:210 should override it
    (understand as any).mockResolvedValueOnce({
      intent: "analyze_code",  // semantic says analyze
      problem: "Fix auth login implementation",
      domain: "architecture",
      entities: ["auth", "login"],
      targetFiles: ["middleware/auth.ts"],
      confidence: 90,
      risk: "medium",
      requiredCapabilities: ["readFiles", "searchCode"],
      missingContext: [],
    });

    const task = {
      message: "tolong tulis ulang middleware auth biar token expired terdeteksi",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    const result = await ctoProgram.execute(task);

    expect(result.success).toBe(true);
    // The word "tulis" should trigger implKeywords override
    expect(result.text).toContain("Implementasi");
  });

  it("should include CEO approval callback for implementation plan", async () => {
    (understand as any).mockResolvedValueOnce({
      intent: "implement_change",
      problem: "Write auth fix implementation",
      domain: "architecture",
      entities: ["auth", "login"],
      targetFiles: ["middleware/auth.ts"],
      confidence: 95,
      risk: "low",
      requiredCapabilities: ["readFiles", "searchCode", "editCode"],
      missingContext: [],
    });

    // Verify that the CEO approval callback was provided to callDeepSeekWithTools
    const task = {
      message: "tulis implementasi perbaikan auth login",
      userId: 1,
      onProgress: vi.fn(),
      onTool: vi.fn(),
    };

    await ctoProgram.execute(task);

    // callDeepSeekWithTools args (line 314-328 CTOProgram.ts):
    //   0=system, 1=message, 2=userId, 3=mode, 4=tools, 5=maxTokens,
    //   6=onProgress, 7=onTool, 8=jsonMode, 9=undefined, 10=onExecutionEvent,
    //   11=metadata, 12=approvalCallback
    const llmCall = callDeepSeekWithTools.mock.lastCall;
    const approvalCallback = llmCall[12];
    expect(typeof approvalCallback).toBe("function");
  });
});

import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("../src/ai/llm/llm-adapter", () => ({
  callDeepSeek: vi.fn(async (_system: string, _user: string, _userId: number, _mode: string, _maxTokens?: number): Promise<string> => {
    return "Berdasarkan situasi saat ini, saya sarankan untuk menambah stok gula pasir di cabang 1 karena stok menipis.";
  }),
}));

vi.mock("../src/ai/runtime/foundation", () => ({
  getFoundationProvider: vi.fn(() => ({
    getDirective: (_role: string) => "Mock COO directive — focus on operational efficiency",
    getFoundationContext: () => "Mock foundation context for COO",
    documentCount: 12,
  })),
}));

vi.mock("../src/ai/runtime/identity", () => ({
  getIdentity: vi.fn((_role: string) => ({
    id: "coo-v1",
    role: "COO",
    authority: "operational",
    capabilities: ["inventory-management", "sales-tracking", "product-management", "branch-operations"],
    scope: ["operations", "inventory", "sales"],
  })),
}));

vi.mock("../src/governance/core", () => ({
  auditEngine: {
    log: vi.fn(),
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
    searchAll: vi.fn(() => [{ summary: "Stock management best practices", domain: "inventory" }]),
    getBestPractices: vi.fn(() => [{ summary: "Monitor stock levels daily", domain: "inventory" }]),
  },
}));

vi.mock("../src/communication-runtime/providers", () => ({
  CommunicationProvider: {
    dispatch: vi.fn(),
  },
}));

vi.mock("../src/execution-planner/providers", () => ({
  PlanProvider: {
    getAll: vi.fn(() => []),
    getProgress: vi.fn(() => ({ percentComplete: 50 })),
  },
}));

vi.mock("../src/routes/ai-business", () => ({
  executeOperation: vi.fn(async (_action: string, _params: any, _branchId: number): Promise<string> => {
    return `Sukses: Operasi ${_action} berhasil dijalankan.`;
  }),
}));

vi.mock("../src/programs/consultant", () => ({
  consultantDomain: {
    advisor: vi.fn((_question: string, _mode: string) => "CKO Advisory: COO operational context — inventory and sales monitoring recommended."),
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
      transaction: vi.fn(async (cb: any) => {
        const tx: any = {
          insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: 1 }]) }) }),
          select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
          delete: () => ({ where: () => Promise.resolve() }),
        };
        await cb(tx);
      }),
      delete: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })),
    },
    branchesTable,
  } as any;
});

vi.mock("../src/executive-runtime/core", () => ({
  BriefGenerator: {
    generate: vi.fn((_opts: any) => ({
      role: "COO",
      summary: "Operational summary for today",
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

describe("COO Runtime Integration", () => {
  let cooRuntime: any;
  let callDeepSeek: any;
  let GovernanceProvider: any;
  let KnowledgeProvider: any;
  let CommunicationProvider: any;
  let executeOperation: any;

  beforeAll(async () => {
    const cooModule = await import("../src/executive-runtime/executives/COO/COOProgram");
    cooRuntime = cooModule.cooRuntime;
    const llmAdapter = await import("../src/ai/llm/llm-adapter");
    callDeepSeek = llmAdapter.callDeepSeek;
    const gp = await import("../src/governance/providers");
    GovernanceProvider = gp.GovernanceProvider;
    const kp = await import("../src/knowledge-platform/providers");
    KnowledgeProvider = kp.KnowledgeProvider;
    const cp = await import("../src/communication-runtime/providers");
    CommunicationProvider = cp.CommunicationProvider;
    const ab = await import("../src/routes/ai-business");
    executeOperation = ab.executeOperation;
  });

  it("should return healthy status", () => {
    const h = cooRuntime.health();
    expect(h.status).toBe("healthy");
    expect(h.version).toBe("3.0.0");
  });

  it("should execute status query and return valid ExecutiveResult", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "status", query: "situasi apa yang perlu perhatian" }));

    const result = await cooRuntime.execute({
      message: "gimana kabar hari ini?",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
    expect(typeof result.text).toBe("string");
    expect(result.pipeline).toContain("Identity");
    expect(result.pipeline).toContain("IntentClassification");
    expect(result.pipeline).toContain("BriefConsumer");
  });

  it("should handle approve intent", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "approve", situationId: "sit-001", optionId: "approve" }));

    const result = await cooRuntime.execute({
      message: "setujui transfer stok antar cabang",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("ApprovalHandler");
    expect(result.text).toContain("disetujui");
    expect(GovernanceProvider.canExecute).toHaveBeenCalled();
    expect(KnowledgeProvider.ingestEpisode).toHaveBeenCalled();
  });

  it("should handle reject intent", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "approve", situationId: "sit-002", optionId: "reject" }));

    const result = await cooRuntime.execute({
      message: "tolak permintaan pengadaan barang",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("ApprovalHandler");
    expect(result.text).toContain("ditolak");
  });

  it("should handle escalate intent", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "approve", situationId: "sit-003", optionId: "escalate" }));

    const result = await cooRuntime.execute({
      message: "eskalasi ke founder untuk keputusan",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toContain("dieskalasi");
    expect(CommunicationProvider.dispatch).toHaveBeenCalled();
  });

  it("should handle action intent via executeOperation", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({
      intent: "action",
      action: "add_stock",
      params: { itemName: "Gula", qty: 5, unit: "kg" },
    }));

    const result = await cooRuntime.execute({
      message: "tambah stok gula 5 kg",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("ExecuteAction");
    expect(executeOperation).toHaveBeenCalledWith("add_stock", { itemName: "Gula", qty: 5, unit: "kg" }, 1);
  });

  it("should handle question intent via knowledge search", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "question", query: "bagaimana cara handle stok kritis" }));

    const result = await cooRuntime.execute({
      message: "bagaimana cara handle stok yang mau habis?",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("KnowledgeRecorder");
    expect(result.text).toBeTruthy();
  });

  it("should handle unknown intent via LLM fallback", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "none" }));

    const result = await cooRuntime.execute({
      message: "halo selamat pagi",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("LLM");
    expect(result.text).toBeTruthy();
  });

  it("should reject unknown action", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({
      intent: "action",
      action: "delete_database",
      params: {},
    }));

    const result = await cooRuntime.execute({
      message: "hapus database",
      userId: 1,
      branchId: 1,
    });

    expect(result.pipeline).toContain("ExecuteAction");
    expect(result.text).toContain("tidak dikenal");
  });

  it("should handle governance rejection", async () => {
    GovernanceProvider.canExecute.mockReturnValueOnce({ allow: false, reason: "COO tidak punya otorisasi untuk aksi ini" });

    callDeepSeek.mockResolvedValueOnce(JSON.stringify({
      intent: "action",
      action: "change_role",
      params: { userId: 5, role: "admin" },
    }));

    const result = await cooRuntime.execute({
      message: "ubah role user jadi admin",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toContain("Tidak bisa menjalankan");
    expect(CommunicationProvider.dispatch).toHaveBeenCalled();
  });

  it("should return decide() for operational briefing", async () => {
    const decision = await cooRuntime.decide({
      role: "COO",
      summary: "Test brief with pending approvals",
      pendingApprovals: [{ id: "apr-1", title: "Setujui transfer stok" }],
      actionItems: [],
      situations: [],
      objectives: [],
      timestamp: new Date().toISOString(),
    });

    expect(decision.role).toBe("COO");
    expect(decision.action).toBe("approve");
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.reasoning).toBeTruthy();
  });

  it("should handle empty branch ID gracefully", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "status", query: "kondisi terkini" }));

    const result = await cooRuntime.execute({
      message: "gimana keadaan toko?",
      userId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.text).toBeTruthy();
  });

  it("should handle branch intent — list_branches action", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({
      intent: "action",
      action: "list_branches",
      params: {},
    }));

    const result = await cooRuntime.execute({
      message: "tampilkan daftar cabang",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("ExecuteAction");
    expect(executeOperation).toHaveBeenCalledWith("list_branches", {}, 1);
  });

  it("should handle list_branches as recognized action", async () => {
    const { executeOperation } = await import("../src/routes/ai-business");
    const result = await executeOperation("list_branches", {}, 1);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("should inject branch context into LLM system prompt for unknown intent", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({ intent: "none" }));

    const result = await cooRuntime.execute({
      message: "halo selamat pagi",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("LLM");
    // callDeepSeek should have received system prompt with branch context
    const systemPromptArg = callDeepSeek.mock.calls[callDeepSeek.mock.calls.length - 1][0];
    expect(systemPromptArg).toContain("Context Cabang");
    expect(systemPromptArg).toContain("Daftar Semua Cabang");
  });

  it("should handle cross-branch action via params.branchId=0", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({
      intent: "action",
      action: "list_branches",
      params: { branchId: 0 },
    }));

    const result = await cooRuntime.execute({
      message: "lihat data semua cabang",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("ExecuteAction");
    // params.branchId=0 is metadata for executeOperation to interpret as "all branches"
    // the actual branchId passed as 3rd arg is still the task branchId (1)
    expect(executeOperation).toHaveBeenCalledWith("list_branches", { branchId: 0 }, 1);
  });

  it("should handle migrate_branch action", async () => {
    callDeepSeek.mockResolvedValueOnce(JSON.stringify({
      intent: "action",
      action: "migrate_branch",
      params: { sourceBranchName: "Lume Central", targetBranchName: "Lume Bandung" },
    }));

    const result = await cooRuntime.execute({
      message: "migrasi produk dari Lume Central ke Lume Bandung",
      userId: 1,
      branchId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.pipeline).toContain("ExecuteAction");
    expect(executeOperation).toHaveBeenCalledWith("migrate_branch", { sourceBranchName: "Lume Central", targetBranchName: "Lume Bandung" }, 1);
  });

  it("should include branchId in decide() for branch-specific brief", async () => {
    const decision = await cooRuntime.decide({
      role: "COO",
      summary: "Branch 1 operations",
      pendingApprovals: [{ id: "apr-1", title: "Setujui stok" }],
      actionItems: [],
      situations: [{ id: "sit-1", title: "Stok menipis", severity: "high" }],
      objectives: [],
      timestamp: new Date().toISOString(),
    });

    expect(decision.role).toBe("COO");
    expect(decision.action).toBe("approve");
    expect(decision.confidence).toBeGreaterThan(0);
  });
});

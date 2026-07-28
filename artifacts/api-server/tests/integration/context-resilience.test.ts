import { describe, it, expect } from "vitest";
import type { RuntimeContext, ModuleStatusValue } from "../../src/runtime-intelligence-core/types";
import { getContract, getRequiredFields, getOptionalFields } from "../../src/ai/runtime/contracts/ContextContracts";
import { validateContext } from "../../src/ai/runtime/contracts/ContextValidator";

function makePartialRC(moduleStatus: Record<string, ModuleStatusValue>, degradedModules?: string[], degradedReasons?: Record<string, string>): RuntimeContext {
  return {
    metadata: {
      version: "1.0",
      contractId: "test",
      createdAt: Date.now(),
      degraded: true,
      degradedReason: "test",
      assemblyStatus: "partial",
      moduleStatus,
      degradedModules: degradedModules ?? Object.entries(moduleStatus).filter(([, v]) => v !== "ready").map(([k]) => k),
      degradedReasons,
    },
    intelligence: {
      goal: "test", intent: "test", subIntent: "test",
      domain: { primary: "general", secondary: [] },
      entities: [],
      reasoning: { intentRationale: "", domainRationale: "", entityRationale: "", alternativesConsidered: [] },
      thinkingMode: "balanced", urgency: "low",
      risk: { level: "low", factors: [], requiresApproval: false },
    },
    planning: {
      executionPlan: [], suggestedTools: [], recommendedStrategy: "", expectedOutput: "",
    },
    grounding: {
      operational: [], memory: { type: "working", entries: [], retrievalTime: Date.now() },
      knowledge: [], repository: [], metadata: [], requiredTruth: [], retrievedTruth: [], missingTruth: [],
    },
    verification: {
      results: { state: "unverified", checks: [], verificationConfidence: 0, contradictions: [], warnings: [], recovery: [], confidenceAdjustment: 0 },
      explainability: { whyDomain: "", whyTool: "", whyRepository: "", whyMemory: "", whyConfidence: "", whyPlanning: "" },
    },
    runtime: {
      trace: { stages: [], totalDurationMs: 0 },
      evidence: [],
      budget: { limits: {}, exceeded: false, exceededStages: [] },
      confidence: {
        reasoning: 0, grounding: 0, verification: 0, overall: 0,
        provenance: { intentConfidence: 0, entityConfidence: 0, groundingCompleteness: 0, verificationStatus: "unverified", planningConfidence: 0, toolResolutionConfidence: 0 },
        weakAreas: [], safeToExecute: false,
      },
      reasoningTrace: [],
    },
  };
}

function makeFullRC(): RuntimeContext {
  return makePartialRC({ understanding: "ready", planning: "ready", grounding: "ready", erp: "ready", verification: "ready" }, []);
}

function makeNullRC(): null {
  return null;
}

describe("Context Contracts", () => {
  it("COO contract requires grounding (branches) and erp (inventory, sales)", () => {
    const contract = getContract("COO");
    expect(contract).toBeDefined();
    const required = getRequiredFields("COO");
    expect(required).toContain("branches");
    expect(required).toContain("inventory");
    expect(required).toContain("sales");
  });

  it("CFO contract requires erp (finance)", () => {
    const required = getRequiredFields("CFO");
    expect(required).toContain("finance");
  });

  it("CKO contract requires grounding (memory)", () => {
    const required = getRequiredFields("CKO");
    expect(required).toContain("memory");
  });

  it("CTO contract requires grounding (repository)", () => {
    const required = getRequiredFields("CTO");
    expect(required).toContain("repository");
  });

  it("CHRO contract requires erp (people)", () => {
    const required = getRequiredFields("CHRO");
    expect(required).toContain("people");
  });

  it("CEO contract requires erp (finance)", () => {
    const required = getRequiredFields("CEO");
    expect(required).toContain("finance");
  });

  it("CMO contract has no required fields", () => {
    const required = getRequiredFields("CMO");
    expect(required.length).toBe(0);
  });

  it("CAIO contract has no required fields", () => {
    const required = getRequiredFields("CAIO");
    expect(required.length).toBe(0);
  });

  it("unknown executive returns no contract", () => {
    expect(getContract("UNKNOWN")).toBeUndefined();
  });
});

describe("Context Validator", () => {
  it("validates full context as valid", () => {
    const rc = makeFullRC();
    const result = validateContext("COO", rc);
    expect(result.valid).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it("rejects null context", () => {
    const result = validateContext("COO", makeNullRC());
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("runtimeContext");
  });

  it("rejects undefined context", () => {
    const result = validateContext("COO", undefined);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("runtimeContext");
  });

  it("detects missing required COO modules", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "ready", grounding: "failed", erp: "failed", verification: "ready" }, ["grounding", "erp"]);
    const result = validateContext("COO", rc);
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(3);
    expect(result.missing.some(m => m.includes("branches") || m === "branches")).toBe(true);
    expect(result.missing.some(m => m.includes("inventory") || m === "inventory")).toBe(true);
    expect(result.missing.some(m => m.includes("sales") || m === "sales")).toBe(true);
  });

  it("detects partial degradation — erp only", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "ready", grounding: "ready", erp: "failed", verification: "ready" }, ["erp"], { erp: "ERP connection timeout" });
    const result = validateContext("CFO", rc);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("finance");
  });

  it("passes validation when only optional modules fail", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "ready", grounding: "ready", erp: "ready", verification: "ready" }, []);
    const result = validateContext("CMO", rc);
    expect(result.valid).toBe(true);
  });

  it("includes degraded reasons in message", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "ready", grounding: "failed", erp: "failed", verification: "ready" }, ["grounding", "erp"], {
      grounding: "Grounding provider timeout",
      erp: "Database connection refused",
    });
    const result = validateContext("COO", rc);
    expect(result.message).toContain("Grounding provider timeout");
    expect(result.message).toContain("Database connection refused");
  });

  it("logs assemblyStatus as minimal when most modules fail", () => {
    const rc = makePartialRC({ understanding: "failed", planning: "failed", grounding: "failed", erp: "failed", verification: "failed" }, ["understanding", "planning", "grounding", "erp", "verification"]);
    rc.metadata.assemblyStatus = "minimal";
    const result = validateContext("COO", rc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("skips validation for executives without contracts", () => {
    const rc = makeFullRC();
    const result = validateContext("UNKNOWN", rc);
    expect(result.valid).toBe(true);
    expect(result.message).toContain("No formal contract defined");
  });
});

describe("Assembly Status Logic", () => {
  it("assemblyStatus is 'full' when no modules fail", () => {
    const rc = makeFullRC();
    rc.metadata.assemblyStatus = "full";
    expect(rc.metadata.assemblyStatus).toBe("full");
  });

  it("assemblyStatus is 'partial' when some modules fail", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "ready", grounding: "ready", erp: "failed", verification: "ready" }, ["erp"]);
    rc.metadata.assemblyStatus = "partial";
    expect(rc.metadata.assemblyStatus).toBe("partial");
  });

  it("assemblyStatus is 'minimal' when most modules fail", () => {
    const rc = makePartialRC({ understanding: "failed", planning: "failed", grounding: "failed", erp: "failed", verification: "ready" }, ["understanding", "planning", "grounding", "erp"]);
    rc.metadata.assemblyStatus = "minimal";
    expect(rc.metadata.assemblyStatus).toBe("minimal");
  });
});

describe("moduleStatus Tracking", () => {
  it("records failed modules in degradedModules", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "failed", grounding: "ready", erp: "ready", verification: "ready" }, ["planning"]);
    expect(rc.metadata.degradedModules).toContain("planning");
  });

  it("records multiple failed modules", () => {
    const rc = makePartialRC(
      { understanding: "failed", planning: "failed", grounding: "ready", erp: "failed", verification: "ready" },
      ["understanding", "planning", "erp"],
    );
    expect(rc.metadata.degradedModules?.length).toBe(3);
  });

  it("moduleStatus retains ready status for successful modules", () => {
    const rc = makePartialRC({ understanding: "ready", planning: "ready", grounding: "ready", erp: "ready", verification: "ready" }, []);
    expect(rc.metadata.moduleStatus?.understanding).toBe("ready");
    expect(rc.metadata.moduleStatus?.grounding).toBe("ready");
    expect(rc.metadata.moduleStatus?.erp).toBe("ready");
  });
});

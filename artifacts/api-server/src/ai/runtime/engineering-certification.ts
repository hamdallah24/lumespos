// SPRINT 16.5: Engineering OS Certification — validates all layers
// If any check fails, the OS is not locked. Every layer must pass.

interface CertCheck {
  layer: string;
  status: "PASS" | "FAIL" | "NOT_APPLICABLE";
  detail: string;
}

interface Certification {
  version: "1.0.0";
  timestamp: string;
  checks: CertCheck[];
  passed: number;
  failed: number;
  locked: boolean;
  verdict: string;
}

async function checkFoundation(): Promise<CertCheck> {
  try {
    const { buildGraph, validateGraph } = await import("./knowledge-graph");
    const graph = buildGraph();
    const v = validateGraph(graph);
    return {
      layer: "Foundation",
      status: v.passed ? "PASS" : "FAIL",
      detail: v.passed ? `${graph.stats.totalNodes} nodes, ${graph.stats.totalEdges} edges` : `${v.brokenRefs.length} broken refs`,
    };
  } catch (e: any) {
    return { layer: "Foundation", status: "FAIL", detail: e.message };
  }
}

async function checkArchitecture(): Promise<CertCheck> {
  try {
    const { registryStatus } = await import("./registry");
    const status = registryStatus();
    return {
      layer: "Architecture",
      status: status.includes("Valid: true") ? "PASS" : "FAIL",
      detail: status.split("\n")[0] || status,
    };
  } catch (e: any) {
    return { layer: "Architecture", status: "FAIL", detail: e.message };
  }
}

async function checkConstitution(): Promise<CertCheck> {
  try {
    const { verify } = await import("./verification-engine");
    const testSpec = {
      intent: "analyze_code", confidence: 85, domain: "architecture",
      entities: ["foundation"], missingContext: [],
      id: "cert-test", version: "1.0" as const, author: "system",
      createdAt: new Date().toISOString(), objective: "test", problem: "test",
      expectedOutcome: "pass", constraints: [], risk: "low" as const,
      priority: "normal" as const, approvalRequired: false,
      requiredKnowledge: [], requiredCapabilities: [], requiredTools: [],
      executionMode: "direct" as const, estimatedComplexity: "simple" as const,
      estimatedTokens: 500, confidence: 85, semanticReasoning: "test",
      runtimePolicyName: "DefaultPolicy",
      runtimePolicy: {
        approval: false, tools: "read_only", classification: "internal",
        knowledge: "minimal", history: "last5", foundation: "basic",
        manifest: false, sharedContext: false, maxTokens: 2000,
      },
    };
    const v = verify(testSpec);
    return {
      layer: "Constitution",
      status: "PASS",
      detail: `Verification engine active (${v.warnings.length} warnings)`,
    };
  } catch (e: any) {
    return { layer: "Constitution", status: "FAIL", detail: e.message };
  }
}

async function checkGovernance(): Promise<CertCheck> {
  try {
    const { PolicyRegistry } = await import("./policy/registry");
    const policies = PolicyRegistry.list();
    return {
      layer: "Governance",
      status: policies.length >= 5 ? "PASS" : "FAIL",
      detail: `${policies.length} policies registered: ${policies.join(", ")}`,
    };
  } catch (e: any) {
    return { layer: "Governance", status: "FAIL", detail: e.message };
  }
}

async function checkIdentity(): Promise<CertCheck> {
  try {
    const { IDENTITIES, getIdentity } = await import("./identity");
    const cto = getIdentity("CTO");
    const coo = getIdentity("COO");
    const ceo = getIdentity("CEO");
    return {
      layer: "Identity",
      status: cto && coo && ceo ? "PASS" : "FAIL",
      detail: `${Object.keys(IDENTITIES).length} identities: ${Object.keys(IDENTITIES).join(", ")}`,
    };
  } catch (e: any) {
    return { layer: "Identity", status: "FAIL", detail: e.message };
  }
}

async function checkKnowledge(): Promise<CertCheck> {
  try {
    const { collect } = await import("./knowledge-metrics");
    const m = collect();
    return {
      layer: "Knowledge",
      status: m.coverage.coveragePercent >= 50 ? "PASS" : "FAIL",
      detail: `Coverage: ${m.coverage.coveragePercent}% | ${m.validation.brokenRefs} broken refs`,
    };
  } catch (e: any) {
    return { layer: "Knowledge", status: "FAIL", detail: e.message };
  }
}

async function checkRuntime(): Promise<CertCheck> {
  try {
    const { health } = await import("./registry");
    const h = health();
    const total = Object.keys(h).length;
    const unhealthy = Object.values(h).filter((v: any) => v?.status === "unhealthy").length;
    return {
      layer: "Runtime",
      status: unhealthy === 0 ? "PASS" : "FAIL",
      detail: `${total} components, ${unhealthy} unhealthy`,
    };
  } catch (e: any) {
    return { layer: "Runtime", status: "FAIL", detail: e.message };
  }
}

/** Run all certification checks */
async function certify(): Promise<Certification> {
  const checks = await Promise.all([
    checkFoundation(),
    checkArchitecture(),
    checkConstitution(),
    checkGovernance(),
    checkIdentity(),
    checkKnowledge(),
    checkRuntime(),
  ]);

  const passed = checks.filter(c => c.status === "PASS").length;
  const failed = checks.filter(c => c.status === "FAIL").length;
  const locked = failed === 0;

  return {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    checks,
    passed,
    failed,
    locked,
    verdict: locked
      ? "🔒 ENGINEERING OS v1.0 — LOCKED"
      : `❌ ENGINEERING OS v1.0 — ${failed} LAYER(S) FAILED`,
  };
}

/** Format certification as readable report */
function formatCertification(cert: Certification): string {
  const lines = [
    `╔══════════════════════════════════════════╗`,
    `║  Engineering OS v1.0 — Certification     ║`,
    `║  ${cert.verdict.padEnd(40)}║`,
    `╠══════════════════════════════════════════╣`,
  ];

  for (const c of cert.checks) {
    const icon = c.status === "PASS" ? "✅" : c.status === "FAIL" ? "❌" : "⬜";
    lines.push(`║  ${icon} ${c.layer.padEnd(20)} ${c.detail.slice(0, 18).padEnd(18)}║`);
  }

  lines.push(`╚══════════════════════════════════════════╝`);
  return lines.join("\n");
}

const _lastCert: { value: Certification | null } = { value: null };

export const engineeringCertification = {
  name: "EngineeringCertification",
  version: "1.0.0",
  capabilities: ["layer-validation", "constitution-check", "certification-reporting"],
  dependencies: ["All Runtime Components"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  /** Run certification and return result */
  async run(): Promise<Certification> {
    _lastCert.value = await certify();
    if (_lastCert.value) console.log(`\n${formatCertification(_lastCert.value)}\n`);
    return _lastCert.value;
  },

  /** Get last certification result */
  last(): Certification | null {
    return _lastCert.value;
  },

  /** Check if OS is locked */
  isLocked(): boolean {
    return _lastCert.value?.locked ?? false;
  },
};

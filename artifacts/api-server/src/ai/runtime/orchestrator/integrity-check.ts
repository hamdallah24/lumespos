// ECP-036 Wave 8: Integrity Check — Structural + Runtime
// Frozen. Verifies module presence AND wiring health.
// ECP-036: all WARN. ECP-037: BLOCK if score < 90.

export interface IntegrityReport {
  structuralScore: number;
  structuralStatus: "healthy" | "degraded" | "emergency";
  runtimeScore: number;
  runtimeStatus: "healthy" | "stable" | "degraded" | "critical";
  components: Record<string, "PRESENT" | "MISSING">;
  checks: { name: string; status: "PASS" | "WARN" | "FAIL"; detail: string }[];
}

function runtimeStatus(score: number): IntegrityReport["runtimeStatus"] {
  if (score >= 95) return "healthy";
  if (score >= 80) return "stable";
  if (score >= 60) return "degraded";
  return "critical";
}

async function checkModule(path: string): Promise<boolean> {
  try { await import(path); return true; } catch { return false; }
}

export async function checkStructuralIntegrity(): Promise<{
  score: number; status: "healthy" | "degraded" | "emergency"; components: Record<string, "PRESENT" | "MISSING">;
}> {
  const modules = [
    { name: "Foundation", path: "../foundation" },
    { name: "Knowledge", path: "../knowledge" },
    { name: "Mission Authority", path: "../mission-authority" },
    { name: "Council", path: "../council" },
    { name: "Learning", path: "../learning" },
    { name: "Telemetry", path: "../observability" },
  ];

  const components: Record<string, "PRESENT" | "MISSING"> = {};
  let present = 0;

  for (const mod of modules) {
    components[mod.name] = (await checkModule(mod.path + "/index")) ? "PRESENT" : "MISSING";
    if (components[mod.name] === "PRESENT") present++;
  }

  const score = Math.round((present / modules.length) * 100);
  return {
    score,
    status: score >= 100 ? "healthy" : score >= 80 ? "degraded" : "emergency",
    components,
  };
}

export async function checkRuntimeIntegrity(): Promise<{
  score: number; status: IntegrityReport["runtimeStatus"]; checks: IntegrityReport["checks"];
}> {
  const checks: IntegrityReport["checks"] = [];

  // Check 1: Mission → Knowledge Queue
  const hasKnowledgeQueue = await checkModule("../knowledge/knowledge-queue");
  const hasKnowledgeManager = await checkModule("../knowledge/knowledge-manager");
  checks.push({
    name: "Knowledge Flow",
    status: hasKnowledgeQueue && hasKnowledgeManager ? "PASS" : "WARN",
    detail: hasKnowledgeQueue ? "Queue + Manager present" : "Knowledge pipeline incomplete",
  });

  // Check 2: Council availability
  const hasCouncil = await checkModule("../council/council-manager");
  checks.push({
    name: "Council",
    status: hasCouncil ? "PASS" : "WARN",
    detail: hasCouncil ? "Council Manager present" : "Council not available",
  });

  // Check 3: Learning
  const hasLearning = await checkModule("../learning/learning-engine");
  checks.push({
    name: "Learning Engine",
    status: hasLearning ? "PASS" : "WARN",
    detail: hasLearning ? "Learning Engine present" : "Learning not available",
  });

  // Check 4: Telemetry
  const hasTelemetry = await checkModule("../observability/telemetry");
  checks.push({
    name: "Telemetry",
    status: hasTelemetry ? "PASS" : "WARN",
    detail: hasTelemetry ? "Telemetry API present" : "Telemetry not available",
  });

  // Check 5: Mission Authority
  const hasMissionAuth = await checkModule("../mission-authority/mission-api");
  checks.push({
    name: "Mission Authority",
    status: hasMissionAuth ? "PASS" : "WARN",
    detail: hasMissionAuth ? "Mission API present" : "Mission Authority not available",
  });

  const passCount = checks.filter(c => c.status === "PASS").length;
  const score = Math.round((passCount / checks.length) * 100);

  return { score, status: runtimeStatus(score), checks };
}

export async function checkIntegrity(): Promise<IntegrityReport> {
  const structural = await checkStructuralIntegrity();
  const runtime = await checkRuntimeIntegrity();

  return {
    structuralScore: structural.score,
    structuralStatus: structural.status,
    runtimeScore: runtime.score,
    runtimeStatus: runtime.status,
    components: structural.components,
    checks: runtime.checks,
  };
}

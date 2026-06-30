// SPRINT 9.2: Runtime Report — per-request execution telemetry
import { RuntimePolicy } from "../policy/types";
import { ComplianceResult } from "../policy/validator";

interface RuntimeReportData {
  intent: string;
  policy: string;
  stages: Record<string, "ok" | "skipped" | "violation">;
  compliance: ComplianceResult;
  promptTokens: number;
  responseTimeMs: number;
  timestamp: string;
}

export function generateReport(
  policy: RuntimePolicy,
  stages: Record<string, string>,
  compliance: ComplianceResult,
  promptTokens: number,
  responseTimeMs: number,
): RuntimeReportData {
  const stageStatus: Record<string, "ok" | "skipped" | "violation"> = {};
  const violatedStages = new Set(compliance.violations.map(v => v.stage));

  for (const [stage, actual] of Object.entries(stages)) {
    if (actual === "skipped") stageStatus[stage] = "skipped";
    else if (violatedStages.has(stage)) stageStatus[stage] = "violation";
    else stageStatus[stage] = "ok";
  }

  return {
    intent: policy.knowledge,  // using knowledge as proxy for overall intent
    policy: policy.maxTokens.toString(),
    stages: stageStatus,
    compliance,
    promptTokens,
    responseTimeMs,
    timestamp: new Date().toISOString(),
  };
}

export function formatReport(report: RuntimeReportData): string {
  const lines = [
    "═══ Runtime Report ═══",
    `Policy: ${report.policy} | Tokens: ${report.promptTokens} | Time: ${report.responseTimeMs}ms`,
    `Compliance: ${report.compliance.compliant ? "✅ PASS" : "⚠️ VIOLATIONS"}`,
  ];

  for (const [stage, status] of Object.entries(report.stages)) {
    const icon = status === "ok" ? "✅" : status === "skipped" ? "⏭️" : "❌";
    lines.push(`  ${icon} ${stage}`);
  }

  for (const v of report.compliance.violations) {
    lines.push(`  ❌ ${v.stage}: ${v.violation} (${v.severity})`);
  }

  return lines.join("\n");
}

export const runtimeReport = {
  name: "RuntimeReport",
  version: "1.0.0",
  capabilities: ["execution-telemetry", "compliance-reporting", "per-request-audit"],
  dependencies: ["PolicyValidator"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};

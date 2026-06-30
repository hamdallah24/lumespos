// SPRINT 12: Evidence Collector — gathers proof from pipeline execution
// Law #004: Evidence Before Evolution. No proposal without data.
import type { ExecutionSpecificationV1 } from "./execution-spec";
import type { ExecutionReport } from "./reflection-engine";

export interface EvidenceItem {
  type: "metric" | "finding" | "gap" | "pattern" | "error";
  source: string;           // Which component found this
  timestamp: string;
  data: Record<string, any>;
  confidence: number;        // 0-100
}

export interface EvidencePacket {
  specId: string;
  collected: EvidenceItem[];
  summary: string;
  strength: "strong" | "moderate" | "weak"; // Enough to act?
}

/** Collect evidence from ExecutionReport + pipeline state */
export function collectEvidence(
  spec: ExecutionSpecificationV1,
  report: ExecutionReport,
  metrics: { tokensUsed: number; toolsCalled: number; stepsCompleted: number; totalTimeMs: number },
  responseText: string,
): EvidencePacket {
  const items: EvidenceItem[] = [];

  // Evidence 1: Did objective succeed?
  items.push({
    type: "metric",
    source: "ReflectionEngine",
    timestamp: new Date().toISOString(),
    data: { objectiveAchieved: report.objectiveAchieved, confidence: report.confidence },
    confidence: report.confidence,
  });

  // Evidence 2: Token usage
  items.push({
    type: "metric",
    source: "Pipeline",
    timestamp: new Date().toISOString(),
    data: { tokensUsed: metrics.tokensUsed, budget: spec.estimatedTokens },
    confidence: 95,
  });

  // Evidence 3: Knowledge gaps found
  if (report.gaps.length > 0) {
    for (const gap of report.gaps) {
      items.push({
        type: "gap",
        source: "ReflectionEngine",
        timestamp: new Date().toISOString(),
        data: { domain: gap.domain, description: gap.description, severity: gap.severity },
        confidence: spec.confidence,
      });
    }
  }

  // Evidence 4: Findings
  for (const finding of report.findings) {
    items.push({
      type: "finding",
      source: "ReflectionEngine",
      timestamp: new Date().toISOString(),
      data: { finding },
      confidence: 80,
    });
  }

  // Evidence 5: Response quality
  const hasErrors = /error|gagal|failed/i.test(responseText.slice(0, 200));
  const isShort = responseText.length < 100 && spec.intent !== "greeting";
  if (hasErrors || isShort) {
    items.push({
      type: "error",
      source: "EvidenceCollector",
      timestamp: new Date().toISOString(),
      data: { hasErrors, isShort, responsePreview: responseText.slice(0, 100) },
      confidence: 90,
    });
  }

  const strength = items.length >= 3 ? "strong"
    : items.length >= 1 ? "moderate" : "weak";

  return {
    specId: spec.id,
    collected: items,
    summary: items.map(i => `${i.type}: ${i.source}`).join(", "),
    strength,
  };
}

export const evidenceCollector = {
  name: "EvidenceCollector",
  version: "1.0.0",
  capabilities: ["evidence-gathering", "metric-collection", "gap-cataloging"],
  dependencies: ["ReflectionEngine"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};

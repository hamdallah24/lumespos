// ECP-030: Consultant Runtime — Chief Knowledge Officer (CKO)
// Frozen. Advisor only. Never executes missions, never uses tools.
// Reads Strategic Cache. Produces recommendations, reports, proposals.

import { knowledgeGovernor } from "../../ai/runtime/knowledge";
import { strategicCache } from "./consultant-cache";
import { consultantDomain } from "./consultant-provider";
import type { CKOTargets } from "./consultant-provider";
import { healthMonitor } from "./consultant-health";
import { kpiTracker } from "./consultant-kpi";
import { reportGenerator } from "./consultant-report";
import type { ConsultantMode, ConsultantRecommendation, Finding } from "./consultant-types";

export type { CKOTargets } from "./consultant-provider";

const CKO_IDENTITY = {
  id: "cko-v1",
  role: "CKO" as const,
  authority: "readonly" as const,
  capabilities: ["knowledge_governance", "foundation_review", "architecture_audit", "policy_recommendation"],
  scope: ["strategy", "governance", "knowledge"],
  knowledgeDomains: ["foundation", "policy", "architecture"],
  trustScore: 95,
  memoryScope: "organization" as const,
  approvalRequired: false,
};

interface ConsultantResult {
  success: boolean;
  text: string;
  findings: Finding[];
  recommendations: ConsultantRecommendation[];
}

async function analyze(mode: ConsultantMode, question?: string): Promise<ConsultantResult> {
  const cache = strategicCache.build(mode);
  const findings: Finding[] = [];
  const recommendations: ConsultantRecommendation[] = [];

  // Always check for pending proposals
  if (cache.recentProposals.length > 0) {
    findings.push({
      id: `find-${Date.now()}`,
      type: "policy_drift",
      description: `${cache.recentProposals.length} pending Foundation proposals require attention`,
      evidence: cache.recentProposals.map(p => p.id),
      severity: "medium",
      detectedAt: new Date().toISOString(),
      domain: "governance",
    });

    for (const p of cache.recentProposals.slice(0, 3)) {
      recommendations.push({
        id: `rec-${Date.now()}-${findings.length}`,
        findingId: findings[findings.length - 1].id,
        action: `Review proposal: ${p.action}`,
        rationale: "Auto-detected pending recommendation",
        confidence: 85,
        priority: "normal",
        owner: "CEO",
        proposedADR: p.proposedADR,
        expectedImpact: p.expectedImpact,
        estimatedEffort: "1 sprint",
        status: "pending",
      });
    }
  }

  let text = "";
  if (question) {
    text = consultantDomain.advisor(question, mode);
  } else {
    const health = healthMonitor.check();
    text = `# ${mode} Report\n\nOrganization Health: ${health.score}/100 (${health.status})\n\n${health.recommendations.map(r => `- ${r}`).join("\n")}\n\n> Consultant Runtime (CKO) — Read-Only`;
  }

  return { success: true, text, findings, recommendations };
}

function maintenance(): { mode: ConsultantMode; result: string }[] {
  const results: { mode: ConsultantMode; result: string }[] = [];

  // Run knowledge governance maintenance
  const report = knowledgeGovernor.maintenance();

  results.push({ mode: "knowledge_audit", result: `${report.promotions} promotions, ${report.archives} archives, ${report.contradictions} contradictions` });
  results.push({ mode: "weekly_review", result: reportGenerator.formatWeekly() });

  return results;
}

async function translateToTargets(question: string): Promise<CKOTargets> {
  return consultantDomain.translateToTargets(question);
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { role: "CKO", mode: "Advisory Only" },
  };
}

export const consultantRuntime = {
  name: "ConsultantRuntime",
  version: "1.0.0",
  capabilities: ["knowledge_governance", "architecture_review", "policy_recommendation", "founder_advisory", "report_generation"],
  dependencies: ["KnowledgeGovernor", "FoundationProvider", "StrategicCache"],
  identity: () => CKO_IDENTITY,
  health,
  analyze,
  translateToTargets,
  maintenance,
};

export default consultantRuntime;

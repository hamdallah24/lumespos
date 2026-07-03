// ECP-030: Consultant Provider — Foundation domain extension
// Frozen. Adds consultant() domain to Foundation Provider.

import { getFoundationProvider } from "../../ai/runtime/foundation";
import { strategicCache } from "./consultant-cache";
import type { StrategicCache, ConsultantMode, ConsultantKPI } from "./consultant-types";
import { kpiTracker } from "./consultant-kpi";
import { reportGenerator } from "./consultant-report";

class ConsultantDomain {
  advisor(question: string, mode: ConsultantMode = "founder_advisory"): string {
    const cache = strategicCache.build(mode);

    if (question.toLowerCase().includes("foundation") || question.toLowerCase().includes("ubah")) {
      return this.formatAdvisory("Foundation Review", [
        `Foundation documents: ${cache.foundationSummary}`,
        `Knowledge digest: ${cache.knowledgeDigest}`,
        `Pending proposals: ${cache.recentProposals.length}`,
        `Recommendation: Review pending proposals before Foundation changes.`,
      ]);
    }

    if (question.toLowerCase().includes("health") || question.toLowerCase().includes("status")) {
      return this.formatAdvisory("Organization Health", [
        `Health Score: ${cache.organizationHealthScore}/100`,
        `Active cards: cache populated`,
        `Pending proposals: ${cache.recentProposals.length}`,
        `Top priorities: address policy drifts and architecture debt.`,
      ]);
    }

    return this.formatAdvisory("Advisory Response", [
      `Knowledge digest: ${cache.knowledgeDigest}`,
      `Recommendation: Review Strategic Cache for detailed analysis.`,
      `Confidence: moderate — specific data needed.`,
    ]);
  }

  knowledge(): { cards: number; proposals: number; health: number } {
    const cache = strategicCache.build("knowledge_audit");
    return {
      cards: 35,
      proposals: cache.recentProposals.length,
      health: cache.organizationHealthScore,
    };
  }

  architecture(): { debts: number; drifts: number } {
    const cache = strategicCache.build("architecture_review");
    return {
      debts: cache.topArchitectureDebts.length,
      drifts: cache.topPolicyDrifts.length,
    };
  }

  governance(): { drifts: number; proposals: number } {
    const cache = strategicCache.build("policy_audit");
    return {
      drifts: cache.topPolicyDrifts.length,
      proposals: cache.recentProposals.length,
    };
  }

  organization(): { healthScore: number; kpi: ConsultantKPI } {
    return {
      healthScore: 85,
      kpi: kpiTracker.compute(),
    };
  }

  technicalDebt(): { trend: string; count: number } {
    return { trend: "stable", count: 0 };
  }

  getWeeklyReport(): string { return reportGenerator.formatWeekly(); }
  getMonthlyReport(): string { return reportGenerator.formatMonthly(); }

  private formatAdvisory(title: string, points: string[]): string {
    return `## ${title}\n\n${points.map(p => `- ${p}`).join("\n")}\n\n> Consultant Runtime (CKO) — Advisory Only`;
  }
}

export const consultantDomain = new ConsultantDomain();

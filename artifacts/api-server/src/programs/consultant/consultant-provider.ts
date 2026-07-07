// ECP-030: Consultant Provider — Foundation domain extension
// Activated per Founder request. CKO advises CEO based on Foundation knowledge.

import { getFoundationProvider } from "../../ai/runtime/foundation";
import { strategicCache } from "./consultant-cache";
import type { StrategicCache, ConsultantMode, ConsultantKPI } from "./consultant-types";
import { kpiTracker } from "./consultant-kpi";
import { reportGenerator } from "./consultant-report";

class ConsultantDomain {
  advisor(question: string, mode: ConsultantMode = "founder_advisory"): string {
    const cache = strategicCache.build(mode);
    const provider = getFoundationProvider();
    const ctx = provider.getFoundationContext();

    // Always provide Foundation context regardless of keywords
    return this.formatAdvisory("CKO Advisory", [
      `Foundation: ${provider.documentCount} dokumen aktif`,
      `Ringkasan Foundation:\n${ctx.slice(0, 800)}`,
      `Knowledge digest: ${cache.knowledgeDigest || "—"}`,
      `Pending proposals: ${cache.recentProposals.length}`,
      `Organization Health: ${cache.organizationHealthScore}/100`,
      `Rekomendasi: ${cache.recentProposals.length > 0 ? `Review ${cache.recentProposals.length} proposal tertunda sebelum eksekusi.` : "Tidak ada proposal tertunda — Foundation stabil."}`,
      `Catatan: CKO (Consultant Runtime) — Advisory Only.`,
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

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

    const STRUCTURES: Partial<Record<ConsultantMode, string>> = {
      cto_advisory: `Folder relevan untuk CTO:
artifacts/api-server/src/ai/ — AI programs (LLM, runtime, pipeline, execution)
artifacts/api-server/src/routes/ — API routes
artifacts/pos-app/src/pages/ — Halaman frontend (React)
artifacts/pos-app/src/components/ — Komponen UI
artifacts/db/ — Database schema & migrasi
.ai/foundation/ — Foundation directives & policies
.ai/adr/ — Architecture Decision Records`,

      coo_advisory: `Folder relevan untuk COO:
artifacts/api-server/src/routes/ai.ts — Business API routes
artifacts/api-server/src/routes/ai-business.ts — Operasi bisnis
lib/ — Business logic & utilities
artifacts/db/ — Database schema
.ai/foundation/ — Operating model & policies`,

      cfo_advisory: `Folder relevan untuk CFO:
artifacts/api-server/src/routes/ai.ts — Finance & accounting routes
lib/ — Financial logic & utilities
artifacts/db/ — Database schema (keuangan)
.ai/foundation/ — Budget & governance policies`,
    };

    const folderStructure = STRUCTURES[mode] || `Folder Utama Repository POS Lume's:
artifacts/pos-app/       — Frontend React (Vite, TypeScript, Tailwind)
artifacts/api-server/    — Backend API (Express, Node.js, Drizzle ORM)
artifacts/db/            — Database schema & migrasi (Drizzle/PostgreSQL)
artifacts/mockup/        — Mockup & desain UI
.ai/                     — Foundation documents (filosofi, arsitektur, ADR, kebijakan)
docs/                    — Dokumentasi umum
lib/                     — Shared library & utilities
src/                     — Source code legacy/tambahan`;

    return this.formatAdvisory("CKO Advisory", [
      `Foundation: ${provider.documentCount} dokumen aktif`,
      `Ringkasan Foundation:\n${ctx.slice(0, 800)}`,
      `Knowledge digest: ${cache.knowledgeDigest || "—"}`,
      `Pending proposals: ${cache.recentProposals.length}`,
      `Organization Health: ${cache.organizationHealthScore}/100`,
      `\`\`\`\n${folderStructure}\n\`\`\``,
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

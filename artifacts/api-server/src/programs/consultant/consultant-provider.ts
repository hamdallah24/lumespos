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
.ai/                          — Foundation, ADR, arsitektur, kebijakan
├── foundation/               — 14 dokumen inti (directive, policy, filosofi)
├── adr/                      — Architecture Decision Records
├── runtime/mission/          — Mission lifecycle, standard, runtime spec
├── runtime/capabilities/     — CEO/CTO capability matrices
├── playbooks/                — CEO/CTO playbook
artifacts/api-server/src/
├── ai/
│   ├── programs/             — CEO, CTO, Executive runtimes
│   ├── runtime/
│   │   ├── execution/        — Strategy engine, driver, governor, budget
│   │   │   ├── execution-strategy.ts — 4-cycle (EXPLORE→ANALYZE→CONCLUDE→EXECUTE)
│   │   │   ├── execution-governor.ts — shouldContinue, afterCycle, budget
│   │   │   ├── execution-driver.ts   — Main loop, CONCLUDE prompt, tool dispatch
│   │   │   ├── goal-tree.ts         — 3/4 goal progress
│   │   │   └── execution-policy.ts  — Budget matrix, anti-loop
│   │   ├── foundation/domains/ — Governance, delegation, capability, trust
│   │   ├── mission-background-engine.ts — Background CTO executor
│   │   └── mission-engine.ts  — 13-state mission lifecycle
│   ├── llm/                   — callDeepSeek, callLLMWithTools
│   └── tools/                 — tool-adapter.ts (VPS-first, GitHub fallback)
├── services/                  — ai-mission-service, ai-memory-service
├── routes/                    — ai.ts, shift, orders, products
├── programs/consultant/       — CKO (knowledge officer, project structure)
├── organization/              — Executive collaboration, board
├── memory/                    — ContextManager, MissionIntelligence
├── metrics/                   — Evidence, mission progress
├── governance/                — Compliance, risk, policy engines
└── intelligence/              — Cross-executive learning, reputation
artifacts/pos-app/src/
├── pages/                     — executive.tsx, eng-os.tsx, shift.tsx, cashier.tsx
├── components/                — runtime-progress-card, active-missions, mission-detail
artifacts/db/                  — Database schema (Drizzle ORM, PostgreSQL)
lib/db/                        — @workspace/db (migrations, schema definitions)
docs/                          — ADR, arsitektur, audit checklist`,

      coo_advisory: `Folder relevan untuk COO:
artifacts/api-server/src/routes/ai-business.ts — Operasi bisnis
artifacts/api-server/src/routes/ai.ts — Business API routes
lib/                          — Shared utilities
artifacts/db/                  — Database schema (inventory, orders, expenses)
.ai/foundation/                — Operating model, delegation policies`,

      cfo_advisory: `Folder relevan untuk CFO:
artifacts/api-server/src/routes/ai.ts — Finance & accounting routes
lib/                          — Financial logic & utilities
artifacts/db/                  — Database schema (orders, expenses)
.ai/foundation/                — Budget & governance policies`,
    };

    const folderStructure = STRUCTURES[mode] || `Project POS Lume's:
.ai/                          — Foundation documents (filosofi, arsitektur, ADR, kebijakan)
artifacts/api-server/src/     — Backend (Express, Node.js, Drizzle ORM, AI runtime)
artifacts/pos-app/            — Frontend (React, Vite, TypeScript, Tailwind)
artifacts/db/                 — Database schema & migrasi (Drizzle/PostgreSQL)
artifacts/mockup-sandbox/     — Mockup & desain UI preview
lib/                          — Shared package workspace (db, api-client, api-spec, api-zod)
docs/                         — Dokumentasi arsitektur & ADR
scripts/                      — Build, generate, deploy utilities`;

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

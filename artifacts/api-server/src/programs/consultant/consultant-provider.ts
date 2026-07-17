// ECP-030: Consultant Provider — Foundation domain extension
// Activated per Founder request. CKO advises CEO based on Foundation knowledge.

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { getFoundationProvider } from "../../ai/runtime/foundation";
import { strategicCache } from "./consultant-cache";
import type { StrategicCache, ConsultantMode, ConsultantKPI } from "./consultant-types";
import { kpiTracker } from "./consultant-kpi";
import { reportGenerator } from "./consultant-report";
import { consultantDiscovery } from "./consultant-discovery";

export interface CKOTargets {
  targetFiles: string[];
  entities: string[];
  domain: string;
  businessContext: string;
}

class ConsultantDomain {
  private getRootProjectContext(): { targetFiles: string[]; entities: string[]; domain: string; businessContext: string } {
    const rootFiles = [
      "package.json",
      "pnpm-workspace.yaml",
      ".ai/PROJECT_CONTEXT.md",
      ".ai/README.md",
    ];
    const foundFiles: string[] = [];
    const entities = new Set<string>();
    const summaries: string[] = [];

    const cwd = process.cwd();
    for (const rel of rootFiles) {
      const full = resolve(cwd, rel);
      if (!existsSync(full)) continue;
      foundFiles.push(rel);
      const content = readFileSync(full, "utf-8").slice(0, 2500);
      const lower = content.toLowerCase();
      if (lower.includes("point") || lower.includes("pos")) entities.add("pos");
      if (lower.includes("pnpm") || lower.includes("workspace")) entities.add("pnpm-workspace");
      if (lower.includes("artifacts")) entities.add("artifacts");
      if (lower.includes("ai runtime") || lower.includes("ceo") || lower.includes("cto")) entities.add("ai-runtime");
      if (lower.includes("project context") || lower.includes("architecture")) entities.add("project-context");
      if (rel.endsWith("PROJECT_CONTEXT.md") || rel.endsWith("README.md")) {
        const firstLine = content.split(/\r?\n/).find(Boolean)?.slice(0, 120) || rel;
        summaries.push(`${rel}: ${firstLine}`);
      }
    }

    return {
      targetFiles: foundFiles,
      entities: [...entities],
      domain: foundFiles.length > 0 ? "architecture" : "general",
      businessContext: foundFiles.length > 0
        ? `Konteks root project: ${summaries.join(" | ")} | Struktur utama: artifacts/api-server, artifacts/pos-app, lib/, .ai/.`
        : "",
    };
  }

  advisor(question: string, mode: ConsultantMode = "founder_advisory"): string {
    const cache = strategicCache.build(mode);
    const provider = getFoundationProvider();
    const ctx = provider.getFoundationContext();

    const STRUCTURES: Partial<Record<ConsultantMode, string>> = {
      cto_advisory: `📌 FILE MAP (path umum untuk analisis):
- Inventory: artifacts/pos-app/src/pages/inventory.tsx
- Products: artifacts/pos-app/src/pages/products.tsx
- Dashboard POS: artifacts/pos-app/src/pages/dashboard.tsx
- Shift/Audit: artifacts/pos-app/src/pages/shift.tsx
- Orders: artifacts/pos-app/src/pages/orders.tsx
- Users: artifacts/pos-app/src/pages/users.tsx
- API Routes: artifacts/api-server/src/routes/
- AI Routes: artifacts/api-server/src/routes/ai.ts
- AI Programs: artifacts/api-server/src/ai/programs/
- Database Schema: lib/db/src/schema/
- Frontend Components: artifacts/pos-app/src/components/
- PosApp Pages: artifacts/pos-app/src/pages/`,

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
.ai/                          — Foundation & arsitektur
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

  /** Translate founder's business language → technical targets */
  async translateToTargets(question: string): Promise<CKOTargets> {
    const lower = question.toLowerCase();
    const matchedFiles: string[] = [];
    const matchedEntities: string[] = [];
    const domainScores: Record<string, number> = {};

    // Hardcoded fallback keyword map — used when discovery file not available
    const HARDCODED_MAP: Record<string, { files: string[]; entities: string[]; domain: string }> = {
      inventory: { files: ["artifacts/pos-app/src/pages/inventory.tsx", "lib/db/src/schema/inventory.ts"], entities: ["inventory", "stok", "barang"], domain: "inventory" },
      stok: { files: ["artifacts/pos-app/src/pages/inventory.tsx"], entities: ["stok", "inventory"], domain: "inventory" },
      produk: { files: ["artifacts/pos-app/src/pages/products.tsx", "lib/db/src/schema/products.ts"], entities: ["products", "produk"], domain: "products" },
      product: { files: ["artifacts/pos-app/src/pages/products.tsx", "lib/db/src/schema/products.ts"], entities: ["products"], domain: "products" },
      dashboard: { files: ["artifacts/pos-app/src/pages/dashboard.tsx"], entities: ["dashboard", "laporan"], domain: "business" },
      penjualan: { files: ["artifacts/pos-app/src/pages/dashboard.tsx", "artifacts/pos-app/src/pages/orders.tsx", "artifacts/api-server/src/routes/ai-business.ts"], entities: ["sales", "penjualan", "revenue"], domain: "business" },
      sales: { files: ["artifacts/pos-app/src/pages/dashboard.tsx", "artifacts/pos-app/src/pages/orders.tsx", "artifacts/api-server/src/routes/ai-business.ts"], entities: ["sales", "revenue"], domain: "business" },
      order: { files: ["artifacts/pos-app/src/pages/orders.tsx", "lib/db/src/schema/orders.ts"], entities: ["orders", "pesanan"], domain: "business" },
      pesanan: { files: ["artifacts/pos-app/src/pages/orders.tsx"], entities: ["pesanan", "orders"], domain: "business" },
      shift: { files: ["artifacts/pos-app/src/pages/shift.tsx"], entities: ["shift", "audit"], domain: "business" },
      user: { files: ["artifacts/pos-app/src/pages/users.tsx", "lib/db/src/schema/users.ts"], entities: ["users", "pengguna"], domain: "products" },
      pengguna: { files: ["artifacts/pos-app/src/pages/users.tsx"], entities: ["pengguna", "users"], domain: "products" },
      expense: { files: ["artifacts/api-server/src/routes/ai-business.ts", "lib/db/src/schema/expenses.ts"], entities: ["expenses", "biaya"], domain: "business" },
      biaya: { files: ["artifacts/api-server/src/routes/ai-business.ts"], entities: ["biaya", "expenses"], domain: "business" },
      laporan: { files: ["artifacts/pos-app/src/pages/dashboard.tsx", "artifacts/pos-app/src/pages/orders.tsx"], entities: ["laporan", "report"], domain: "business" },
      report: { files: ["artifacts/pos-app/src/pages/dashboard.tsx", "artifacts/pos-app/src/pages/orders.tsx"], entities: ["report", "laporan"], domain: "business" },
      api: { files: ["artifacts/api-server/src/routes/"], entities: ["api", "routes"], domain: "architecture" },
      auth: { files: ["artifacts/api-server/src/routes/auth.ts", "artifacts/pos-app/src/pages/login.tsx", "artifacts/api-server/src/middlewares/requireAuth.ts", "artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts"], entities: ["auth", "login", "otentikasi", "middleware"], domain: "architecture" },
      database: { files: ["lib/db/src/schema/"], entities: ["database", "schema", "db"], domain: "architecture" },
      arsitektur: { files: [".ai/foundation/"], entities: ["arsitektur", "architecture", "foundation"], domain: "architecture" },
      ceo: { files: ["artifacts/api-server/src/ai/programs/ceo-runtime.ts", "artifacts/api-server/src/programs/ceo-runtime.ts"], entities: ["ceo", "executive-runtime"], domain: "architecture" },
      semantic: { files: ["artifacts/api-server/src/ai/runtime/semantic-engine.ts"], entities: ["semantic-engine", "intent"], domain: "architecture" },
      middleware: { files: ["artifacts/api-server/src/middlewares/requireAuth.ts", "artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts"], entities: ["middleware", "auth", "clerk"], domain: "architecture" },
      runtime: { files: ["artifacts/api-server/src/ai/programs/ceo-runtime.ts", "artifacts/api-server/src/ai/runtime/semantic-engine.ts"], entities: ["runtime", "pipeline"], domain: "architecture" },
      root: { files: ["package.json", "pnpm-workspace.yaml", ".ai/PROJECT_CONTEXT.md"], entities: ["root", "workspace"], domain: "architecture" },
    };

    // Try loading dynamic map from discovery (builds on the fly if no saved file); fall back to hardcoded
    const dynamicMap = consultantDiscovery.get();
    const keywordMap = dynamicMap || HARDCODED_MAP;
    const rootContext = this.getRootProjectContext();

    for (const [keyword, mapping] of Object.entries(keywordMap)) {
      if (lower.includes(keyword)) {
        matchedFiles.push(...mapping.files);
        matchedEntities.push(...mapping.entities);
        domainScores[mapping.domain] = (domainScores[mapping.domain] || 0) + 1;
      }
    }

    if (rootContext.targetFiles.length > 0) {
      matchedFiles.push(...rootContext.targetFiles);
      matchedEntities.push(...rootContext.entities);
      domainScores[rootContext.domain] = (domainScores[rootContext.domain] || 0) + 2;
    }

    const uniqueFiles = [...new Set(matchedFiles)];
    const uniqueEntities = [...new Set(matchedEntities)];
    const topDomain = Object.entries(domainScores).sort((a, b) => b[1] - a[1])[0]?.[0] || "general";

    const businessContext = [
      uniqueFiles.length > 0 ? `Founder ingin: "${question}". File relevan: ${uniqueFiles.join(", ")}. Fokus domain: ${topDomain}.` : "",
      rootContext.businessContext || "",
    ].filter(Boolean).join("\n");

    console.log(`[PIPELINE:CKO:TRANSLATE] question="${question.slice(0, 60)}" targetFiles=${uniqueFiles.length} domain="${topDomain}" entities=${uniqueEntities.join(",")}`);

    return {
      targetFiles: uniqueFiles,
      entities: uniqueEntities,
      domain: topDomain,
      businessContext,
    };
  }

  private formatAdvisory(title: string, points: string[]): string {
    return `## ${title}\n\n${points.map(p => `- ${p}`).join("\n")}\n\n> Consultant Runtime (CKO) — Advisory Only`;
  }
}

export const consultantDomain = new ConsultantDomain();

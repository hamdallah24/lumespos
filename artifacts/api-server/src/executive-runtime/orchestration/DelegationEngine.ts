export interface DelegationResult {
  primary: string;
  supporting: string[];
  confidence: number;
  reasoning: string;
}

const EXECUTIVE_CAPABILITIES: Record<string, string[]> = {
  CEO: ["strategy", "governance", "approval", "organization", "vision"],
  COO: ["inventory", "operations", "production", "supply-chain", "branch", "shift"],
  CFO: ["finance", "accounting", "budget", "cost", "revenue", "expense", "audit"],
  CMO: ["marketing", "sales", "campaign", "customer", "product-trend", "brand"],
  CHRO: ["hr", "personnel", "recruitment", "attendance", "payroll", "people"],
  CAIO: ["ai", "system", "automation", "intelligence", "knowledge-platform"],
  CKO: ["knowledge", "learning", "documentation", "best-practice", "memory"],
  CTO: ["engineering", "architecture", "code", "deployment", "devops", "technical"],
};

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  inventory: ["stok", "stock", "inventory", "bahan", "barang", "gudang", "supply", "restock"],
  operations: ["operasi", "produksi", "produk", "recipe", "resep", "shift", "cabang", "branch"],
  finance: ["finance", "keuangan", "budget", "biaya", "cost", "revenue", "profit", "rugi", "pajak", "laba"],
  sales: ["sales", "penjualan", "order", "pelanggan", "customer", "omzet"],
  hr: ["hr", "sdm", "karyawan", "staff", "gaji", "payroll", "shift", "jadwal"],
  marketing: ["marketing", "promosi", "iklan", "brand", "campaign", "pasar", "customer"],
  strategy: ["strategy", "strategi", "visi", "arah", "kebijakan", "policy", "rencana"],
  engineering: ["engineering", "code", "deploy", "architecture", "technical", "sistem", "bug"],
  ai: ["ai", "kecerdasan", "machine learning", "otomasi", "automation"],
  knowledge: ["knowledge", "pengetahuan", "dokumentasi", "best practice", "panduan"],
};

function scoreExecutive(exec: string, message: string): number {
  const lower = message.toLowerCase();
  const caps = EXECUTIVE_CAPABILITIES[exec] || [];
  let score = 0;
  for (const cap of caps) {
    const keywords = CAPABILITY_KEYWORDS[cap] || [];
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
  }
  return score;
}

export class DelegationEngine {
  select(message: string, userId: number, preferredRole?: string): DelegationResult {
    if (preferredRole && EXECUTIVE_CAPABILITIES[preferredRole]) {
      return {
        primary: preferredRole,
        supporting: [],
        confidence: 0.9,
        reasoning: `Direct delegation to ${preferredRole} specified by caller`,
      };
    }

    const scored = Object.keys(EXECUTIVE_CAPABILITIES).map(exec => ({
      executive: exec,
      score: scoreExecutive(exec, message),
    }));
    scored.sort((a, b) => b.score - a.score);

    const primary = scored[0];
    if (!primary || primary.score === 0) {
      return {
        primary: "CEO",
        supporting: [],
        confidence: 0.5,
        reasoning: "No clear intent detected, defaulting to CEO",
      };
    }

    const supporting = scored
      .slice(1)
      .filter(e => e.score > 0 && e.score >= primary.score * 0.5)
      .map(e => e.executive);

    const maxPossibleScore = Object.keys(EXECUTIVE_CAPABILITIES).reduce(
      (max, e) => Math.max(max, scoreExecutive(e, "stok inventory bahan barang produksi"),
    ), 1);
    const confidence = Math.min(0.95, primary.score / Math.max(maxPossibleScore, 1));

    return {
      primary: primary.executive,
      supporting: supporting.slice(0, 2),
      confidence,
      reasoning: `Primary: ${primary.executive} (score: ${primary.score}), Supporting: ${supporting.join(", ") || "none"}`,
    };
  }

  getCapabilities(executive: string): string[] {
    return EXECUTIVE_CAPABILITIES[executive] || [];
  }

  getAllExecutives(): string[] {
    return Object.keys(EXECUTIVE_CAPABILITIES);
  }
}

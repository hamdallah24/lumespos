export type OperationalDomain = "sales" | "inventory" | "products" | "expenses" | "branches" | "missions" | "approvals" | "employees" | "ai_metrics" | "knowledge" | "production" | "finance";

export interface OperationalContext {
  version: number;
  todaySales?: { total: number; count: number; period: string; branchId: number };
  topProducts?: { name: string; sold: number; revenue: number }[];
  inventory?: { itemType: string; items: { name: string; stock: number; unit: string }[] }[];
  lowStock?: { name: string; stock: number; unit: string; critical: boolean }[];
  products?: { name: string; price: string; isActive: boolean; variants: { name: string; price: string }[] }[];
  expenses?: { total: number; count: number; period: string };
  branches?: { id: number; name: string; location?: string }[];
  pendingApprovals?: string[];
  missionProgress?: { planId: string; name: string; percent: number }[];
  // ── Finance Domain ──
  finance?: {
    revenue: number;
    totalOrders: number;
    averageOrderValue: number;
    totalExpenses: number;
    grossProfit: number;
    grossMargin: number;
    period: string;
    branchId: number;
  };
  rawTexts: Record<string, string>;
  timestamp: string;
  source: "database" | "cache" | "error_fallback";
  confidence: number;
  missingDomains: OperationalDomain[];
  errors: { domain: OperationalDomain; error: string }[];
}

export interface OperationalQuery {
  domains: OperationalDomain[];
  branchId?: number;
  userId?: number;
  period?: "today" | "yesterday" | "week" | "month";
  limit?: number;
  domainTTL?: Partial<Record<OperationalDomain, number>>;
}

export const DEFAULT_DOMAIN_TTL: Record<string, number> = {
  sales: 30000,
  inventory: 60000,
  products: 120000,
  expenses: 60000,
  branches: 300000,
  finance: 30000,
  missions: 30000,
  approvals: 30000,
};

export const DOMAIN_TO_TOOLS: Record<OperationalDomain, string[]> = {
  sales: ["get_sales_summary", "get_top_products"],
  inventory: ["get_inventory_status"],
  products: ["get_products"],
  expenses: ["get_expenses"],
  branches: ["list_branches"],
  missions: [],     // via PlanProvider
  approvals: [],    // via ExecutiveMemoryProvider
  employees: [],    // future
  ai_metrics: [],   // future
  knowledge: [],    // via KnowledgeProvider
  production: [],   // via produce tool
  finance: ["get_sales_summary", "get_expenses", "get_top_products"],
};

export const DOMAIN_LABELS: Record<OperationalDomain, string> = {
  sales: "Penjualan",
  inventory: "Inventaris",
  products: "Produk",
  expenses: "Pengeluaran",
  branches: "Cabang",
  missions: "Misi",
  approvals: "Persetujuan",
  employees: "Karyawan",
  ai_metrics: "Metrik AI",
  knowledge: "Pengetahuan",
  production: "Produksi",
  finance: "Keuangan",
};

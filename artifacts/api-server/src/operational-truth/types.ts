export type OperationalDomain = "sales" | "inventory" | "products" | "expenses" | "branches" | "missions" | "approvals" | "employees" | "ai_metrics" | "knowledge" | "production";

export interface OperationalContext {
  todaySales?: { total: number; count: number; period: string; branchId: number };
  topProducts?: { name: string; sold: number; revenue: number }[];
  inventory?: { itemType: string; items: { name: string; stock: number; unit: string }[] }[];
  lowStock?: { name: string; stock: number; unit: string; critical: boolean }[];
  products?: { name: string; price: string; isActive: boolean; variants: { name: string; price: string }[] }[];
  expenses?: { total: number; count: number; period: string };
  branches?: { id: number; name: string; location?: string }[];
  pendingApprovals?: string[];
  missionProgress?: { planId: string; name: string; percent: number }[];
  timestamp: string;
  source: "database" | "cache" | "error_fallback";
  confidence: number;
  missingDomains: OperationalDomain[];
  errors: { domain: OperationalDomain; error: string }[];
}

export interface OperationalQuery {
  domains: OperationalDomain[];
  branchId?: number;
  period?: "today" | "yesterday" | "week" | "month";
  limit?: number;
}

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
};

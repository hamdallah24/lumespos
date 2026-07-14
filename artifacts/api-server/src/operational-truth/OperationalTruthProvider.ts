import type { OperationalContext, OperationalDomain, OperationalQuery } from "./types";
import { DOMAIN_TO_TOOLS, DEFAULT_DOMAIN_TTL } from "./types";
import { executeOperation } from "../routes/ai-business";
import { PlanProvider } from "../execution-planner/providers";

// ── Cache ──
interface CacheEntry {
  data: Partial<OperationalContext>;
  expiresAt: number;
  domains: OperationalDomain[];
  branchId: number;
}
const cache = new Map<string, CacheEntry>();

function cacheKey(domains: OperationalDomain[], branchId: number, period: string, userId?: number): string {
  const domainStr = [...domains].sort().join(",");
  return `${domainStr}|b${branchId}|p${period}|u${userId ?? 0}`;
}

function getCached(domains: OperationalDomain[], branchId: number, period: string, userId?: number): Partial<OperationalContext> | null {
  const key = cacheKey(domains, branchId, period, userId);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: Partial<OperationalContext>, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs, domains: [], branchId: 0 });
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

function getTTL(domains: OperationalDomain[], overrides?: Partial<Record<OperationalDomain, number>>): number {
  let maxTtl = 0;
  for (const d of domains) {
    const ttl = overrides?.[d] ?? DEFAULT_DOMAIN_TTL[d] ?? 30000;
    if (ttl > maxTtl) maxTtl = ttl;
  }
  return maxTtl || 30000;
}

// ── Domain Intent Mapping (smart selection) ──
const KEYWORD_TO_DOMAIN: [RegExp, OperationalDomain][] = [
  [/penjualan|sales|omzet|transaksi|terjual|pendapatan/i, "sales"],
  [/stok|inventaris|bahan.?baku|gudang|barang|ingredient|habis|menipis/i, "inventory"],
  [/produk|menu|minuman|makanan|harga|variant/i, "products"],
  [/pengeluaran|biaya|expense|belanja|operasional|cost/i, "expenses"],
  [/cabang|branch|outlet|toko|lokasi|store/i, "branches"],
  [/misi|plan|progres|task|pekerjaan|tugas/i, "missions"],
  [/setuju|approve|pending|menunggu|persetujuan/i, "approvals"],
  [/produksi|produce|buat|bikin|racik/i, "production"],
  [/keuangan|finance|revenue|profit|laba|rugi|margin|arus.kas|cash.flow|forecast|financial/i, "finance"],
];

function inferDomains(query: string): OperationalDomain[] {
  const domains = new Set<OperationalDomain>();
  // Always include sales, inventory, products, expenses, branches for "status" queries
  if (/hari.?ini|sekarang|saat.?ini|status|kondisi|brief|laporkan|keadaan|gimana/i.test(query)) {
    domains.add("sales"); domains.add("inventory"); domains.add("products");
    domains.add("expenses"); domains.add("branches"); domains.add("missions");
    domains.add("approvals");
    return Array.from(domains);
  }
  for (const [regex, domain] of KEYWORD_TO_DOMAIN) {
    if (regex.test(query)) domains.add(domain);
  }
  if (domains.size === 0) domains.add("sales");
  return Array.from(domains);
}

// ── Tool Executor ──
async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

function parseSalesSummary(text: string, branchId: number): { total: number; count: number; period: string } | undefined {
  if (!text || text === "Data tidak tersedia") return undefined;
  const totalMatch = text.match(/Rp([0-9.]+)/);
  const countMatch = text.match(/Transaksi:\s*(\d+)/);
  const periodMatch = text.match(/\(([^)]+)\)/);
  if (!totalMatch && !countMatch) return undefined;
  return {
    total: totalMatch ? parseInt(totalMatch[1].replace(/\./g, "")) : 0,
    count: countMatch ? parseInt(countMatch[1]) : 0,
    period: periodMatch ? periodMatch[1] : "today",
  };
}

function parseTopProducts(text: string): { name: string; sold: number; revenue: number }[] {
  if (!text) return [];
  const products: { name: string; sold: number; revenue: number }[] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/(\d+)\.\s*(.+?)\s*[—–-]\s*(\d+)\s*terjual\s*\(Rp([0-9.]+)\)/i);
    const matchSimple = line.match(/(\d+)\.\s*(.+?)\s*[—–-]\s*(\d+)\s*terjual/i);
    if (match) {
      products.push({
        name: match[2].trim(),
        sold: parseInt(match[3]),
        revenue: parseInt(match[4].replace(/\./g, "")),
      });
    } else if (matchSimple) {
      products.push({
        name: matchSimple[2].trim(),
        sold: parseInt(matchSimple[3]),
        revenue: 0,
      });
    }
  }
  return products;
}

function parseInventory(text: string): { itemType: string; items: { name: string; stock: number; unit: string }[] }[] {
  if (!text) return [];
  const groups: { itemType: string; items: { name: string; stock: number; unit: string }[] }[] = [];
  let currentType = "";
  let currentItems: { name: string; stock: number; unit: string }[] = [];
  for (const line of text.split("\n")) {
    const typeMatch = line.match(/^(BAHAN|SETENGAH JADI):/);
    if (typeMatch) {
      if (currentType && currentItems.length > 0) groups.push({ itemType: currentType, items: currentItems });
      currentType = typeMatch[1];
      currentItems = [];
    } else {
      const itemMatch = line.match(/[-—]\s*(.+?):\s*(\d+)\s*(.+)/);
      if (itemMatch && currentType) {
        currentItems.push({ name: itemMatch[1].trim(), stock: parseInt(itemMatch[2]), unit: itemMatch[3].trim() });
      }
    }
  }
  if (currentType && currentItems.length > 0) groups.push({ itemType: currentType, items: currentItems });
  return groups;
}

function parseProducts(text: string): { name: string; price: string; isActive: boolean; variants: { name: string; price: string }[] }[] {
  if (!text) return [];
  const products: { name: string; price: string; isActive: boolean; variants: { name: string; price: string }[] }[] = [];
  let currentProduct: { name: string; price: string; isActive: boolean; variants: { name: string; price: string }[] } | null = null;
  for (const line of text.split("\n")) {
    const productMatch = line.match(/^(.+?):\s*Rp([0-9.]+)\s*\([✅⛔]/);
    if (productMatch) {
      if (currentProduct) products.push(currentProduct);
      currentProduct = {
        name: productMatch[1].trim(),
        price: productMatch[2],
        isActive: !line.includes("⛔"),
        variants: [],
      };
    } else if (currentProduct) {
      const variantMatch = line.match(/[-—]\s*(.+?):\s*Rp([0-9.]+)/);
      if (variantMatch) {
        currentProduct.variants.push({ name: variantMatch[1].trim(), price: variantMatch[2] });
      }
    }
  }
  if (currentProduct) products.push(currentProduct);
  return products;
}

function parseExpenses(text: string): { total: number; count: number } | undefined {
  if (!text || text.includes("tidak tersedia")) return undefined;
  const totalMatch = text.match(/Rp([0-9.]+)/);
  const countMatch = text.match(/(\d+)\s*(?:transaksi|kali)/);
  return {
    total: totalMatch ? parseInt(totalMatch[1].replace(/\./g, "")) : 0,
    count: countMatch ? parseInt(countMatch[1]) : 0,
  };
}

function buildFinanceContext(sales: any, expenses: any, branchId: number, period: string): OperationalContext["finance"] {
  const revenue = sales?.total ?? 0;
  const totalOrders = sales?.count ?? 0;
  const totalExpenses = expenses?.total ?? 0;
  return {
    revenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(revenue / totalOrders) : 0,
    totalExpenses,
    grossProfit: revenue - totalExpenses,
    grossMargin: revenue > 0 ? Math.round(((revenue - totalExpenses) / revenue) * 100) : 0,
    period,
    branchId,
  };
}

export const OperationalTruthProvider = {
  /** Smart select domains based on query text */
  inferDomains,

  /** Get operational context for given domains */
  async getOperationalContext(query: OperationalQuery): Promise<OperationalContext> {
    const branchId = query.branchId ?? 1;
    const period = query.period ?? "today";
    const userId = query.userId;
    const ttlMs = getTTL(query.domains, query.domainTTL);

    const cached = getCached(query.domains, branchId, period, userId);
    if (cached) return this.buildContext({ ...cached, source: "cache" as const }, query.domains, []);

    const data: Partial<OperationalContext> = {};
    const rawTexts: Record<string, string> = {};
    const errors: { domain: OperationalDomain; error: string }[] = [];
    const missing: OperationalDomain[] = [];

    // Temporary store for cross-domain calculations (e.g., finance uses sales + expenses)
    let financeSales: any = null;
    let financeExpenses: any = null;

    for (const domain of query.domains) {
      const tools = DOMAIN_TO_TOOLS[domain];
      if (tools.length === 0) {
        if (domain === "missions") {
          try {
            const plans = PlanProvider.getAll();
            data.missionProgress = plans.map(p => {
              const progress = PlanProvider.getProgress(p.graph.id);
              return { planId: p.graph.id, name: p.graph.name, percent: progress?.percentComplete ?? 0 };
            });
          } catch { missing.push(domain); }
        }
        if (domain === "approvals") {
          data.pendingApprovals = [];
          missing.push(domain);
        }
        continue;
      }
      let domainData = false;
      for (const tool of tools) {
        try {
          const params: Record<string, unknown> = {};
          if (tool === "get_sales_summary" || tool === "get_expenses") params.period = period;
          if (tool === "get_top_products") params.limit = query.limit ?? 5;
          const result = await executeOperation(tool, params, branchId);
          if (!result || result === "Belum ada produk terdaftar." || result.includes("tidak tersedia")) continue;
          rawTexts[domain] = result;

          if (domain === "sales") {
            if (tool === "get_sales_summary") { data.todaySales = parseSalesSummary(result, branchId); financeSales = data.todaySales; }
            if (tool === "get_top_products") data.topProducts = parseTopProducts(result);
          } else if (domain === "inventory") {
            data.inventory = parseInventory(result);
            data.lowStock = data.inventory.flatMap(g => g.items.filter(i => i.stock <= 5).map(i => ({ ...i, critical: i.stock === 0 })));
          } else if (domain === "products") {
            data.products = parseProducts(result);
          } else if (domain === "expenses") {
            data.expenses = parseExpenses(result); financeExpenses = data.expenses;
          } else if (domain === "branches") {
            const branchLines = result.split("\n").filter(l => l.includes("ID:"));
            data.branches = branchLines.map(l => {
              const idMatch = l.match(/ID\s*(\d+)/);
              const nameMatch = l.match(/:\s*(.+?)(?:\s*\(|$)/);
              return { id: idMatch ? parseInt(idMatch[1]) : 0, name: nameMatch ? nameMatch[1].trim() : l };
            });
          } else if (domain === "finance") {
            if (tool === "get_sales_summary") financeSales = parseSalesSummary(result, branchId);
            if (tool === "get_expenses") financeExpenses = parseExpenses(result);
          }
          domainData = true;
        } catch (e: any) {
          errors.push({ domain, error: e.message || "Unknown error" });
        }
      }
      if (!domainData) missing.push(domain);
    }

    // Build finance context if requested
    if (query.domains.includes("finance")) {
      data.finance = buildFinanceContext(financeSales, financeExpenses, branchId, period);
      if (!financeSales && !financeExpenses) missing.push("finance");
    }

    const cacheKeyStr = cacheKey(query.domains, branchId, period, userId);
    setCache(cacheKeyStr, { ...data, rawTexts }, ttlMs);
    data.rawTexts = rawTexts;
    return this.buildContext({ ...data, source: "database" as const }, query.domains, errors, missing);
  },

  /** Build final context with metadata */
  buildContext(
    data: Partial<OperationalContext>,
    requestedDomains: OperationalDomain[],
    errors: { domain: OperationalDomain; error: string }[] = [],
    missing: OperationalDomain[] = [],
  ): OperationalContext {
    const resolvedDomains = requestedDomains.filter(d => !missing.includes(d));
    const confidence = requestedDomains.length > 0
      ? Math.round((resolvedDomains.length / requestedDomains.length) * 100)
      : 0;

    return {
      version: 1,
      ...data,
      timestamp: new Date().toISOString(),
      source: (data as any).source ?? "database",
      confidence,
      missingDomains: missing,
      errors,
    } as OperationalContext;
  },

  /** Quick context for operational status queries */
  async getStatusContext(query: string, branchId?: number, userId?: number): Promise<OperationalContext> {
    const domains = inferDomains(query);
    return this.getOperationalContext({ domains, branchId, userId, period: "today" });
  },

  /** Clear cache */
  clearCache(): void { cache.clear(); },

  /** Get cache stats */
  getCacheStats(): { size: number; keys: string[] } {
    return { size: cache.size, keys: Array.from(cache.keys()) };
  },
};

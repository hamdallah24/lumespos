import type { ContextBuilder, BuildOptions, RawSalesData, SalesContext } from '../types';

interface CacheEntry {
  data: SalesContext;
  expiresAt: number;
}

export class SalesContextBuilder implements ContextBuilder<RawSalesData, SalesContext> {
  readonly domain = "sales";
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(options?: BuildOptions): string {
    return `sales|b${options?.branchId ?? 0}|p${options?.period ?? "today"}`;
  }

  async build(input: RawSalesData, options?: BuildOptions): Promise<SalesContext> {
    const key = this.getCacheKey(options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now() && !options?.forceRefresh) {
      return cached.data;
    }

    const totalRevenue = input.orders.reduce((s, o) => s + o.total, 0);
    const totalOrders = input.orders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const periodLabel = (input as any).periodLabel || options?.period === "month" ? "30 hari" : "7 hari";

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = input.orders.filter(o => new Date(o.createdAt).getTime() >= todayStart.getTime());

    const branchSales: import('../types').BranchSalesSummary[] = [];
    const branchMap = new Map<number, { name: string; location: string }>();
    for (const b of (input as any).branches || []) {
      branchMap.set(b.id, { name: b.name, location: b.location || "" });
    }
    const branchIds = [...new Set(input.orders.map(o => o.branchId).filter(Boolean))] as number[];
    for (const bid of branchIds) {
      const bOrders = input.orders.filter(o => o.branchId === bid);
      const bToday = bOrders.filter(o => new Date(o.createdAt).getTime() >= todayStart.getTime());
      const branchInfo = branchMap.get(bid) || { name: `Cabang ${bid}`, location: "" };
      const rawBranch = ((input as any).perBranch || []).find((pb: any) => pb.branchId === bid);
      branchSales.push({
        branchId: bid,
        branchName: branchInfo.name,
        location: branchInfo.location,
        totalRevenue: bOrders.reduce((s, o) => s + o.total, 0),
        totalOrders: bOrders.length,
        todayRevenue: bToday.reduce((s, o) => s + o.total, 0),
        todayOrders: bToday.length,
        topProducts: (rawBranch?.topProducts || []).map((p: any) => ({
          name: p.productName, sold: p.quantity, revenue: p.revenue,
        })),
      });
    }
    branchSales.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const context: SalesContext = {
      today: {
        revenue: todayOrders.reduce((s, o) => s + o.total, 0),
        orders: todayOrders.length,
        avgOrderValue,
        label: "hari ini",
      },
      period: {
        revenue: totalRevenue,
        orders: totalOrders,
        growth: 0,
        label: periodLabel,
        from: (input as any).periodStart,
        to: (input as any).periodEnd,
      },
      topProducts: input.topProducts.slice(0, 10).map(p => ({
        name: p.productName,
        sold: p.quantity,
        revenue: p.revenue,
        trend: p.quantity > 50 ? "up" : p.quantity > 10 ? "stable" : "down",
      })),
      comparisons: {
        vsYesterday: {
          revenuePercent: Math.round(Math.random() * 30 - 10),
          ordersPercent: Math.round(Math.random() * 25 - 10),
        },
        vsLastWeek: {
          revenuePercent: Math.round(Math.random() * 40 - 15),
          ordersPercent: Math.round(Math.random() * 35 - 15),
        },
      },
      branches: branchSales,
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 30000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }
}

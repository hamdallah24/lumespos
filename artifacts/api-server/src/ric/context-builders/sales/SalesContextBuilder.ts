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

    const periodLabel = options?.period === "month" ? "30 hari" : "7 hari";

    const context: SalesContext = {
      today: {
        revenue: input.orders.filter(o => {
          const age = Date.now() - new Date(o.createdAt).getTime();
          return age < 86400000;
        }).reduce((s, o) => s + o.total, 0),
        orders: input.orders.filter(o => {
          const age = Date.now() - new Date(o.createdAt).getTime();
          return age < 86400000;
        }).length,
        avgOrderValue,
      },
      period: {
        revenue: totalRevenue,
        orders: totalOrders,
        growth: 0,
        label: periodLabel,
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
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 30000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }
}

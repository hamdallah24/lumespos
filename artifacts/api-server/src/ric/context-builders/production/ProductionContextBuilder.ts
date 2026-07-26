import type { ContextBuilder, BuildOptions, RawProductionData, ProductionContext } from '../types';

interface CacheEntry {
  data: ProductionContext;
  expiresAt: number;
}

export class ProductionContextBuilder implements ContextBuilder<RawProductionData, ProductionContext> {
  readonly domain = "production";
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(options?: BuildOptions): string {
    return `production|b${options?.branchId ?? 0}`;
  }

  async build(input: RawProductionData, options?: BuildOptions): Promise<ProductionContext> {
    const key = this.getCacheKey(options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now() && !options?.forceRefresh) {
      return cached.data;
    }

    const activeBatches = input.batches.filter(b => b.status === "in_progress" || b.status === "planned");
    const totalRecipeCost = input.costs.reduce((s, c) => s + c.amount, 0);

    const context: ProductionContext = {
      activeBatches: activeBatches.map(b => ({
        id: b.id,
        product: b.productName,
        status: b.status,
        progress: b.status === "in_progress" ? 50 : 0,
        eta: "N/A",
      })),
      efficiency: {
        yield: input.batches.length > 0 ? 85 : 0,
        waste: input.batches.length > 0 ? 8 : 0,
        downtime: 5,
        trend: input.batches.length > 0 ? "stable" : "unknown",
      },
      costs: {
        perUnit: input.batches.length > 0 ? Math.round(totalRecipeCost / input.batches.length) : 0,
        total: totalRecipeCost,
        byProduct: [],
      },
      bottlenecks: [],
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 120000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }
}

import type { ContextBuilder, BuildOptions, RawPurchasingData, SupplierContext } from '../types';

interface CacheEntry {
  data: SupplierContext;
  expiresAt: number;
}

export class PurchasingContextBuilder implements ContextBuilder<RawPurchasingData, SupplierContext> {
  readonly domain = "purchasing";
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(options?: BuildOptions): string {
    return `purchasing|b${options?.branchId ?? 0}`;
  }

  async build(input: RawPurchasingData, options?: BuildOptions): Promise<SupplierContext> {
    const key = this.getCacheKey(options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now() && !options?.forceRefresh) {
      return cached.data;
    }

    const atRisk = input.suppliers.filter(s => s.reliability < 70).map(s => s.name);
    const activeSuppliers = input.suppliers.filter(s => s.status === "active");

    const context: SupplierContext = {
      suppliers: activeSuppliers.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        avgLeadTime: s.avgLeadTime,
        reliability: s.reliability,
      })),
      pendingPOs: input.purchaseOrders
        .filter(po => po.status === "submitted" || po.status === "approved")
        .map(po => ({
          id: po.id,
          supplier: po.supplierName,
          total: po.total,
          daysOpen: Math.floor((Date.now() - new Date(po.createdAt).getTime()) / 86400000),
        })),
      overdueDeliveries: [],
      supplierHealth: {
        atRisk,
        critical: input.suppliers.filter(s => s.reliability < 50).map(s => s.name),
        totalActive: activeSuppliers.length,
      },
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 180000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }
}

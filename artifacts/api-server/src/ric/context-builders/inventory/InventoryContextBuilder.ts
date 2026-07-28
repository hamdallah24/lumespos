import type { ContextBuilder, BuildOptions, RawInventoryData, InventoryContext, RawWarehouse, RawWarehouseItem, RawMovement } from '../types';

interface CacheEntry {
  data: InventoryContext;
  expiresAt: number;
}

export class InventoryContextBuilder implements ContextBuilder<RawInventoryData, InventoryContext> {
  readonly domain = "inventory";
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(options?: BuildOptions): string {
    return `inventory|b${options?.branchId ?? 0}`;
  }

  async build(input: RawInventoryData, options?: BuildOptions): Promise<InventoryContext> {
    const key = this.getCacheKey(options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now() && !options?.forceRefresh) {
      return cached.data;
    }

    const criticalItems = this.findCriticalItems(input);

    const context: InventoryContext = {
      health: "healthy",
      criticalItems,
      warehouseUtilization: input.warehouses.map(w => ({
        warehouseId: w.id,
        name: w.name,
        capacity: Math.max(w.items.length * 10, 1),
        used: w.items.filter(i => i.currentStock > 0).length,
        percent: Math.round((w.items.filter(i => i.currentStock > 0).length / Math.max(w.items.length, 1)) * 100),
      })),
      inventoryValue: {
        total: input.warehouses.reduce((s, w) =>
          s + w.items.reduce((s2, i) => s2 + i.currentStock * i.costPrice, 0), 0),
        byWarehouse: input.warehouses.map(w => ({
          warehouse: w.name,
          value: w.items.reduce((s, i) => s + i.currentStock * i.costPrice, 0),
        })),
      },
      transferRecommendations: this.recommendTransfers(input),
      stockRisks: this.assessRisks(input),
      validationScore: input.validationScore,
      movementSummary: this.summarizeMovements(input),
      aiFindings: this.generateFindings(input),
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 60000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }

  private findCriticalItems(input: RawInventoryData): InventoryContext["criticalItems"] {
    return input.warehouses.flatMap(w =>
      w.items
        .filter(i => i.currentStock <= i.reorderPoint)
        .map(i => ({
          name: i.name,
          stock: i.currentStock,
          reorderPoint: i.reorderPoint,
          unit: i.unit,
          warehouse: w.name,
        }))
    );
  }

  private recommendTransfers(input: RawInventoryData): InventoryContext["transferRecommendations"] {
    const recommendations: InventoryContext["transferRecommendations"] = [];
    for (const wh of input.warehouses) {
      const overstocked = wh.items.filter(i => i.currentStock > i.reorderPoint * 3);
      for (const item of overstocked.slice(0, 3)) {
        const target = input.warehouses.find(w =>
          w.id !== wh.id && w.items.some(i => i.name === item.name && i.currentStock <= i.reorderPoint)
        );
        if (target) {
          recommendations.push({
            from: wh.name,
            to: target.name,
            item: item.name,
            qty: Math.floor(item.currentStock * 0.3),
            reason: `Transfer from overstocked warehouse`,
          });
        }
      }
    }
    return recommendations;
  }

  private assessRisks(input: RawInventoryData): InventoryContext["stockRisks"] {
    const risks: InventoryContext["stockRisks"] = [];
    for (const wh of input.warehouses) {
      for (const item of wh.items) {
        if (item.currentStock === 0) {
          risks.push({ item: item.name, risk: "out_of_stock", severity: 1.0, description: `Stock habis di ${wh.name}` });
        } else if (item.currentStock <= item.reorderPoint) {
          risks.push({ item: item.name, risk: "low_stock", severity: 0.6, description: `Stock menipis di ${wh.name}: ${item.currentStock}/${item.reorderPoint}` });
        }
      }
    }
    return risks;
  }

  private summarizeMovements(input: RawInventoryData): InventoryContext["movementSummary"] {
    const last24h = input.movements.filter(m => {
      const age = Date.now() - new Date(m.createdAt).getTime();
      return age < 86400000;
    });
    const inCount = last24h.filter(m => m.movementType === "STOCK_OPNAME" || m.movementType === "TRANSFER_IN").length;
    const outCount = last24h.filter(m => m.movementType === "WASTE_DAMAGE" || m.movementType === "TRANSFER_OUT").length;
    const adjCount = last24h.filter(m => m.movementType === "STOCK_ADJUSTMENT").length;
    return {
      last24h: { in: inCount, out: outCount, adjust: adjCount },
      trend: inCount > outCount ? "increasing" : outCount > inCount ? "decreasing" : "stable",
    };
  }

  private generateFindings(input: RawInventoryData): string[] {
    const findings: string[] = [];
    const totalCritical = this.findCriticalItems(input).length;
    if (totalCritical > 0) findings.push(`Terdapat ${totalCritical} item kritis yang perlu restock.`);
    const zeroStock = input.warehouses.reduce((s, w) => s + w.items.filter(i => i.currentStock === 0).length, 0);
    if (zeroStock > 0) findings.push(`${zeroStock} item memiliki stock 0.`);
    if (input.validationScore < 80) findings.push(`Skor validasi inventory rendah (${input.validationScore}/100). Perlu audit.`);
    return findings;
  }
}

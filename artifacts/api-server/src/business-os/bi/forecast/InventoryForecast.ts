export class InventoryForecast {
  forecastDemand(
    historicalSales: number[],
    leadTime: number
  ): { reorderPoint: number; safetyStock: number; forecastDemand: number } {
    if (historicalSales.length === 0) {
      return { reorderPoint: 0, safetyStock: 0, forecastDemand: 0 };
    }
    const avgDemand = historicalSales.reduce((a, b) => a + b, 0) / historicalSales.length;
    const n = historicalSales.length;
    const mean = avgDemand;
    const variance = historicalSales.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const safetyStock = Math.round(stdDev * 1.65 * Math.sqrt(leadTime));
    const forecastDemand = Math.round(avgDemand * leadTime);
    const reorderPoint = forecastDemand + safetyStock;
    return { reorderPoint, safetyStock, forecastDemand };
  }

  forecastStockout(
    currentStock: number,
    dailyUsage: number[],
    leadTime: number
  ): { daysUntilStockout: number; riskLevel: "low" | "medium" | "high" | "critical" } {
    if (dailyUsage.length === 0) {
      return { daysUntilStockout: Infinity, riskLevel: "low" };
    }
    const avgUsage = dailyUsage.reduce((a, b) => a + b, 0) / dailyUsage.length;
    const daysUntilStockout = avgUsage > 0 ? Math.floor(currentStock / avgUsage) : Infinity;
    let riskLevel: "low" | "medium" | "high" | "critical";
    if (daysUntilStockout <= leadTime * 0.5) {
      riskLevel = "critical";
    } else if (daysUntilStockout <= leadTime) {
      riskLevel = "high";
    } else if (daysUntilStockout <= leadTime * 2) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }
    return { daysUntilStockout, riskLevel };
  }

  getOptimalOrderQuantity(annualDemand: number, orderCost: number, holdingCost: number): number {
    if (annualDemand <= 0 || orderCost <= 0 || holdingCost <= 0) return 0;
    const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
    return Math.round(eoq);
  }
}

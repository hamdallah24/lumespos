import { metricStore } from "../core";
import type { Metric } from "../core/types";

export function calculateStockMetric(
  branchId: number,
  itemType: string,
  itemId: number,
  currentStock: number,
): Metric {
  return {
    id: `stock-${itemType}-${itemId}-${branchId}`,
    domain: "inventory",
    name: `current_stock.${itemType}.${itemId}`,
    value: currentStock,
    unit: "unit",
    timestamp: new Date(),
    period: "realtime",
    tags: { itemType, itemId, branchId },
    branchId,
  };
}

export function calculateStockCoverage(
  branchId: number,
  itemType: string,
  itemId: number,
  currentStock: number,
  avgDailyUsage: number,
): Metric {
  const coverage = avgDailyUsage > 0 ? currentStock / avgDailyUsage : 999;
  return {
    id: `coverage-${itemType}-${itemId}-${branchId}`,
    domain: "inventory",
    name: `stock_coverage.${itemType}.${itemId}`,
    value: coverage,
    unit: "days",
    timestamp: new Date(),
    period: "daily",
    tags: { itemType, itemId, branchId, avgDailyUsage },
    branchId,
  };
}

export function processStockAdjusted(data: {
  branchId: number;
  itemType: string;
  itemId: number;
  newStock: number;
}): void {
  const metric = calculateStockMetric(data.branchId, data.itemType, data.itemId, data.newStock);
  metricStore.set(metric);
}

export function processPurchaseReceived(data: {
  branchId: number;
  ingredientId: number;
  quantity: number;
  newAverageCost: number;
}): void {
  const metric: Metric = {
    id: `avg-cost-ingredient-${data.ingredientId}-${data.branchId}`,
    domain: "inventory",
    name: `avg_cost.ingredient.${data.ingredientId}`,
    value: data.newAverageCost,
    unit: "rupiah",
    timestamp: new Date(),
    period: "realtime",
    tags: { ingredientId: data.ingredientId, branchId: data.branchId, quantity: data.quantity },
    branchId: data.branchId,
  };
  metricStore.set(metric);
}

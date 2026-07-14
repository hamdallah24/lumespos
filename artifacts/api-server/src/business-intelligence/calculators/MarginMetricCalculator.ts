import { metricStore } from "../core";
import type { Metric } from "../core/types";

export function calculateGrossMargin(branchId: number): Metric | null {
  const revenue = metricStore.getLatest("daily_revenue", branchId);
  const cogs = metricStore.getLatest("daily_cogs", branchId);
  if (!revenue || !cogs) return null;

  const margin = revenue.value > 0
    ? ((revenue.value - cogs.value) / revenue.value) * 100
    : 0;

  const metric: Metric = {
    id: `gross-margin-${branchId}-${Date.now()}`,
    domain: "finance",
    name: "gross_margin",
    value: margin,
    unit: "percent",
    timestamp: new Date(),
    period: "daily",
    tags: { branchId, revenue: revenue.value, cogs: cogs.value },
    branchId,
  };
  metricStore.set(metric);
  return metric;
}

export function calculateExpenseRatio(branchId: number, totalExpenses: number): Metric | null {
  const revenue = metricStore.getLatest("daily_revenue", branchId);
  if (!revenue || revenue.value === 0) return null;

  const ratio = totalExpenses / revenue.value;

  const metric: Metric = {
    id: `expense-ratio-${branchId}-${Date.now()}`,
    domain: "finance",
    name: "expense_ratio",
    value: ratio,
    unit: "ratio",
    timestamp: new Date(),
    period: "daily",
    tags: { branchId, revenue: revenue.value, expenses: totalExpenses },
    branchId,
  };
  metricStore.set(metric);
  return metric;
}

import { metricStore } from "../core";
import type { Metric } from "../core/types";

const dailyRevenue = new Map<string, { total: number; count: number; date: string }>();

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function processOrderCreated(data: {
  branchId: number;
  orderId: number;
  total: number;
  totalCogs: number;
  paymentMethod: string;
}): void {
  const key = `${data.branchId}-${dateKey()}`;
  const existing = dailyRevenue.get(key) ?? { total: 0, count: 0, date: dateKey() };
  existing.total += data.total;
  existing.count += 1;
  dailyRevenue.set(key, existing);

  const metric: Metric = {
    id: `daily-revenue-${data.branchId}-${dateKey()}`,
    domain: "sales",
    name: "daily_revenue",
    value: existing.total,
    unit: "rupiah",
    timestamp: new Date(),
    period: "daily",
    tags: { orderCount: existing.count, branchId: data.branchId },
    branchId: data.branchId,
  };
  metricStore.set(metric);

  const cogsMetric: Metric = {
    id: `daily-cogs-${data.branchId}-${dateKey()}`,
    domain: "sales",
    name: "daily_cogs",
    value: data.totalCogs,
    unit: "rupiah",
    timestamp: new Date(),
    period: "daily",
    tags: { branchId: data.branchId },
    branchId: data.branchId,
  };
  metricStore.set(cogsMetric);

  const orderCountMetric: Metric = {
    id: `order-count-${data.branchId}-${dateKey()}`,
    domain: "sales",
    name: "daily_order_count",
    value: existing.count,
    unit: "count",
    timestamp: new Date(),
    period: "daily",
    tags: { branchId: data.branchId },
    branchId: data.branchId,
  };
  metricStore.set(orderCountMetric);
}

export function getDailyRevenue(branchId: number): number {
  const m = metricStore.getLatest("daily_revenue", branchId);
  return m?.value ?? 0;
}

export function getOrderCount(branchId: number): number {
  const m = metricStore.getLatest("daily_order_count", branchId);
  return m?.value ?? 0;
}

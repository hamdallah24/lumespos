import { metricStore } from "../core";
import type { Metric } from "../core/types";

export function processShiftOpened(data: {
  shiftId: number;
  branchId: number;
  cashierId: number;
  openingBalance: number;
}): void {
  const metric: Metric = {
    id: `shift-opened-${data.shiftId}-${data.branchId}`,
    domain: "shift",
    name: "shift_opening_balance",
    value: data.openingBalance,
    unit: "rupiah",
    timestamp: new Date(),
    period: "realtime",
    tags: { shiftId: data.shiftId, cashierId: data.cashierId, branchId: data.branchId },
    branchId: data.branchId,
  };
  metricStore.set(metric);
}

export function processShiftClosed(data: {
  shiftId: number;
  branchId: number;
  status: string;
  expectedBalance: number;
  closingBalance: number;
  difference: number;
}): void {
  const cashAccuracy = data.expectedBalance > 0
    ? Math.abs(data.difference / data.expectedBalance)
    : data.difference !== 0 ? 1 : 0;

  const cashMetric: Metric = {
    id: `cash-accuracy-${data.shiftId}-${data.branchId}`,
    domain: "shift",
    name: "cash_accuracy",
    value: cashAccuracy,
    unit: "ratio",
    timestamp: new Date(),
    period: "realtime",
    tags: { shiftId: data.shiftId, branchId: data.branchId, status: data.status },
    branchId: data.branchId,
  };
  metricStore.set(cashMetric);

  const diffMetric: Metric = {
    id: `cash-difference-${data.shiftId}-${data.branchId}`,
    domain: "shift",
    name: "cash_difference",
    value: data.difference,
    unit: "rupiah",
    timestamp: new Date(),
    period: "realtime",
    tags: { shiftId: data.shiftId, branchId: data.branchId, expectedBalance: data.expectedBalance },
    branchId: data.branchId,
  };
  metricStore.set(diffMetric);
}

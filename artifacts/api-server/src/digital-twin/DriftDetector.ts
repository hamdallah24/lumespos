import type { TwinBusinessState, DriftAlert } from "./types";
import { compareStates } from "./TwinComparator";

const FIELD_KEY_MAP: Record<string, string> = {
  "Cash Available": "cashAvailable",
  "Revenue": "revenue",
  "Expenses": "expenses",
  "Gross Margin": "grossMargin",
  "Stock Coverage": "stockCoverageDays",
  "Active Branches": "activeBranches",
  "Active Employees": "activeEmployees",
  "Customer Satisfaction": "customerSatisfaction",
};

const DRIFT_THRESHOLDS: Record<string, number> = {
  cashAvailable: 15,
  revenue: 10,
  expenses: 10,
  grossMargin: 5,
  stockCoverageDays: 20,
  customerSatisfaction: 10,
};

let alertHistory: DriftAlert[] = [];
const MAX_ALERTS = 100;

export function detectDrift(
  real: TwinBusinessState,
  twin: TwinBusinessState,
): DriftAlert[] {
  const comparisons = compareStates(real, twin);
  const alerts: DriftAlert[] = [];

  for (const comp of comparisons) {
    const key = FIELD_KEY_MAP[comp.field] ?? comp.field.toLowerCase();
    const threshold = DRIFT_THRESHOLDS[key] ?? 10;
    if (Math.abs(comp.deltaPercent) >= threshold) {
      const severity: "low" | "medium" | "high" =
        Math.abs(comp.deltaPercent) >= threshold * 2 ? "high"
        : Math.abs(comp.deltaPercent) >= threshold * 1.5 ? "medium"
        : "low";

      alerts.push({
        field: comp.field,
        realValue: comp.realValue,
        twinValue: comp.twinValue,
        driftPercent: comp.deltaPercent,
        severity,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  alertHistory = [...alerts, ...alertHistory].slice(0, MAX_ALERTS);
  return alerts;
}

export function getAlertHistory(): DriftAlert[] {
  return [...alertHistory];
}

export function clearAlerts(): void {
  alertHistory = [];
}

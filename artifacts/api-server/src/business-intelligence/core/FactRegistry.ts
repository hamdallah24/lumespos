import { registerThreshold } from "./FactEngine";
import type { FactThreshold, MetricDomain } from "./types";

const defaultThresholds: FactThreshold[] = [
  {
    factName: "stock_coverage_critical",
    domain: "inventory",
    warningThreshold: 3,
    criticalThreshold: 1,
    direction: "below",
    description: "Stock coverage in days — below 3 days is warning, below 1 day is critical",
  },
  {
    factName: "revenue_drop",
    domain: "sales",
    warningThreshold: 0.3,
    criticalThreshold: 0.5,
    direction: "below",
    description: "Revenue drop compared to 7d average — 30% drop is warning, 50% is critical",
  },
  {
    factName: "expense_spike",
    domain: "finance",
    warningThreshold: 2,
    criticalThreshold: 3,
    direction: "above",
    description: "Daily expense vs 7d average ratio — 2x is warning, 3x is critical",
  },
  {
    factName: "cash_discrepancy",
    domain: "shift",
    warningThreshold: 0.05,
    criticalThreshold: 0.1,
    direction: "above",
    description: "Cash discrepancy percentage — 5% is warning, 10% is critical",
  },
  {
    factName: "stock_accuracy",
    domain: "shift",
    warningThreshold: 0.05,
    criticalThreshold: 0.1,
    direction: "above",
    description: "Stock discrepancy percentage — 5% is warning, 10% is critical",
  },
];

export function initializeFactRegistry(): void {
  for (const t of defaultThresholds) {
    registerThreshold(t);
  }
}

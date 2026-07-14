import type { TwinBusinessState, TwinComparison } from "./types";

const COMPARISON_FIELDS: Array<{ field: keyof TwinBusinessState; label: string }> = [
  { field: "cashAvailable", label: "Cash Available" },
  { field: "revenue", label: "Revenue" },
  { field: "expenses", label: "Expenses" },
  { field: "grossMargin", label: "Gross Margin" },
  { field: "stockCoverageDays", label: "Stock Coverage" },
  { field: "activeBranches", label: "Active Branches" },
  { field: "activeEmployees", label: "Active Employees" },
  { field: "customerSatisfaction", label: "Customer Satisfaction" },
];

export function compareStates(
  real: TwinBusinessState,
  twin: TwinBusinessState,
): TwinComparison[] {
  return COMPARISON_FIELDS.map(({ field, label }) => {
    const realValue = real[field] as number;
    const twinValue = twin[field] as number;
    const delta = twinValue - realValue;
    const deltaPercent = realValue !== 0 ? Math.round((delta / realValue) * 100) : 0;
    const direction: "up" | "down" | "stable" = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
    return { field: label, realValue, twinValue, delta, deltaPercent, direction };
  });
}

export function findSignificantDrift(
  comparisons: TwinComparison[],
  thresholdPercent = 10,
): TwinComparison[] {
  return comparisons.filter(c => Math.abs(c.deltaPercent) >= thresholdPercent);
}

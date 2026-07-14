import type { KPITarget, StrategicDirection, MetricDomain } from "./types";

const domainKPIs: Record<string, Array<{ metric: string; unit: string; improveBy: number }>> = {
  inventory: [
    { metric: "stock_coverage", unit: "days", improveBy: 2 },
    { metric: "stock_accuracy", unit: "percent", improveBy: 5 },
  ],
  sales: [
    { metric: "daily_revenue", unit: "rupiah", improveBy: 0.15 },
    { metric: "order_count", unit: "count", improveBy: 0.1 },
  ],
  finance: [
    { metric: "expense_ratio", unit: "ratio", improveBy: -0.05 },
    { metric: "gross_margin", unit: "percent", improveBy: 3 },
  ],
  shift: [
    { metric: "cash_accuracy", unit: "percent", improveBy: 2 },
  ],
  production: [
    { metric: "yield", unit: "percent", improveBy: 5 },
  ],
};

export function setKPITargets(
  domain: MetricDomain,
  direction: StrategicDirection,
): KPITarget[] {
  const kpis = domainKPIs[domain] ?? [];
  const multiplier = getDirectionMultiplier(direction);

  return kpis.map((kpi) => {
    const baseline = 100;
    const improvement = kpi.improveBy * multiplier;
    const targetValue = kpi.metric === "expense_ratio"
      ? baseline + improvement
      : baseline * (1 + improvement);

    return {
      metric: kpi.metric,
      currentValue: baseline,
      targetValue: Math.round(targetValue * 100) / 100,
      unit: kpi.unit,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  });
}

function getDirectionMultiplier(direction: StrategicDirection): number {
  const map: Record<StrategicDirection, number> = {
    growth: 1.2,
    optimization: 1.0,
    cost_reduction: 0.8,
    quality: 1.1,
    risk_mitigation: 0.6,
  };
  return map[direction] ?? 1.0;
}

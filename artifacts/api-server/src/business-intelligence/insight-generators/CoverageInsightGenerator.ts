import { registerInsightGenerator, buildInsight, metricStore } from "../core";

export function registerCoverageInsightGenerator(): void {
  registerInsightGenerator("coverage_low_stock", (metrics, branchId) => {
    const stockMetrics = metrics.filter(m => m.name.startsWith("current_stock."));
    if (stockMetrics.length === 0) return null;

    const coverageMetrics = metrics.filter(m => m.name.startsWith("stock_coverage."));
    if (coverageMetrics.length === 0) return null;

    const lowestCoverage = coverageMetrics.reduce((min, m) =>
      m.value < min.value ? m : min,
    );

    const severity = lowestCoverage.value < 1 ? "critical" : lowestCoverage.value < 3 ? "warning" : "info";

    return buildInsight({
      category: "coverage",
      name: "lowest_stock_coverage",
      description: `Item dengan coverage terendah: ${lowestCoverage.tags.itemType}:${lowestCoverage.tags.itemId} — ${lowestCoverage.value.toFixed(1)} days`,
      value: lowestCoverage.value,
      severity,
      sourceMetrics: [lowestCoverage.id],
      domain: "inventory",
      threshold: 3,
      branchId,
    });
  });
}

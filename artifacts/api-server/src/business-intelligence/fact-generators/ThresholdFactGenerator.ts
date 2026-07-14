import { registerFactGenerator, buildFact, getThreshold } from "../core";

export function registerThresholdFactGenerator(): void {
  registerFactGenerator("threshold_crossing", (insights, branchId) => {
    const thresholdInsights = insights.filter(i =>
      i.category === "coverage" || i.category === "growth",
    );
    if (thresholdInsights.length === 0) return null;

    for (const insight of thresholdInsights) {
      const threshold = getThreshold(insight.name);
      if (!threshold) continue;

      const isBreached = threshold.direction === "below"
        ? insight.value <= threshold.criticalThreshold
        : insight.value >= threshold.criticalThreshold;

      if (!isBreached) continue;

      return buildFact({
        category: "threshold",
        name: `threshold.${insight.name}`,
        description: `${insight.description} — MELEWATI BATAS KRITIS (threshold: ${threshold.criticalThreshold})`,
        severity: "high",
        sourceInsights: [insight.id],
        sourceMetrics: insight.sourceMetrics,
        value: insight.value,
        domain: insight.domain,
        threshold: threshold.criticalThreshold,
        deviation: threshold.direction === "below"
          ? (threshold.criticalThreshold - insight.value) / threshold.criticalThreshold
          : (insight.value - threshold.criticalThreshold) / threshold.criticalThreshold,
        branchId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    return null;
  });
}

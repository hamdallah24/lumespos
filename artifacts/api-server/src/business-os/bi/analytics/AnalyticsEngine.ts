import { AnalyticsResult, Dimension, KPIValue, Period } from "../types";
import { VarianceAnalyzer } from "./VarianceAnalyzer";
import { TrendAnalyzer } from "./TrendAnalyzer";
import { CorrelationAnalyzer } from "./CorrelationAnalyzer";
import { OutlierDetector } from "./OutlierDetector";
import { GrowthAnalyzer } from "./GrowthAnalyzer";
import { SeasonalityAnalyzer } from "./SeasonalityAnalyzer";

export class AnalyticsEngine {
  variance = new VarianceAnalyzer();
  trend = new TrendAnalyzer();
  correlation = new CorrelationAnalyzer();
  outlier = new OutlierDetector();
  growth = new GrowthAnalyzer();
  seasonality = new SeasonalityAnalyzer();

  analyzeMetric(name: string, values: number[], dimension: Dimension, period: Period, periodKey: string): AnalyticsResult {
    const previousValue = values.length > 1 ? values[values.length - 2] : 0;
    const currentValue = values.length > 0 ? values[values.length - 1] : 0;
    const varianceResult = this.variance.analyze(currentValue, previousValue);
    const trendResult = this.trend.analyze(values);
    return {
      dimension,
      metric: name,
      currentValue,
      previousValue,
      changePct: varianceResult.percentage,
      changeAbsolute: varianceResult.absolute,
      trend: trendResult.trend,
      variance: varianceResult.percentage,
      isSignificant: varianceResult.isSignificant,
      period,
      periodKey,
    };
  }

  analyzeAll(kpiValues: KPIValue[]): AnalyticsResult[] {
    return kpiValues.map(kpi =>
      this.analyzeMetric(
        kpi.kpiName,
        kpi.previousValue !== undefined ? [kpi.previousValue, kpi.value] : [kpi.value],
        kpi.dimension,
        kpi.period,
        kpi.periodKey
      )
    );
  }

  findRootCauses(target: string, allKpis: Map<string, number[]>): { kpi: string; correlation: number; impact: string }[] {
    const drivers = this.correlation.getDrivers(target, allKpis);
    return drivers.slice(0, 5).map(d => ({
      kpi: d.kpi,
      correlation: d.correlation,
      impact: Math.abs(d.correlation) > 0.7 ? "high" : Math.abs(d.correlation) > 0.5 ? "medium" : "low",
    }));
  }

  getInsights(kpiValues: KPIValue[]): { metric: string; insight: string; severity: string }[] {
    const insights: { metric: string; insight: string; severity: string }[] = [];
    for (const kpi of kpiValues) {
      const values = kpi.previousValue !== undefined ? [kpi.previousValue, kpi.value] : [kpi.value];
      const analysis = this.analyzeMetric(kpi.kpiName, values, kpi.dimension, kpi.period, kpi.periodKey);
      if (analysis.isSignificant) {
        insights.push({
          metric: kpi.kpiName,
          insight: `${kpi.kpiName} ${analysis.changePct > 0 ? "increased" : "decreased"} by ${Math.abs(analysis.changePct).toFixed(1)}%`,
          severity: Math.abs(analysis.changePct) > 20 ? "high" : "medium",
        });
      }
    }
    const outliers = this.outlier.detect(kpiValues.map(k => k.value));
    for (const o of outliers) {
      if (o.isOutlier) {
        insights.push({
          metric: kpiValues[o.index]?.kpiName ?? "unknown",
          insight: `Outlier detected: value ${o.value} has z-score of ${o.zScore.toFixed(2)}`,
          severity: "high",
        });
      }
    }
    return insights;
  }
}

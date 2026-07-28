import { NarrativeInsight, KPIValue, KPIAlert, ForecastResult, AnalyticsResult } from "../types";

export class InsightGenerator {
  generateFromKPIs(values: KPIValue[], previousValues: KPIValue[]): NarrativeInsight[] {
    const insights: NarrativeInsight[] = [];
    const prevMap = new Map(previousValues.map((p) => [p.kpiId, p]));

    for (const kpi of values) {
      const prev = prevMap.get(kpi.kpiId);
      if (!prev || prev.value === 0) continue;

      const changePct = ((kpi.value - prev.value) / prev.value) * 100;
      const changeDir = kpi.value >= prev.value ? "naik" : "turun";
      const absChange = Math.abs(changePct);

      let type: NarrativeInsight["type"];
      if (changePct > 10) type = "positive";
      else if (changePct < -10) type = "negative";
      else continue;

      const headline = `${kpi.kpiName} ${changeDir} ${absChange.toFixed(1)}% dibanding periode lalu`;

      insights.push({
        type,
        dimension: kpi.dimension,
        headline,
        description: `${kpi.kpiName} berubah ${changeDir} ${absChange.toFixed(1)}% dari ${prev.value}${kpi.unit} menjadi ${kpi.value}${kpi.unit} dibanding periode sebelumnya.`,
        metrics: [{ name: kpi.kpiName, value: kpi.value, change: changePct }],
        rootCauses: [],
        recommendations: [],
        confidence: Math.min(Math.abs(changePct) / 100, 1),
      });
    }

    return insights;
  }

  generateFromAlerts(alerts: KPIAlert[]): NarrativeInsight[] {
    return alerts.map((a) => ({
      type: a.severity === "critical" || a.severity === "high" ? "negative" : "warning",
      dimension: a.dimension,
      headline: `${a.kpiName}: ${a.message}`,
      description: `Alert ${a.severity} pada ${a.kpiName}. Nilai saat ini ${a.value} melampaui threshold ${a.threshold}.`,
      metrics: [{ name: a.kpiName, value: a.value, change: 0 }],
      rootCauses: [],
      recommendations: [],
      confidence: a.severity === "critical" ? 0.95 : a.severity === "high" ? 0.85 : 0.7,
    }));
  }

  generateFromForecast(forecast: ForecastResult[]): NarrativeInsight[] {
    return forecast.map((f) => {
      const type: NarrativeInsight["type"] =
        f.forecast30d > f.currentValue ? (f.trend === "up" ? "opportunity" : "positive") : f.trend === "down" ? "warning" : "negative";

      const headline = `Proyeksi ${f.metric}: ${f.forecast30d > f.currentValue ? "kenaikan" : "penurunan"} dalam 30 hari`;

      return {
        type,
        dimension: f.dimension,
        headline,
        description: `${f.metric} diproyeksikan dari ${f.currentValue} menjadi ${f.forecast30d} dalam 30 hari (confidence: ${(f.confidence * 100).toFixed(0)}%). ${f.warnings.length ? `Peringatan: ${f.warnings.join("; ")}` : ""}`,
        metrics: [{ name: f.metric, value: f.currentValue, change: ((f.forecast30d - f.currentValue) / f.currentValue) * 100 }],
        rootCauses: [],
        recommendations: [],
        confidence: f.confidence,
      };
    });
  }

  generateFromAnalytics(results: AnalyticsResult[]): NarrativeInsight[] {
    return results
      .filter((r) => r.isSignificant)
      .map((r) => {
        const type: NarrativeInsight["type"] =
          r.changePct > 0 ? "positive" : r.changePct < 0 ? "negative" : "warning";
        const dir = r.changePct >= 0 ? "naik" : "turun";

        return {
          type,
          dimension: r.dimension,
          headline: `${r.metric} ${dir} ${Math.abs(r.changePct).toFixed(1)}% secara signifikan`,
          description: `Analytics menunjukkan perubahan signifikan pada ${r.metric}: ${dir} ${Math.abs(r.changePct).toFixed(1)}% (dari ${r.previousValue} ke ${r.currentValue}). Trend: ${r.trend}.`,
          metrics: [{ name: r.metric, value: r.currentValue, change: r.changePct }],
          rootCauses: [],
          recommendations: [],
          confidence: Math.min(Math.abs(r.changePct) / 100 + 0.3, 1),
        };
      });
  }
}

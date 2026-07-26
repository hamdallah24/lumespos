import type { KPIValue, KPIAlert, KPITrend } from "../types";
import { KPICalculator } from "./KPICalculator";
import { KPIThreshold } from "./KPIThreshold";
import { KPIAggregator } from "./KPIAggregator";
import { KPIHistory } from "./KPIHistory";
import { KPIBenchmark } from "./KPIBenchmark";

export class KPIEngine {
  calculator: KPICalculator;
  threshold: KPIThreshold;
  aggregator: KPIAggregator;
  history: KPIHistory;
  benchmark: KPIBenchmark;

  constructor() {
    this.calculator = new KPICalculator();
    this.threshold = new KPIThreshold();
    this.aggregator = new KPIAggregator();
    this.history = new KPIHistory();
    this.benchmark = new KPIBenchmark();
  }

  calculateAll(workspace: any): { values: KPIValue[]; alerts: KPIAlert[]; trends: KPITrend[] } {
    const values = this.calculator.calculateAll(workspace);
    const alerts: KPIAlert[] = [];
    const trends: KPITrend[] = [];

    for (const v of values) {
      this.history.record(v);

      const alert = this.threshold.evaluate(v.value, v.kpiId, v.higherIsBetter);
      if (alert) alerts.push(alert);

      const trend = this.history.getTrend(v.kpiId);
      trends.push(trend);
    }

    return { values, alerts, trends };
  }

  calculateById(kpiId: string, workspace: any): { value: KPIValue; alert: KPIAlert | null; trend: KPITrend } {
    const value = this.calculator.calculate(kpiId, workspace);
    this.history.record(value);

    const alert = this.threshold.evaluate(value.value, value.kpiId, value.higherIsBetter);
    const trend = this.history.getTrend(kpiId);

    return { value, alert, trend };
  }

  getAlerts(): KPIAlert[] {
    const allAlerts: KPIAlert[] = [];

    for (const [kpiId, entries] of this.history.history) {
      if (entries.length === 0) continue;

      const lastEntry = entries[entries.length - 1];
      const def = getDef(kpiId);
      if (!def) continue;

      const alert = this.threshold.evaluate(lastEntry.value, kpiId, def.higherIsBetter);
      if (alert) allAlerts.push(alert);
    }

    return allAlerts;
  }

  getAlertsBySeverity(severity: string): KPIAlert[] {
    return this.getAlerts().filter(a => a.severity === severity);
  }

  getDashboardData(executive: string, workspace: any): { values: KPIValue[]; alerts: KPIAlert[]; trends: KPITrend[] } {
    const values = this.calculator.calculateForExecutive(executive, workspace);
    const alerts: KPIAlert[] = [];
    const trends: KPITrend[] = [];

    for (const v of values) {
      this.history.record(v);

      const alert = this.threshold.evaluate(v.value, v.kpiId, v.higherIsBetter);
      if (alert) alerts.push(alert);

      const trend = this.history.getTrend(v.kpiId);
      trends.push(trend);
    }

    return { values, alerts, trends };
  }

  reset(): void {
    this.calculator = new KPICalculator();
    this.threshold = new KPIThreshold();
    this.aggregator = new KPIAggregator();
    this.history = new KPIHistory();
    this.benchmark = new KPIBenchmark();
  }
}

function getDef(kpiId: string): { id: string; higherIsBetter: boolean } | undefined {
  const { getDefinition } = require("./KPIDefinition");
  return getDefinition(kpiId);
}

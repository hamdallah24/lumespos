import type { KPIValue, KPITrend, Trend } from "../types";

export class KPIHistory {
  history: Map<string, { date: string; value: number }[]>;

  constructor() {
    this.history = new Map();
  }

  record(value: KPIValue): void {
    const key = value.kpiId;
    const entry = { date: value.timestamp, value: value.value };
    const existing = this.history.get(key) ?? [];
    existing.push(entry);
    this.history.set(key, existing);
  }

  getHistory(kpiId: string, days?: number): { date: string; value: number }[] {
    const entries = this.history.get(kpiId) ?? [];
    if (!days || days <= 0) return [...entries];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return entries.filter(e => new Date(e.date) >= cutoff);
  }

  getTrend(kpiId: string): KPITrend {
    const entries = this.history.get(kpiId) ?? [];
    const values = entries.map(e => ({ date: e.date, value: e.value }));

    if (values.length < 2) {
      return {
        kpiId,
        values,
        trend: "stable" as Trend,
        changePct: 0,
        volatility: 0,
      };
    }

    const firstVal = values[0].value;
    const lastVal = values[values.length - 1].value;
    const changePct = firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : 0;

    let trend: Trend = "stable";
    if (changePct > 5) trend = "up";
    else if (changePct < -5) trend = "down";
    else if (Math.abs(changePct) <= 5) trend = "stable";

    const meanVal = values.reduce((s, v) => s + v.value, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v.value - meanVal) ** 2, 0) / values.length;
    const volatility = meanVal !== 0 ? Math.sqrt(variance) / Math.abs(meanVal) : 0;

    return {
      kpiId,
      values,
      trend,
      changePct: Math.round(changePct * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
    };
  }

  getMin(kpiId: string, days?: number): number {
    const entries = this.getHistory(kpiId, days);
    if (entries.length === 0) return 0;
    return Math.min(...entries.map(e => e.value));
  }

  getMax(kpiId: string, days?: number): number {
    const entries = this.getHistory(kpiId, days);
    if (entries.length === 0) return 0;
    return Math.max(...entries.map(e => e.value));
  }

  getAverage(kpiId: string, days?: number): number {
    const entries = this.getHistory(kpiId, days);
    if (entries.length === 0) return 0;
    return entries.reduce((s, e) => s + e.value, 0) / entries.length;
  }
}

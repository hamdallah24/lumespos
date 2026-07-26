import type { ForecastAccuracyResult } from "./DecisionOutcome";

interface ForecastRecord {
  forecastId: string;
  metric: string;
  forecastValue: number;
  actualValue?: number;
  confidence: number;
  createdAt: number;
}

export class ForecastAccuracy {
  private records: ForecastRecord[] = [];
  private maxRecords = 500;

  record(forecastId: string, metric: string, forecastValue: number, confidence: number): void {
    this.records.push({ forecastId, metric, forecastValue, confidence, createdAt: Date.now() });
    if (this.records.length > this.maxRecords) this.records.shift();
  }

  setActual(forecastId: string, actualValue: number): ForecastAccuracyResult | null {
    const record = this.records.find(r => r.forecastId === forecastId);
    if (!record) return null;
    record.actualValue = actualValue;

    const error = Math.abs(record.forecastValue - actualValue);
    const errorPct = record.forecastValue !== 0 ? error / Math.abs(record.forecastValue) : 1;
    const accuracy = Math.max(0, Math.min(100, (1 - errorPct) * 100));
    const confidence = Math.max(0, Math.min(1, record.confidence * (accuracy / 100)));

    return {
      forecastId, metric: record.metric,
      forecastValue: record.forecastValue, actualValue,
      error: Math.round(error * 100) / 100,
      errorPct: Math.round(errorPct * 10000) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      evaluatedAt: Date.now(),
    };
  }

  getAccuracyByMetric(metric: string): number {
    const results = this.records.filter(r => r.metric === metric && r.actualValue !== undefined);
    if (results.length === 0) return 0;
    const total = results.reduce((s, r) => {
      const error = r.forecastValue !== 0 ? Math.abs(r.forecastValue - r.actualValue!) / Math.abs(r.forecastValue) : 1;
      return s + Math.max(0, (1 - error) * 100);
    }, 0);
    return Math.round(total / results.length * 100) / 100;
  }

  getOverallAccuracy(): number {
    const results = this.records.filter(r => r.actualValue !== undefined);
    if (results.length === 0) return 0;
    return this.getAccuracyByMetric("*");
  }

  getRecentResults(limit: number = 20): ForecastAccuracyResult[] {
    return this.records
      .filter(r => r.actualValue !== undefined)
      .slice(-limit)
      .map(r => {
        const error = Math.abs(r.forecastValue - r.actualValue!);
        const errorPct = r.forecastValue !== 0 ? error / Math.abs(r.forecastValue) : 1;
        return {
          forecastId: r.forecastId, metric: r.metric,
          forecastValue: r.forecastValue, actualValue: r.actualValue!,
          error: Math.round(error * 100) / 100,
          errorPct: Math.round(errorPct * 10000) / 100,
          accuracy: Math.round(Math.max(0, (1 - errorPct) * 100) * 100) / 100,
          confidence: r.confidence,
          evaluatedAt: Date.now(),
        };
      })
      .sort((a, b) => b.evaluatedAt - a.evaluatedAt);
  }

  count(): number { return this.records.length; }
  clear(): void { this.records = []; }
}

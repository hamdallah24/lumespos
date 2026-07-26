import { Trend } from "../types";

export class RevenueForecast {
  forecast7d(values: number[]): number {
    if (values.length === 0) return 0;
    const window = Math.min(7, values.length);
    const recent = values.slice(-window);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  forecast30d(values: number[]): number {
    if (values.length < 2) return values.length === 1 ? values[0] : 0;
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    const meanX = (indices.reduce((a, b) => a + b, 0)) / n;
    const meanY = (values.reduce((a, b) => a + b, 0)) / n;
    const num = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const den = indices.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;
    return intercept + slope * (n + 29);
  }

  forecast90d(values: number[]): number {
    if (values.length < 2) return values.length === 1 ? values[0] : 0;
    const avgLast7 = this.forecast7d(values);
    const avgLast30 = values.length >= 30
      ? values.slice(-30).reduce((a, b) => a + b, 0) / 30
      : values.reduce((a, b) => a + b, 0) / values.length;
    const trend = (avgLast7 - avgLast30) / avgLast30;
    const dailyTrend = trend / 30;
    const base = this.forecast30d(values);
    return base * (1 + dailyTrend * 90);
  }

  forecast365d(values: number[]): number {
    if (values.length < 2) return values.length === 1 ? values[0] : 0;
    const n = values.length;
    const first = values[0];
    const last = values[values.length - 1];
    const years = n / 365;
    const cagr = years > 0 && first > 0 ? Math.pow(last / first, 1 / years) - 1 : 0;
    return last * Math.pow(1 + cagr, 1);
  }

  getConfidence(values: number[]): number {
    if (values.length < 2) return 0.5;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 1 : stdDev / Math.abs(mean);
    const confidence = Math.max(0, Math.min(1, 1 - cv));
    return Math.round(confidence * 100) / 100;
  }
}

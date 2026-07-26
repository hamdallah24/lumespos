export class DemandForecast {
  simpleMovingAverage(values: number[], window: number): number {
    if (values.length === 0 || window <= 0) return 0;
    const actualWindow = Math.min(window, values.length);
    const recent = values.slice(-actualWindow);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  exponentialSmoothing(values: number[], alpha: number): number[] {
    if (values.length === 0) return [];
    const result: number[] = [values[0]];
    for (let i = 1; i < values.length; i++) {
      result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  }

  linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] || 0, r2: 0 };
    const indices = Array.from({ length: n }, (_, i) => i);
    const meanX = (indices.reduce((a, b) => a + b, 0)) / n;
    const meanY = (values.reduce((a, b) => a + b, 0)) / n;
    const num = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const den = indices.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;
    const ssRes = values.reduce((sum, y, i) => {
      const pred = intercept + slope * indices[i];
      return sum + (y - pred) ** 2;
    }, 0);
    const ssTot = values.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { slope, intercept, r2 };
  }

  forecast(
    values: number[],
    daysAhead: number
  ): { forecast: number[]; confidence: number; lower: number[]; upper: number[] } {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 1 : stdDev / Math.abs(mean);
    const confidence = Math.max(0, Math.min(1, 1 - cv));
    const lr = this.linearRegression(values);
    const forecast: number[] = [];
    const lower: number[] = [];
    const upper: number[] = [];
    for (let i = 0; i < daysAhead; i++) {
      const f = lr.intercept + lr.slope * (n + i);
      forecast.push(Math.round(f * 100) / 100);
      lower.push(Math.round((f - stdDev * 1.96) * 100) / 100);
      upper.push(Math.round((f + stdDev * 1.96) * 100) / 100);
    }
    return { forecast, confidence: Math.round(confidence * 100) / 100, lower, upper };
  }
}

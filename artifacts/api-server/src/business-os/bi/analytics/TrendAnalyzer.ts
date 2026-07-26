import { Trend } from "../types";

export class TrendAnalyzer {
  analyze(values: number[]): { trend: Trend; slope: number; volatility: number; direction: "increasing" | "decreasing" | "flat" } {
    if (values.length < 2) {
      return { trend: "stable", slope: 0, volatility: 0, direction: "flat" };
    }
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const variance = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0) / n;
    const volatility = Math.sqrt(variance);
    const direction = slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "flat";
    let trend: Trend;
    if (volatility > yMean * 0.5 && yMean !== 0) {
      trend = "volatile";
    } else {
      trend = direction === "increasing" ? "up" : direction === "decreasing" ? "down" : "stable";
    }
    return { trend, slope, volatility, direction };
  }

  getMovingAverage(values: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i <= values.length - window; i++) {
      let sum = 0;
      for (let j = 0; j < window; j++) {
        sum += values[i + j];
      }
      result.push(sum / window);
    }
    return result;
  }

  getGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    const start = values[0];
    const end = values[values.length - 1];
    if (start === 0) return end > 0 ? Infinity : 0;
    return (end / start) ** (1 / (values.length - 1)) - 1;
  }

  isAccelerating(values: number[]): boolean {
    if (values.length < 3) return false;
    for (let i = 2; i < values.length; i++) {
      const prevDiff = values[i - 1] - values[i - 2];
      const currDiff = values[i] - values[i - 1];
      if (currDiff <= prevDiff) return false;
    }
    return true;
  }
}

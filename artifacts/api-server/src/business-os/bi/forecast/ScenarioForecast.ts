export class ScenarioForecast {
  bestCase(values: number[], growthRate: number): number[] {
    return values.map((v, i) => Math.round(v * Math.pow(1 + growthRate, i + 1) * 100) / 100);
  }

  worstCase(values: number[], declineRate: number): number[] {
    return values.map((v, i) => Math.round(v * Math.pow(1 - declineRate, i + 1) * 100) / 100);
  }

  mostLikely(values: number[], growthRate: number, volatility: number): number[] {
    return values.map((v, i) => {
      const trend = v * Math.pow(1 + growthRate, i + 1);
      const noise = trend * (Math.random() - 0.5) * volatility * 2;
      return Math.round(Math.max(0, trend + noise) * 100) / 100;
    });
  }

  monteCarlo(
    values: number[],
    iterations: number,
    days: number
  ): { avg: number; min: number; max: number; p10: number; p90: number } {
    if (values.length === 0) return { avg: 0, min: 0, max: 0, p10: 0, p90: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const finalValues: number[] = [];
    for (let i = 0; i < iterations; i++) {
      let current = values[values.length - 1];
      for (let d = 0; d < days; d++) {
        const shock = (Math.random() - 0.5) * 2 * (stdDev || mean * 0.1);
        current = Math.max(0, current + shock);
      }
      finalValues.push(current);
    }
    const sorted = [...finalValues].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    return {
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      p10: Math.round(p10 * 100) / 100,
      p90: Math.round(p90 * 100) / 100,
    };
  }
}

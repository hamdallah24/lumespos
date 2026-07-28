export class SeasonalityAnalyzer {
  detectSeasonality(values: number[], periodLength: number): { hasSeasonality: boolean; periods: number; strength: number } {
    if (values.length < periodLength * 2) {
      return { hasSeasonality: false, periods: 0, strength: 0 };
    }
    const periods = Math.floor(values.length / periodLength);
    const factors = this.getSeasonalFactors(values, periodLength);
    const deseasonalized = this.deseasonalize(values, periodLength);
    const seasonalComponent = values.map((v, i) => v - deseasonalized[i]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const totalVariance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    const seasonalVariance = seasonalComponent.reduce((sum, v) => sum + v * v, 0);
    const strength = totalVariance > 0 ? seasonalVariance / totalVariance : 0;
    return { hasSeasonality: strength > 0.3, periods, strength };
  }

  getSeasonalFactors(values: number[], periodLength: number): number[] {
    if (values.length < periodLength) return new Array(periodLength).fill(1);
    const periods = Math.floor(values.length / periodLength);
    const factors: number[] = [];
    for (let i = 0; i < periodLength; i++) {
      let sum = 0;
      let count = 0;
      for (let p = 0; p < periods; p++) {
        const idx = p * periodLength + i;
        if (idx < values.length) {
          sum += values[idx];
          count++;
        }
      }
      factors.push(count > 0 ? sum / count : 1);
    }
    const overallAvg = factors.reduce((a, b) => a + b, 0) / periodLength;
    return factors.map(f => overallAvg > 0 ? f / overallAvg : 1);
  }

  deseasonalize(values: number[], periodLength: number): number[] {
    const factors = this.getSeasonalFactors(values, periodLength);
    return values.map((v, i) => v / factors[i % periodLength]);
  }

  forecastWithSeasonality(values: number[], periodLength: number, ahead: number): number[] {
    const deseasonalized = this.deseasonalize(values, periodLength);
    const n = deseasonalized.length;
    const mean = deseasonalized.reduce((a, b) => a + b, 0) / n;
    let slope = 0;
    if (n > 1) {
      const xMean = (n - 1) / 2;
      const yMean = mean;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (deseasonalized[i] - yMean);
        den += (i - xMean) ** 2;
      }
      slope = den !== 0 ? num / den : 0;
    }
    const factors = this.getSeasonalFactors(values, periodLength);
    const forecast: number[] = [];
    for (let i = 0; i < ahead; i++) {
      const trend = mean + slope * (n + i);
      const factor = factors[(n + i) % periodLength];
      forecast.push(trend * factor);
    }
    return forecast;
  }
}

import { Dimension } from "../types";

export class GrowthAnalyzer {
  calcGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? Infinity : 0;
    return (current - previous) / Math.abs(previous);
  }

  calcCAGR(startValue: number, endValue: number, periods: number): number {
    if (periods <= 0 || startValue === 0) return 0;
    return (endValue / startValue) ** (1 / periods) - 1;
  }

  calcMoM(values: number[]): number[] {
    const rates: number[] = [];
    for (let i = 1; i < values.length; i++) {
      rates.push(this.calcGrowthRate(values[i], values[i - 1]));
    }
    return rates;
  }

  calcYoY(values: number[], period: number): { current: number; previous: number; growth: number } {
    if (period >= values.length) {
      return { current: values[values.length - 1], previous: values[0], growth: 0 };
    }
    const current = values[values.length - 1];
    const previous = values[values.length - 1 - period];
    return { current, previous, growth: this.calcGrowthRate(current, previous) };
  }

  isHealthyGrowth(rate: number, dimension: Dimension): boolean {
    const thresholds: Record<Dimension, number> = {
      sales: 0.1,
      inventory: 0.05,
      finance: 0.08,
      hr: 0.05,
      production: 0.07,
      purchasing: 0.05,
      warehouse: 0.05,
      crm: 0.1,
      marketing: 0.15,
      expansion: 0.2,
      platform: 0.1,
    };
    return rate >= thresholds[dimension];
  }
}

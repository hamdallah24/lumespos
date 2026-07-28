export class OutlierDetector {
  detect(values: number[]): { index: number; value: number; zScore: number; isOutlier: boolean }[] {
    const n = values.length;
    if (n === 0) return [];
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);
    return values.map((value, index) => {
      const zScore = std !== 0 ? (value - mean) / std : 0;
      return { index, value, zScore, isOutlier: Math.abs(zScore) > 2 };
    });
  }

  getIQR(values: number[]): { q1: number; q3: number; iqr: number; lowerFence: number; upperFence: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 0.25);
    const q3 = this.percentile(sorted, 0.75);
    const iqr = q3 - q1;
    return { q1, q3, iqr, lowerFence: q1 - 1.5 * iqr, upperFence: q3 + 1.5 * iqr };
  }

  private percentile(sorted: number[], p: number): number {
    const index = p * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }

  detectByIQR(values: number[]): number[] {
    const { lowerFence, upperFence } = this.getIQR(values);
    return values.filter(v => v < lowerFence || v > upperFence);
  }
}

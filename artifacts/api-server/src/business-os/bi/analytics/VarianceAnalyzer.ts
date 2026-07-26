export class VarianceAnalyzer {
  analyze(current: number, previous: number): { absolute: number; percentage: number; isSignificant: boolean } {
    const absolute = current - previous;
    const percentage = previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : current !== 0 ? Infinity : 0;
    const isSignificant = this.isSignificantVariance(percentage);
    return { absolute, percentage, isSignificant };
  }

  isSignificantVariance(changePct: number, threshold: number = 10): boolean {
    return Math.abs(changePct) > threshold;
  }

  getSignificanceLabel(changePct: number): "increase" | "decrease" | "stable" {
    if (changePct > 10) return "increase";
    if (changePct < -10) return "decrease";
    return "stable";
  }
}

export class CorrelationAnalyzer {
  pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX) * Math.sqrt(denY);
    if (den === 0) return 0;
    return Math.max(-1, Math.min(1, num / den));
  }

  findCorrelations(kpiValues: Map<string, number[]>): { kpiA: string; kpiB: string; correlation: number; strength: "strong" | "moderate" | "weak" }[] {
    const result: { kpiA: string; kpiB: string; correlation: number; strength: "strong" | "moderate" | "weak" }[] = [];
    const keys = Array.from(kpiValues.keys());
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const corr = this.pearsonCorrelation(kpiValues.get(keys[i])!, kpiValues.get(keys[j])!);
        if (Math.abs(corr) > 0.3) {
          const abs = Math.abs(corr);
          const strength: "strong" | "moderate" | "weak" = abs > 0.7 ? "strong" : abs > 0.5 ? "moderate" : "weak";
          result.push({ kpiA: keys[i], kpiB: keys[j], correlation: corr, strength });
        }
      }
    }
    return result;
  }

  getDrivers(targetKpi: string, allKpis: Map<string, number[]>): { kpi: string; correlation: number; direction: "positive" | "negative" }[] {
    const result: { kpi: string; correlation: number; direction: "positive" | "negative" }[] = [];
    const targetValues = allKpis.get(targetKpi);
    if (!targetValues) return [];
    for (const [kpi, values] of allKpis) {
      if (kpi === targetKpi) continue;
      const corr = this.pearsonCorrelation(targetValues, values);
      result.push({ kpi, correlation: corr, direction: corr >= 0 ? "positive" : "negative" });
    }
    result.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    return result;
  }
}

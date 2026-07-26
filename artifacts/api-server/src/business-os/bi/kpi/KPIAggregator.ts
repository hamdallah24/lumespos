import type { KPIValue, Dimension } from "../types";

export class KPIAggregator {
  aggregateByDimension(values: KPIValue[]): Map<Dimension, KPIValue[]> {
    const map = new Map<Dimension, KPIValue[]>();
    for (const v of values) {
      const existing = map.get(v.dimension) ?? [];
      existing.push(v);
      map.set(v.dimension, existing);
    }
    return map;
  }

  aggregateByExecutive(values: KPIValue[]): Map<string, KPIValue[]> {
    const map = new Map<string, KPIValue[]>();
    for (const v of values) {
      const existing = map.get(v.executive) ?? [];
      existing.push(v);
      map.set(v.executive, existing);
    }
    return map;
  }

  getAverage(values: KPIValue[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v.value, 0) / values.length;
  }

  getTotal(values: KPIValue[]): number {
    return values.reduce((sum, v) => sum + v.value, 0);
  }

  getMin(values: KPIValue[]): { kpiId: string; value: number } | null {
    if (values.length === 0) return null;
    let min = values[0];
    for (const v of values) {
      if (v.value < min.value) min = v;
    }
    return { kpiId: min.kpiId, value: min.value };
  }

  getMax(values: KPIValue[]): { kpiId: string; value: number } | null {
    if (values.length === 0) return null;
    let max = values[0];
    for (const v of values) {
      if (v.value > max.value) max = v;
    }
    return { kpiId: max.kpiId, value: max.value };
  }
}

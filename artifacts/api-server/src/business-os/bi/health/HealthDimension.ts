import type { Dimension } from "../types";

const ALL_DIMENSIONS: Dimension[] = [
  "sales", "inventory", "finance", "hr", "production",
  "purchasing", "warehouse", "crm", "marketing", "expansion", "platform",
];

const DEFAULT_WEIGHTS: Record<Dimension, number> = {
  sales: 0.15,
  inventory: 0.12,
  finance: 0.20,
  hr: 0.08,
  production: 0.10,
  purchasing: 0.06,
  warehouse: 0.07,
  crm: 0.08,
  marketing: 0.06,
  expansion: 0.04,
  platform: 0.04,
};

export class HealthDimension {
  dimensions: Dimension[] = [...ALL_DIMENSIONS];
  weights: Record<Dimension, number> = { ...DEFAULT_WEIGHTS };

  getWeight(dimension: Dimension): number {
    return this.weights[dimension] ?? 0;
  }

  setWeight(dimension: Dimension, weight: number): void {
    this.weights[dimension] = weight;
  }

  getThresholds(dimension: Dimension): { healthy: number; warning: number } {
    return { healthy: 80, warning: 50 };
  }
}

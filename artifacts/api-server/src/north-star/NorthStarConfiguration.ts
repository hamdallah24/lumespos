export interface NorthStarMetric {
  id: string;
  name: string;
  description: string;
  weight: number;
  target: number;
  unit: string;
  direction: "up" | "down";
}

export interface NorthStarConfig {
  objectives: NorthStarMetric[];
  version: string;
  updatedAt: string;
}

export const DEFAULT_NORTH_STAR_CONFIG: NorthStarConfig = {
  objectives: [
    { id: "NS-001", name: "Revenue Growth", description: "Monthly revenue growth rate", weight: 25, target: 15, unit: "%", direction: "up" },
    { id: "NS-002", name: "Gross Margin", description: "Overall gross margin percentage", weight: 20, target: 65, unit: "%", direction: "up" },
    { id: "NS-003", name: "Stock Coverage", description: "Average stock coverage in days", weight: 15, target: 7, unit: "days", direction: "up" },
    { id: "NS-004", name: "Yield Efficiency", description: "Production yield vs recipe target", weight: 15, target: 95, unit: "%", direction: "up" },
    { id: "NS-005", name: "Cash Discrepancy", description: "Max cash discrepancy per shift", weight: 10, target: 0, unit: "Rp", direction: "down" },
    { id: "NS-006", name: "Expense Ratio", description: "Expense to revenue ratio", weight: 10, target: 40, unit: "%", direction: "down" },
    { id: "NS-007", name: "Customer Satisfaction", description: "Average customer rating", weight: 5, target: 4.5, unit: "/5", direction: "up" },
  ],
  version: "1.0",
  updatedAt: new Date().toISOString(),
};

let config: NorthStarConfig = { ...DEFAULT_NORTH_STAR_CONFIG, objectives: [...DEFAULT_NORTH_STAR_CONFIG.objectives] };

export const NorthStarConfiguration = {
  get(): NorthStarConfig {
    return { ...config, objectives: [...config.objectives] };
  },

  update(updates: Partial<NorthStarConfig>): void {
    config = { ...config, ...updates, updatedAt: new Date().toISOString() };
  },

  getObjective(id: string): NorthStarMetric | undefined {
    return config.objectives.find(o => o.id === id);
  },

  updateObjective(id: string, updates: Partial<NorthStarMetric>): boolean {
    const index = config.objectives.findIndex(o => o.id === id);
    if (index === -1) return false;
    config.objectives[index] = { ...config.objectives[index], ...updates };
    return true;
  },

  reset(): void {
    config = { ...DEFAULT_NORTH_STAR_CONFIG, objectives: [...DEFAULT_NORTH_STAR_CONFIG.objectives] };
  },
};

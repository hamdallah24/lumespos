export interface TwinBusinessState {
  cashAvailable: number;
  revenue: number;
  expenses: number;
  grossMargin: number;
  stockCoverageDays: number;
  activeBranches: number;
  activeEmployees: number;
  customerSatisfaction: number;
  updatedAt: string;
}

export interface TwinAdjustment {
  field: keyof TwinBusinessState;
  label: string;
  delta: number;
  description: string;
}

export interface TwinScenario {
  id: string;
  label: string;
  adjustments: TwinAdjustment[];
  projected: TwinBusinessState;
}

export interface TwinComparison {
  field: string;
  realValue: number;
  twinValue: number;
  delta: number;
  deltaPercent: number;
  direction: "up" | "down" | "stable";
}

export interface DriftAlert {
  field: string;
  realValue: number;
  twinValue: number;
  driftPercent: number;
  severity: "low" | "medium" | "high";
  detectedAt: string;
}

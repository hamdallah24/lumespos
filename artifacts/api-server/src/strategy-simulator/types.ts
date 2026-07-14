import type { OperationalSituation } from "../operational-decision-engine/core/types";
import type { DecisionContext, BusinessState, ResourceState, RiskProfile } from "../decision-context/types";
import type { StrategicDirection, StrategicObjective, NorthStarAlignment } from "../strategy-engine/core/types";

export type SimulationStatus = "pending" | "running" | "completed" | "failed";

export interface SimulationConfig {
  id: string;
  label: string;
  situation: OperationalSituation;
  contextOverrides?: Partial<DecisionContext>;
  directionOverride?: StrategicDirection;
}

export interface SimulationVariant {
  id: string;
  label: string;
  direction: StrategicDirection;
  riskTolerance: "low" | "medium" | "high";
  availableBudget: number;
  cashAvailable: number;
  currentOperationalRisk: number;
}

export interface SimulationResult {
  configId: string;
  label: string;
  direction: StrategicDirection;
  objective: StrategicObjective;
  northStarAlignment: NorthStarAlignment;
  confidence: number;
  status: SimulationStatus;
  durationMs: number;
  error?: string;
}

export interface ComparisonEntry {
  label: string;
  direction: StrategicDirection;
  overallScore: number;
  confidence: number;
  topDimension: { name: string; score: number } | null;
  dimensionCount: number;
}

export interface ComparisonReport {
  simulations: ComparisonEntry[];
  topRanked: ComparisonEntry | null;
  spread: number;
  generatedAt: string;
}

export interface SensitivityFactor {
  name: string;
  variation: string;
  baseValue: number;
  variedValue: number;
  impact: number;
  impactLabel: "positive" | "negative" | "neutral";
}

export interface SensitivityReport {
  baseResult: SimulationResult;
  factors: SensitivityFactor[];
  mostSensitive: SensitivityFactor | null;
  leastSensitive: SensitivityFactor | null;
  generatedAt: string;
}

export interface ForecastKPI {
  metric: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  probability: number;
  projectedValue: number;
  confidenceInterval: { low: number; high: number };
}

export interface ForecastResult {
  kpis: ForecastKPI[];
  overallConfidence: number;
  summary: string;
  generatedAt: string;
}

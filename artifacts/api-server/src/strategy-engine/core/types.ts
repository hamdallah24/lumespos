import type { MetricDomain } from "../../business-intelligence/core/types";

export type StrategicDirection = "growth" | "optimization" | "cost_reduction" | "quality" | "risk_mitigation";

export type ObjectiveStatus = "draft" | "active" | "completed" | "cancelled";

export interface KPITarget {
  metric: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: Date;
}

export interface NorthStarDimension {
  name: string;
  weight: number;
  score: number;
  rationale: string;
}

export interface NorthStarAlignment {
  overallScore: number;
  dimensions: NorthStarDimension[];
  summary: string;
}

export interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  direction: StrategicDirection;
  domain: MetricDomain;
  sourceSituationId: string;
  kpiTargets: KPITarget[];
  northStarAlignment: NorthStarAlignment;
  confidence: number;
  status: ObjectiveStatus;
  createdAt: Date;
  branchId?: number;
}

export interface StrategicOption {
  id: string;
  direction: StrategicDirection;
  title: string;
  description: string;
  expectedImpact: string;
  confidence: number;
  risks: string[];
}

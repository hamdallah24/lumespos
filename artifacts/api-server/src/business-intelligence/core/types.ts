export type MetricDomain = "inventory" | "sales" | "finance" | "shift" | "production";

export type MetricPeriod = "realtime" | "daily" | "weekly" | "monthly";

export interface Metric {
  id: string;
  domain: MetricDomain;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  period: MetricPeriod;
  tags: Record<string, string | number>;
  branchId?: number;
}

export type InsightCategory = "coverage" | "growth" | "trend" | "anomaly" | "comparison";

export type InsightSeverity = "info" | "warning" | "critical";

export interface Insight {
  id: string;
  category: InsightCategory;
  name: string;
  description: string;
  value: number;
  threshold?: number;
  severity: InsightSeverity;
  sourceMetrics: string[];
  timestamp: Date;
  domain: MetricDomain;
  branchId?: number;
}

export type FactCategory = "threshold" | "anomaly" | "trend";

export type FactSeverity = "low" | "medium" | "high";

export interface BusinessFact {
  id: string;
  category: FactCategory;
  name: string;
  description: string;
  severity: FactSeverity;
  sourceInsights: string[];
  sourceMetrics: string[];
  value: number;
  threshold?: number;
  deviation?: number;
  timestamp: Date;
  domain: MetricDomain;
  branchId?: number;
  expiresAt?: Date;
}

export interface FactThreshold {
  factName: string;
  domain: MetricDomain;
  warningThreshold: number;
  criticalThreshold: number;
  direction: "above" | "below";
  description: string;
}

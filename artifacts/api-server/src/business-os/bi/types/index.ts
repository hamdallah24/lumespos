export type Dimension = "sales" | "inventory" | "finance" | "hr" | "production" | "purchasing" | "warehouse" | "crm" | "marketing" | "expansion" | "platform";

export type Period = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type Trend = "up" | "down" | "stable" | "volatile";
export type Severity = "low" | "medium" | "high" | "critical";
export type ComparisonType = "vs_target" | "vs_last_period" | "vs_last_year" | "vs_benchmark";

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  dimension: Dimension;
  ownerExecutive: string;
  unit: string;
  higherIsBetter: boolean;
  calculation: string;
  dataSource: string;
  refreshInterval: string;
  tags: string[];
}

export interface KPIValue {
  kpiId: string;
  kpiName: string;
  dimension: Dimension;
  executive: string;
  value: number;
  previousValue?: number;
  targetValue?: number;
  unit: string;
  higherIsBetter: boolean;
  timestamp: string;
  period: Period;
  periodKey: string;
}

export interface KPITrend {
  kpiId: string;
  values: { date: string; value: number }[];
  trend: Trend;
  changePct: number;
  volatility: number;
}

export interface KPIAlert {
  kpiId: string;
  kpiName: string;
  dimension: Dimension;
  value: number;
  threshold: number;
  severity: Severity;
  message: string;
  timestamp: string;
}

export interface AnalyticsResult {
  dimension: Dimension;
  metric: string;
  currentValue: number;
  previousValue: number;
  changePct: number;
  changeAbsolute: number;
  trend: Trend;
  variance: number;
  isSignificant: boolean;
  period: Period;
  periodKey: string;
}

export interface ForecastResult {
  metric: string;
  dimension: Dimension;
  currentValue: number;
  forecast7d: number;
  forecast30d: number;
  forecast90d: number;
  forecast365d: number;
  confidence: number;
  trend: Trend;
  seasonalityFactor: number;
  warnings: string[];
  generatedAt: string;
}

export interface DashboardSection {
  id: string;
  title: string;
  type: "kpi_grid" | "trend_chart" | "alert_list" | "forecast_card" | "benchmark_table" | "narrative_block";
  data: any;
  order: number;
}

export interface ExecutiveDashboard {
  executive: string;
  title: string;
  sections: DashboardSection[];
  generatedAt: string;
}

export interface BenchmarkResult {
  entity: string;
  entityType: "branch" | "product" | "employee" | "campaign";
  score: number;
  metrics: { name: string; value: number; avg: number; rank: number }[];
  overallRank: number;
  totalEntities: number;
  percentile: number;
}

export interface HealthScoreResult {
  overall: number;
  dimensions: { dimension: Dimension; score: number; status: "healthy" | "warning" | "critical"; trend: Trend }[];
  topRisks: { dimension: Dimension; risk: string; severity: Severity }[];
  topOpportunities: { dimension: Dimension; opportunity: string; impact: string }[];
  timestamp: string;
}

export interface NarrativeInsight {
  type: "positive" | "negative" | "warning" | "opportunity";
  dimension: Dimension;
  headline: string;
  description: string;
  metrics: { name: string; value: number; change: number }[];
  rootCauses: string[];
  recommendations: string[];
  confidence: number;
}

export interface ExplanationTrace {
  decisionId: string;
  executive: string;
  action: string;
  reasoning: string;
  triggers: { source: string; data: any; threshold?: any }[];
  dataPoints: { label: string; value: any; source: string }[];
  confidence: number;
  generatedAt: string;
}

export interface CompanySnapshot {
  timestamp: string;
  health: number;
  revenue: { today: number; month: number; year: number };
  cash: { position: number; forecast: string };
  profit: { month: number; margin: number };
  topRisks: { risk: string; severity: Severity }[];
  topOpportunities: { opportunity: string; impact: string }[];
  activeObjectives: number;
  pendingApprovals: number;
  executiveDecisions: number;
  councilSessions: number;
  forecast30d: { revenue: number; cash: number; profit: number };
  insights: NarrativeInsight[];
}

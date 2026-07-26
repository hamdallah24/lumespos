import type { KPIValue, KPIAlert, ForecastResult, AnalyticsResult, BenchmarkResult, HealthScoreResult, NarrativeInsight, ExplanationTrace } from "../types";

export interface BIContext {
  kpis: KPIValue[];
  alerts: KPIAlert[];
  forecasts: ForecastResult[];
  analytics: AnalyticsResult[];
  benchmarks: BenchmarkResult[];
  health: HealthScoreResult;
  narratives: NarrativeInsight[];
  recommendations: { insight: string; recommendation: string; priority: string; impact: string }[];
  explanations: any[];
  generatedAt: number;
}

export interface CEOBIContext {
  companyHealth: number;
  companyForecast: { revenue30d: number; revenue90d: number; revenue365d: number };
  growthTrend: { revenue: number; profit: number; expansion: number };
  riskSummary: { risk: string; severity: string }[];
  executivePerformance: { executive: string; score: number; status: string }[];
}

export interface COOBIContext {
  inventoryForecast: { stockoutRisk: string; reorderPoint: number; daysUntilStockout: number | null };
  warehouseHealth: number;
  productionTrend: { yield: number; oee: number; waste: number };
  supplierRisk: { supplier: string; risk: string }[];
  stockPrediction: string;
}

export interface CFOContextBI {
  cashForecast: { runway: number; criticalDate: string | null };
  cashRunway: number;
  marginTrend: { gross: number; net: number; trend: string };
  expenseVariance: { category: string; variance: number; isSignificant: boolean }[];
  financialHealth: number;
}

export interface CMOBIContext {
  campaignRanking: { campaign: string; roi: number }[];
  roas: number;
  cac: number;
  conversionTrend: { rate: number; trend: string };
  marketInsight: string[];
}

export interface CHROBIContext {
  turnoverPrediction: { rate: number; trend: string };
  attendanceTrend: { rate: number; trend: string };
  productivityTrend: { value: number; trend: string };
  hiringForecast: { needs: number; months: number }[];
}

export interface CKOBIContext {
  learningTrend: { completion: number; trend: string };
  knowledgeGap: string[];
  documentationHealth: number;
}

export interface CAIOBIContext {
  automationTrend: { coverage: number; trend: string };
  modelAccuracy: number;
  agentPerformance: { agent: string; score: number }[];
}

export interface CTOBIContext {
  deploymentHealth: number;
  bugTrend: { count: number; trend: string };
  technicalDebt: { score: number; items: string[] };
  uptimeForecast: number;
}

export type ExecutiveBIContext = CEOBIContext | COOBIContext | CFOContextBI | CMOBIContext | CHROBIContext | CKOBIContext | CAIOBIContext | CTOBIContext;

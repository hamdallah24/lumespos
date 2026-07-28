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
  inventoryForecast: { stockoutRisk: string; reorderPoint: number | null; daysUntilStockout: number | null };
  warehouseHealth: number | null;
  productionTrend: { yield: number | null; oee: number | null; waste: number | null };
  supplierRisk: { supplier: string; risk: string }[];
  stockPrediction: string;
}

export interface CFOContextBI {
  cashForecast: { runway: number | null; criticalDate: string | null };
  cashRunway: number | null;
  marginTrend: { gross: number | null; net: number | null; trend: string };
  expenseVariance: { category: string; variance: number; isSignificant: boolean }[];
  financialHealth: number | null;
}

export interface CMOBIContext {
  campaignRanking: { campaign: string; roi: number }[];
  roas: number;
  cac: number;
  conversionTrend: { rate: number; trend: string };
  marketInsight: string[];
}

export interface CHROBIContext {
  turnoverPrediction: { rate: number | null; trend: string };
  attendanceTrend: { rate: number | null; trend: string };
  productivityTrend: { value: number | null; trend: string };
  hiringForecast: { needs: number; months: number }[];
}

export interface CKOBIContext {
  learningTrend: { completion: number | null; trend: string };
  knowledgeGap: string[];
  documentationHealth: number | null;
}

export interface CAIOBIContext {
  automationTrend: { coverage: number | null; trend: string };
  modelAccuracy: number | null;
  agentPerformance: { agent: string; score: number }[];
}

export interface CTOBIContext {
  deploymentHealth: number | null;
  bugTrend: { count: number; trend: string };
  technicalDebt: { score: number | null; items: string[] };
  uptimeForecast: number | null;
}

export type ExecutiveBIContext = CEOBIContext | COOBIContext | CFOContextBI | CMOBIContext | CHROBIContext | CKOBIContext | CAIOBIContext | CTOBIContext;

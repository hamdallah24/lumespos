import { InsightGenerator } from "./InsightGenerator";
import { RecommendationGenerator } from "./RecommendationGenerator";
import { ExecutiveNarrative } from "./ExecutiveNarrative";
import { FounderNarrative } from "./FounderNarrative";
import {
  NarrativeInsight,
  KPIValue,
  KPIAlert,
  ForecastResult,
  AnalyticsResult,
} from "../types";

export class NarrativeEngine {
  insight: InsightGenerator;
  recommendation: RecommendationGenerator;
  executive: ExecutiveNarrative;
  founder: FounderNarrative;

  constructor() {
    this.insight = new InsightGenerator();
    this.recommendation = new RecommendationGenerator();
    this.executive = new ExecutiveNarrative();
    this.founder = new FounderNarrative();
  }

  generateAll(
    kpis: KPIValue[],
    previousKpis: KPIValue[],
    alerts: KPIAlert[],
    forecast: ForecastResult[],
    analytics: AnalyticsResult[]
  ): { insights: NarrativeInsight[]; recommendations: any[] } {
    const fromKPI = this.insight.generateFromKPIs(kpis, previousKpis);
    const fromAlerts = this.insight.generateFromAlerts(alerts);
    const fromForecast = this.insight.generateFromForecast(forecast);
    const fromAnalytics = this.insight.generateFromAnalytics(analytics);

    const insights = [...fromKPI, ...fromAlerts, ...fromForecast, ...fromAnalytics];
    const recommendations = this.recommendation.generateFromInsights(insights);

    return { insights, recommendations };
  }

  getBriefing(
    executive: string,
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecast: ForecastResult[],
    analytics: AnalyticsResult[]
  ): string {
    const { insights } = this.generateAll(kpis, [], alerts, forecast, analytics);
    const narrative = this.executive.generateForExecutive(executive, insights);
    return this.executive.formatNarrative(
      narrative.headline,
      narrative.body,
      narrative.keyMetrics,
      narrative.actionsRequired
    );
  }

  getFounderBriefing(
    kpis: KPIValue[],
    alerts: KPIAlert[],
    forecast: ForecastResult[],
    health: { overall: number },
    analytics: AnalyticsResult[]
  ): string {
    const { insights } = this.generateAll(kpis, [], alerts, forecast, analytics);
    const result = this.founder.generate(insights, health, forecast);
    return this.founder.formatBriefing(result);
  }
}

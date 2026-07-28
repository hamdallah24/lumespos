import { KPIEngine } from "../kpi/KPIEngine";
import { AnalyticsEngine } from "../analytics/AnalyticsEngine";
import { ForecastEngine } from "../forecast/ForecastEngine";
import { BenchmarkEngine } from "../benchmark/BenchmarkEngine";
import { HealthEngine } from "../health/HealthEngine";
import { NarrativeEngine } from "../narrative/NarrativeEngine";
import { Explainability } from "../explain/Explainability";
import { BIContextCache } from "./BIContextCache";
import type { BIContext } from "./BIContext";
import type { KPIValue } from "../types";

export class BIContextBuilder {
  public kpi: KPIEngine;
  public analytics: AnalyticsEngine;
  public forecast: ForecastEngine;
  public benchmark: BenchmarkEngine;
  public health: HealthEngine;
  public narrative: NarrativeEngine;
  public explain: Explainability;
  public cache: BIContextCache;

  private lastBuildResult: BIContext | null = null;

  constructor() {
    this.kpi = new KPIEngine();
    this.analytics = new AnalyticsEngine();
    this.forecast = new ForecastEngine();
    this.benchmark = new BenchmarkEngine();
    this.health = new HealthEngine();
    this.narrative = new NarrativeEngine();
    this.explain = new Explainability();
    this.cache = new BIContextCache();
  }

  async build(runtimeContext?: any): Promise<BIContext> {
    const cached = this.cache.get("full");
    if (cached) return cached as BIContext;

    const rc = runtimeContext ?? {};
    const kpiResult = this.kpi.calculateAll(rc);
    const kpiValues = kpiResult.values;
    const alerts = kpiResult.alerts;

    const analyticsResults = this.analytics.analyzeAll(kpiValues);

    const kpiMap = new Map<string, number[]>();
    for (const kv of kpiValues) {
      const existing = kpiMap.get(kv.kpiId) ?? [];
      existing.push(kv.value);
      kpiMap.set(kv.kpiId, existing);
    }

    const forecastResults = this.forecast.forecastAll(kpiMap);

    for (const bm of this.benchmark.branch.getAllBenchmarks()) { /* pre-warm benchmarks */ }

    const healthResult = this.health.calculate(kpiValues);

    const { insights } = this.narrative.generateAll(kpiValues, [], alerts, forecastResults, analyticsResults);

    const recommendations = this.narrative.recommendation.generateFromInsights(insights);

    const explanations: any[] = insights.slice(0, 5).map(i => { try { return this.explain.explainInsight(i).trace; } catch { return null; } }).filter(Boolean);

    const ctx: BIContext = {
      kpis: kpiValues,
      alerts,
      forecasts: forecastResults,
      analytics: analyticsResults,
      benchmarks: [...this.benchmark.getAllBranchBenchmarks(), ...this.benchmark.getAllProductBenchmarks()],
      health: healthResult,
      narratives: insights,
      recommendations,
      explanations,
      generatedAt: Date.now(),
    };

    this.cache.set("full", ctx);
    this.lastBuildResult = ctx;
    return ctx;
  }

  async buildForced(runtimeContext?: any): Promise<BIContext> {
    this.cache.clear("full");
    return this.build(runtimeContext);
  }

  getLastContext(): BIContext | null {
    return this.lastBuildResult;
  }

  getSubContext(executive: string, bi: BIContext): Record<string, any> {
    const filtered = {
      kpis: bi.kpis.filter(k => this.kpiForExecutive(k.kpiId, executive)),
      alerts: bi.alerts.filter(a => this.kpiForExecutive(a.kpiId, executive)),
      forecasts: bi.forecasts.filter(f => this.executiveForDimension(f.dimension) === executive),
      analytics: bi.analytics.filter(a => this.executiveForDimension(a.dimension) === executive),
      benchmarks: bi.benchmarks,
      health: bi.health,
      narratives: bi.narratives.filter(n => this.executiveForDimension(n.dimension) === executive),
      recommendations: bi.recommendations.slice(0, 3),
    };
    return filtered;
  }

  private kpiForExecutive(kpiId: string, executive: string): boolean {
    const map: Record<string, string> = {
      kpi_revenue: "CMO", kpi_gross_sales: "CMO", kpi_net_sales: "CMO", kpi_aov: "CMO", kpi_orders: "CMO",
      kpi_inventory_turnover: "COO", kpi_inventory_value: "COO", kpi_stock_accuracy: "COO", kpi_waste_pct: "COO", kpi_stockout_rate: "COO",
      kpi_gross_margin: "CFO", kpi_net_margin: "CFO", kpi_cash_flow: "CFO", kpi_burn_rate: "CFO", kpi_ebitda: "CFO",
      kpi_attendance: "CHRO", kpi_turnover: "CHRO", kpi_productivity: "CHRO",
      kpi_cac: "CMO", kpi_roas: "CMO", kpi_conversion_rate: "CMO",
      kpi_yield: "COO", kpi_oee: "COO", kpi_production_waste: "COO",
      kpi_picking_accuracy: "COO", kpi_uptime: "CTO",
      kpi_retention: "CMO", kpi_churn_rate: "CMO",
    };
    return (map[kpiId] ?? "") === executive;
  }

  private executiveForDimension(dimension: string): string {
    const map: Record<string, string> = {
      sales: "CMO", inventory: "COO", finance: "CFO", hr: "CHRO",
      marketing: "CMO", production: "COO", warehouse: "COO",
      crm: "CMO", platform: "CTO", expansion: "CEO", purchasing: "COO",
    };
    return map[dimension] ?? "CEO";
  }
}

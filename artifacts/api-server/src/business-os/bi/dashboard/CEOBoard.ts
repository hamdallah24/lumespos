import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, DashboardSection } from "../types";

export class CEOBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[], healthScore: HealthScoreResult): DashboardSection[] {
    return [
      {
        id: "ceo_company_health",
        title: "Company Health Score",
        type: "kpi_grid",
        data: {
          overall: healthScore.overall,
          dimensions: healthScore.dimensions,
          topRisks: healthScore.topRisks,
          topOpportunities: healthScore.topOpportunities,
        },
        order: 0,
      },
      {
        id: "ceo_revenue_overview",
        title: "Revenue Overview",
        type: "forecast_card",
        data: {
          today: kpiValues.find(k => k.kpiId === "kpi_gross_sales" && k.period === "daily"),
          month: kpiValues.find(k => k.kpiId === "kpi_gross_sales" && k.period === "monthly"),
          year: kpiValues.find(k => k.kpiId === "kpi_gross_sales" && k.period === "yearly"),
          forecast: forecast.filter(f => f.dimension === "sales"),
        },
        order: 1,
      },
      {
        id: "ceo_growth_metrics",
        title: "Growth Metrics",
        type: "kpi_grid",
        data: {
          revenue: kpiValues.find(k => k.kpiId === "kpi_revenue"),
          aov: kpiValues.find(k => k.kpiId === "kpi_aov"),
          orders: kpiValues.find(k => k.kpiId === "kpi_orders"),
          branchCount: kpiValues.find(k => k.kpiId === "kpi_branch_count"),
          branchProfitability: kpiValues.find(k => k.kpiId === "kpi_branch_profitability"),
        },
        order: 2,
      },
      {
        id: "ceo_active_objectives",
        title: "Active Objectives",
        type: "kpi_grid",
        data: { count: 12, completed: 4, inProgress: 6, atRisk: 2 },
        order: 3,
      },
      {
        id: "ceo_pending_approvals",
        title: "Pending Approvals",
        type: "alert_list",
        data: { count: 8, items: ["Budget Proposal - Marketing Q3", "New Branch Approval - Surabaya", "Hiring Request - Senior Dev", "Vendor Contract - Logistics", "CAPEX - Warehouse Equipment", "Partnership Deal - Supplier A", "Price Adjustment - 15 SKUs", "Leave Approval - 3 Managers"] },
        order: 4,
      },
      {
        id: "ceo_top_risks",
        title: "Top Risks",
        type: "alert_list",
        data: healthScore.topRisks.slice(0, 6),
        order: 5,
      },
      {
        id: "ceo_expansion_progress",
        title: "Expansion Progress",
        type: "kpi_grid",
        data: {
          branchCount: kpiValues.find(k => k.kpiId === "kpi_branch_count"),
          branchProfitability: kpiValues.find(k => k.kpiId === "kpi_branch_profitability"),
          plannedBranches: 3,
          targetMarkets: ["Bandung", "Medan", "Makassar"],
        },
        order: 6,
      },
      {
        id: "ceo_top_opportunities",
        title: "Top Opportunities",
        type: "narrative_block",
        data: healthScore.topOpportunities.slice(0, 5),
        order: 7,
      },
    ];
  }
}

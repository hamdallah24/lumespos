import type { KPIValue, KPIAlert, ForecastResult, HealthScoreResult, NarrativeInsight, DashboardSection } from "../types";

export class FounderBoard {
  build(health: HealthScoreResult, kpis: KPIValue[], alerts: KPIAlert[], forecasts: ForecastResult[], narratives: NarrativeInsight[]): DashboardSection[] {
    const todayRevenue = kpis.find(k => k.kpiId === "kpi_gross_sales" && k.period === "daily");
    const monthRevenue = kpis.find(k => k.kpiId === "kpi_gross_sales" && k.period === "monthly");
    const yearRevenue = kpis.find(k => k.kpiId === "kpi_gross_sales" && k.period === "yearly");
    const cashFlow = kpis.find(k => k.kpiId === "kpi_cash_flow");

    return [
      {
        id: "founder_company_health",
        title: "Company Health",
        type: "kpi_grid",
        data: {
          overall: health.overall,
          dimensions: health.dimensions,
          breakdown: [
            { label: "Financial", score: health.dimensions.find(d => d.dimension === "finance")?.score ?? 0 },
            { label: "Sales", score: health.dimensions.find(d => d.dimension === "sales")?.score ?? 0 },
            { label: "Operations", score: health.dimensions.find(d => d.dimension === "inventory")?.score ?? 0 },
            { label: "HR", score: health.dimensions.find(d => d.dimension === "hr")?.score ?? 0 },
            { label: "Platform", score: health.dimensions.find(d => d.dimension === "platform")?.score ?? 0 },
          ],
        },
        order: 0,
      },
      {
        id: "founder_executive_summary",
        title: "Executive Summary",
        type: "narrative_block",
        data: {
          executives: [
            { role: "CEO", line: `Health score ${health.overall}/100 with ${health.topRisks.length} active risks` },
            { role: "COO", line: `Inventory turnover ${kpis.find(k => k.kpiId === "kpi_inventory_turnover")?.value ?? "N/A"}x (${alerts.filter(a => a.dimension === "inventory").length} inventory alerts)` },
            { role: "CFO", line: `Cash position ${cashFlow?.value ?? 0}, burn rate ${kpis.find(k => k.kpiId === "kpi_burn_rate")?.value ?? "N/A"}` },
            { role: "CMO", line: `Revenue ${monthRevenue?.value ?? 0}, ${kpis.find(k => k.kpiId === "kpi_sales_target")?.value ?? 0}% of target` },
            { role: "CHRO", line: `Headcount ${kpis.find(k => k.kpiId === "kpi_headcount")?.value ?? 0}, turnover ${kpis.find(k => k.kpiId === "kpi_turnover")?.value ?? 0}%` },
            { role: "CAIO", line: `All systems operational, automation at ${kpis.find(k => k.kpiId === "kpi_uptime")?.value ?? 0}% uptime` },
            { role: "CKO", line: `Knowledge base ${298} articles published, ${73}% documentation coverage` },
          ],
        },
        order: 1,
      },
      {
        id: "founder_revenue_cash",
        title: "Today's Revenue & Cash",
        type: "kpi_grid",
        data: {
          revenueToday: todayRevenue,
          revenueMonth: monthRevenue,
          revenueYear: yearRevenue,
          cash: cashFlow,
          combined: {
            today: todayRevenue?.value ?? 0,
            month: monthRevenue?.value ?? 0,
            year: yearRevenue?.value ?? 0,
          },
        },
        order: 2,
      },
      {
        id: "founder_top_risks",
        title: "Top 10 Risks",
        type: "alert_list",
        data: health.topRisks.slice(0, 10),
        order: 3,
      },
      {
        id: "founder_top_opportunities",
        title: "Top 10 Opportunities",
        type: "narrative_block",
        data: health.topOpportunities.slice(0, 10),
        order: 4,
      },
      {
        id: "founder_active_objectives",
        title: "Active Objectives Progress",
        type: "kpi_grid",
        data: {
          total: 12,
          completed: 4,
          inProgress: 6,
          atRisk: 2,
          objectives: [
            { name: "Expand to 3 new cities", progress: 60, status: "on_track" },
            { name: "Achieve profitability", progress: 85, status: "on_track" },
            { name: "Launch mobile app", progress: 40, status: "at_risk" },
            { name: "Reduce churn to <5%", progress: 70, status: "on_track" },
            { name: "Hire 10 senior engineers", progress: 50, status: "at_risk" },
          ],
        },
        order: 5,
      },
      {
        id: "founder_pending_approvals",
        title: "Pending Approvals",
        type: "alert_list",
        data: {
          count: 8,
          items: [
            { title: "Budget Proposal - Marketing Q3", urgency: "high" },
            { title: "New Branch Approval - Surabaya", urgency: "high" },
            { title: "Hiring Request - Senior Developer", urgency: "medium" },
            { title: "Vendor Contract - Logistics Partner", urgency: "medium" },
            { title: "CAPEX - Warehouse Equipment", urgency: "low" },
          ],
        },
        order: 6,
      },
      {
        id: "founder_council_summary",
        title: "Council Summary",
        type: "kpi_grid",
        data: {
          sessionsThisMonth: 4,
          nextSession: "2026-07-28",
          attendees: ["CEO", "CFO", "COO", "CMO", "CHRO"],
          decisionsPending: 3,
          lastSessionHighlights: [
            "Approved expansion budget",
            "Reviewed Q3 forecast",
            "Set new OKR targets",
          ],
        },
        order: 7,
      },
      {
        id: "founder_forecast",
        title: "Forecast 30/90/365",
        type: "forecast_card",
        data: {
          forecasts,
          revenue30d: forecasts.find(f => f.metric === "Revenue" && f.dimension === "sales")?.forecast30d,
          revenue90d: forecasts.find(f => f.metric === "Revenue" && f.dimension === "sales")?.forecast90d,
          revenue365d: forecasts.find(f => f.metric === "Revenue" && f.dimension === "sales")?.forecast365d,
        },
        order: 8,
      },
      {
        id: "founder_executive_decisions",
        title: "Executive Decisions Today",
        type: "narrative_block",
        data: {
          decisions: [
            { title: "Approve budget realignment", by: "CFO", status: "pending" },
            { title: "Sign partnership agreement", by: "CEO", status: "pending" },
            { title: "Approve new pricing strategy", by: "CMO", status: "completed" },
            { title: "Authorize hiring push", by: "CHRO", status: "pending" },
            { title: "Select warehouse location", by: "COO", status: "completed" },
          ],
          totalToday: 5,
          pending: 3,
          completed: 2,
        },
        order: 9,
      },
      {
        id: "founder_attention_items",
        title: "3 Things That Need Attention Today",
        type: "narrative_block",
        data: (() => {
          const topRisks = health.topRisks.slice(0, 3);
          const criticalNarratives = narratives.filter(n => n.type === "warning" || n.type === "negative").slice(0, 3);
          const criticalAlerts = alerts.filter(a => a.severity === "critical" || a.severity === "high").slice(0, 3);

          return {
            items: [
              ...topRisks.map(r => ({ type: "risk", message: `[${r.severity}] ${r.dimension}: ${r.risk}` })),
              ...criticalNarratives.map(n => ({ type: "insight", message: `[${n.type}] ${n.headline}` })),
              ...criticalAlerts.map(a => ({ type: "alert", message: `[${a.severity}] ${a.kpiName}: ${a.message}` })),
            ].slice(0, 3),
          };
        })(),
        order: 10,
      },
    ];
  }
}

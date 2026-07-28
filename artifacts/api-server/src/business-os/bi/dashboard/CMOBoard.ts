import type { KPIValue, KPIAlert, ForecastResult, DashboardSection } from "../types";

export class CMOBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[]): DashboardSection[] {
    return [
      {
        id: "cmo_sales_funnel",
        title: "Sales Funnel",
        type: "kpi_grid",
        data: {
          leads: kpiValues.find(k => k.kpiId === "kpi_lead_count"),
          conversion: kpiValues.find(k => k.kpiId === "kpi_order_conversion"),
          orders: kpiValues.find(k => k.kpiId === "kpi_orders"),
          aov: kpiValues.find(k => k.kpiId === "kpi_aov"),
          stages: [
            { name: "Impressions", count: 125000 },
            { name: "Leads", count: 3200 },
            { name: "Qualified", count: 1100 },
            { name: "Proposal", count: 480 },
            { name: "Negotiation", count: 210 },
            { name: "Closed Won", count: 145 },
          ],
        },
        order: 0,
      },
      {
        id: "cmo_revenue_dashboard",
        title: "Revenue Dashboard",
        type: "kpi_grid",
        data: {
          grossSales: kpiValues.find(k => k.kpiId === "kpi_gross_sales"),
          netSales: kpiValues.find(k => k.kpiId === "kpi_net_sales"),
          revenue: kpiValues.find(k => k.kpiId === "kpi_revenue"),
          salesTarget: kpiValues.find(k => k.kpiId === "kpi_sales_target"),
          orders: kpiValues.find(k => k.kpiId === "kpi_orders"),
          aov: kpiValues.find(k => k.kpiId === "kpi_aov"),
        },
        order: 1,
      },
      {
        id: "cmo_campaign_performance",
        title: "Campaign Performance",
        type: "kpi_grid",
        data: {
          roas: kpiValues.find(k => k.kpiId === "kpi_roas"),
          engagement: kpiValues.find(k => k.kpiId === "kpi_engagement"),
          marketingRoi: kpiValues.find(k => k.kpiId === "kpi_marketing_roi"),
          campaigns: [
            { name: "Summer Sale", spend: 25000000, revenue: 85000000, roas: 3.4 },
            { name: "New Product Launch", spend: 40000000, revenue: 120000000, roas: 3.0 },
            { name: "Retention Email", spend: 8000000, revenue: 32000000, roas: 4.0 },
          ],
        },
        order: 2,
      },
      {
        id: "cmo_cac_roas",
        title: "CAC & ROAS",
        type: "kpi_grid",
        data: {
          cac: kpiValues.find(k => k.kpiId === "kpi_cac"),
          roas: kpiValues.find(k => k.kpiId === "kpi_roas"),
          ltv: kpiValues.find(k => k.kpiId === "kpi_ltv"),
          ltvCacRatio: 3.8,
        },
        order: 3,
      },
      {
        id: "cmo_conversion_rates",
        title: "Conversion Rates",
        type: "kpi_grid",
        data: {
          orderConversion: kpiValues.find(k => k.kpiId === "kpi_order_conversion"),
          conversionRate: kpiValues.find(k => k.kpiId === "kpi_conversion_rate"),
          engagement: kpiValues.find(k => k.kpiId === "kpi_engagement"),
        },
        order: 4,
      },
      {
        id: "cmo_lead_pipeline",
        title: "Lead Pipeline",
        type: "kpi_grid",
        data: {
          leadCount: kpiValues.find(k => k.kpiId === "kpi_lead_count"),
          conversion: kpiValues.find(k => k.kpiId === "kpi_order_conversion"),
          sourceBreakdown: [
            { source: "Social Media", count: 1200 },
            { source: "Email Campaign", count: 850 },
            { source: "Referral", count: 620 },
            { source: "Organic", count: 530 },
          ],
        },
        order: 5,
      },
      {
        id: "cmo_customer_metrics",
        title: "Customer Metrics",
        type: "kpi_grid",
        data: {
          retention: kpiValues.find(k => k.kpiId === "kpi_retention"),
          ltv: kpiValues.find(k => k.kpiId === "kpi_ltv"),
          churn: kpiValues.find(k => k.kpiId === "kpi_churn_rate"),
          nps: kpiValues.find(k => k.kpiId === "kpi_nps"),
          repeatRate: kpiValues.find(k => k.kpiId === "kpi_repeat_rate"),
        },
        order: 6,
      },
    ];
  }
}

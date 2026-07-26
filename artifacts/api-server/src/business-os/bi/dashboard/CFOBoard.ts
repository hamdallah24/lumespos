import type { KPIValue, KPIAlert, ForecastResult, DashboardSection } from "../types";

export class CFOBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[]): DashboardSection[] {
    return [
      {
        id: "cfo_cash_position",
        title: "Cash Position",
        type: "kpi_grid",
        data: {
          cashFlow: kpiValues.find(k => k.kpiId === "kpi_cash_flow"),
          burnRate: kpiValues.find(k => k.kpiId === "kpi_burn_rate"),
          workingCapital: kpiValues.find(k => k.kpiId === "kpi_working_capital"),
        },
        order: 0,
      },
      {
        id: "cfo_pnl_overview",
        title: "P&L Overview",
        type: "kpi_grid",
        data: {
          revenue: kpiValues.find(k => k.kpiId === "kpi_revenue"),
          ebitda: kpiValues.find(k => k.kpiId === "kpi_ebitda"),
          operatingExpense: kpiValues.find(k => k.kpiId === "kpi_operating_expense"),
          netMargin: kpiValues.find(k => k.kpiId === "kpi_net_margin"),
        },
        order: 1,
      },
      {
        id: "cfo_margins",
        title: "Gross & Net Margin",
        type: "kpi_grid",
        data: {
          grossMargin: kpiValues.find(k => k.kpiId === "kpi_gross_margin"),
          netMargin: kpiValues.find(k => k.kpiId === "kpi_net_margin"),
          ebitda: kpiValues.find(k => k.kpiId === "kpi_ebitda"),
        },
        order: 2,
      },
      {
        id: "cfo_expense_breakdown",
        title: "Expense Breakdown",
        type: "kpi_grid",
        data: {
          operatingExpense: kpiValues.find(k => k.kpiId === "kpi_operating_expense"),
          burnRate: kpiValues.find(k => k.kpiId === "kpi_burn_rate"),
          categories: [
            { name: "Payroll", pct: 45 },
            { name: "Marketing", pct: 20 },
            { name: "Operations", pct: 18 },
            { name: "Technology", pct: 12 },
            { name: "Other", pct: 5 },
          ],
        },
        order: 3,
      },
      {
        id: "cfo_budget_vs_actual",
        title: "Budget vs Actual",
        type: "kpi_grid",
        data: {
          budget: 500000000,
          actual: 475000000,
          variance: 25000000,
          variancePct: 5,
          categories: [
            { name: "Payroll", budget: 225000000, actual: 220000000 },
            { name: "Marketing", budget: 100000000, actual: 95000000 },
            { name: "Operations", budget: 90000000, actual: 88000000 },
          ],
        },
        order: 4,
      },
      {
        id: "cfo_receivables_aging",
        title: "Receivables Aging",
        type: "kpi_grid",
        data: {
          dso: kpiValues.find(k => k.kpiId === "kpi_dso"),
          buckets: [
            { name: "0-30 days", value: 120000000 },
            { name: "31-60 days", value: 45000000 },
            { name: "61-90 days", value: 18000000 },
            { name: "90+ days", value: 7000000 },
          ],
          totalReceivables: 190000000,
        },
        order: 5,
      },
      {
        id: "cfo_cash_forecast",
        title: "Cash Forecast",
        type: "forecast_card",
        data: {
          cashFlow: kpiValues.find(k => k.kpiId === "kpi_cash_flow"),
          forecast: forecast.filter(f => f.dimension === "finance"),
        },
        order: 6,
      },
      {
        id: "cfo_working_capital",
        title: "Working Capital",
        type: "kpi_grid",
        data: {
          workingCapital: kpiValues.find(k => k.kpiId === "kpi_working_capital"),
          currentAssets: 850000000,
          currentLiabilities: 420000000,
          ratio: 2.02,
        },
        order: 7,
      },
    ];
  }
}

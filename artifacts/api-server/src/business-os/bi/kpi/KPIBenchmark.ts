import { getAllDefinitions } from "./KPIDefinition";

export class KPIBenchmark {
  benchmarks: Map<string, { industryAvg: number; topQuartile: number; bottomQuartile: number }>;

  constructor() {
    this.benchmarks = new Map();
    this.initializeDefaults();
  }

  initializeDefaults(): void {
    const defaults: Record<string, { industryAvg: number; topQuartile: number; bottomQuartile: number }> = {
      kpi_revenue: { industryAvg: 100000000, topQuartile: 500000000, bottomQuartile: 20000000 },
      kpi_gross_sales: { industryAvg: 120000000, topQuartile: 600000000, bottomQuartile: 25000000 },
      kpi_net_sales: { industryAvg: 90000000, topQuartile: 450000000, bottomQuartile: 18000000 },
      kpi_aov: { industryAvg: 150000, topQuartile: 350000, bottomQuartile: 50000 },
      kpi_orders: { industryAvg: 800, topQuartile: 3000, bottomQuartile: 200 },
      kpi_order_conversion: { industryAvg: 20, topQuartile: 40, bottomQuartile: 8 },
      kpi_sales_target: { industryAvg: 85, topQuartile: 110, bottomQuartile: 60 },
      kpi_inventory_turnover: { industryAvg: 6, topQuartile: 12, bottomQuartile: 2 },
      kpi_inventory_value: { industryAvg: 300000000, topQuartile: 100000000, bottomQuartile: 600000000 },
      kpi_stock_accuracy: { industryAvg: 95, topQuartile: 99, bottomQuartile: 85 },
      kpi_waste_pct: { industryAvg: 5, topQuartile: 2, bottomQuartile: 12 },
      kpi_stockout_rate: { industryAvg: 4, topQuartile: 1, bottomQuartile: 10 },
      kpi_dead_stock: { industryAvg: 30000000, topQuartile: 5000000, bottomQuartile: 100000000 },
      kpi_gross_margin: { industryAvg: 35, topQuartile: 55, bottomQuartile: 18 },
      kpi_net_margin: { industryAvg: 12, topQuartile: 25, bottomQuartile: 5 },
      kpi_cash_flow: { industryAvg: 25000000, topQuartile: 100000000, bottomQuartile: -5000000 },
      kpi_burn_rate: { industryAvg: 40000000, topQuartile: 15000000, bottomQuartile: 80000000 },
      kpi_ebitda: { industryAvg: 30000000, topQuartile: 150000000, bottomQuartile: 8000000 },
      kpi_operating_expense: { industryAvg: 40000000, topQuartile: 15000000, bottomQuartile: 80000000 },
      kpi_working_capital: { industryAvg: 150000000, topQuartile: 500000000, bottomQuartile: 40000000 },
      kpi_dso: { industryAvg: 35, topQuartile: 20, bottomQuartile: 55 },
      kpi_attendance: { industryAvg: 93, topQuartile: 98, bottomQuartile: 85 },
      kpi_turnover: { industryAvg: 12, topQuartile: 5, bottomQuartile: 25 },
      kpi_productivity: { industryAvg: 8000000, topQuartile: 20000000, bottomQuartile: 3000000 },
      kpi_overtime_pct: { industryAvg: 8, topQuartile: 3, bottomQuartile: 18 },
      kpi_headcount: { industryAvg: 100, topQuartile: 300, bottomQuartile: 30 },
      kpi_cac: { industryAvg: 150000, topQuartile: 50000, bottomQuartile: 400000 },
      kpi_roas: { industryAvg: 4, topQuartile: 10, bottomQuartile: 1.5 },
      kpi_conversion_rate: { industryAvg: 3.5, topQuartile: 8, bottomQuartile: 1 },
      kpi_engagement: { industryAvg: 4, topQuartile: 10, bottomQuartile: 1 },
      kpi_marketing_roi: { industryAvg: 300, topQuartile: 800, bottomQuartile: 100 },
      kpi_lead_count: { industryAvg: 500, topQuartile: 2000, bottomQuartile: 100 },
      kpi_yield: { industryAvg: 92, topQuartile: 98, bottomQuartile: 82 },
      kpi_production_waste: { industryAvg: 15000000, topQuartile: 3000000, bottomQuartile: 40000000 },
      kpi_oee: { industryAvg: 75, topQuartile: 90, bottomQuartile: 55 },
      kpi_cycle_time: { industryAvg: 18, topQuartile: 8, bottomQuartile: 36 },
      kpi_capacity_utilization: { industryAvg: 72, topQuartile: 90, bottomQuartile: 50 },
      kpi_picking_accuracy: { industryAvg: 96, topQuartile: 99, bottomQuartile: 88 },
      kpi_packing_speed: { industryAvg: 12, topQuartile: 5, bottomQuartile: 25 },
      kpi_warehouse_capacity: { industryAvg: 75, topQuartile: 50, bottomQuartile: 92 },
      kpi_shipping_accuracy: { industryAvg: 96, topQuartile: 99, bottomQuartile: 88 },
      kpi_retention: { industryAvg: 65, topQuartile: 85, bottomQuartile: 40 },
      kpi_repeat_rate: { industryAvg: 35, topQuartile: 60, bottomQuartile: 15 },
      kpi_ltv: { industryAvg: 5000000, topQuartile: 15000000, bottomQuartile: 1500000 },
      kpi_churn_rate: { industryAvg: 8, topQuartile: 3, bottomQuartile: 18 },
      kpi_nps: { industryAvg: 35, topQuartile: 70, bottomQuartile: 0 },
      kpi_uptime: { industryAvg: 99.5, topQuartile: 99.9, bottomQuartile: 98 },
      kpi_error_rate: { industryAvg: 0.5, topQuartile: 0.1, bottomQuartile: 2 },
      kpi_api_latency: { industryAvg: 300, topQuartile: 100, bottomQuartile: 800 },
      kpi_active_users: { industryAvg: 1000, topQuartile: 5000, bottomQuartile: 200 },
      kpi_branch_count: { industryAvg: 10, topQuartile: 50, bottomQuartile: 3 },
      kpi_branch_profitability: { industryAvg: 80000000, topQuartile: 250000000, bottomQuartile: 20000000 },
      kpi_supplier_on_time: { industryAvg: 88, topQuartile: 97, bottomQuartile: 75 },
      kpi_po_cycle_time: { industryAvg: 6, topQuartile: 3, bottomQuartile: 12 },
    };

    for (const def of getAllDefinitions()) {
      if (defaults[def.id]) {
        this.benchmarks.set(def.id, defaults[def.id]);
      }
    }
  }

  setBenchmark(kpiId: string, industryAvg: number, topQuartile: number, bottomQuartile: number): void {
    this.benchmarks.set(kpiId, { industryAvg, topQuartile, bottomQuartile });
  }

  compare(kpiId: string, value: number): {
    value: number;
    industryAvg: number;
    topQuartile: number;
    bottomQuartile: number;
    percentile: number;
    aboveAverage: boolean;
  } | null {
    const b = this.benchmarks.get(kpiId);
    if (!b) return null;

    let percentile = 50;
    const range = b.topQuartile - b.bottomQuartile;
    if (range !== 0) {
      percentile = Math.round(((value - b.bottomQuartile) / range) * 100);
      percentile = Math.max(0, Math.min(100, percentile));
    }

    return {
      value,
      industryAvg: b.industryAvg,
      topQuartile: b.topQuartile,
      bottomQuartile: b.bottomQuartile,
      percentile,
      aboveAverage: value >= b.industryAvg,
    };
  }
}

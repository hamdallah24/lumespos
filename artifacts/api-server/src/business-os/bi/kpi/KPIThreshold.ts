import type { KPIAlert, Severity } from "../types";
import { getAllDefinitions } from "./KPIDefinition";

export class KPIThreshold {
  thresholds: Map<string, { warning: number; critical: number }>;

  constructor() {
    this.thresholds = new Map();
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    const defaults: Record<string, { warning: number; critical: number }> = {
      kpi_revenue: { warning: 50000000, critical: 10000000 },
      kpi_gross_sales: { warning: 60000000, critical: 15000000 },
      kpi_net_sales: { warning: 45000000, critical: 10000000 },
      kpi_aov: { warning: 150000, critical: 50000 },
      kpi_orders: { warning: 500, critical: 100 },
      kpi_order_conversion: { warning: 15, critical: 5 },
      kpi_sales_target: { warning: 80, critical: 50 },
      kpi_inventory_turnover: { warning: 3, critical: 1 },
      kpi_inventory_value: { warning: 500000000, critical: 1000000000 },
      kpi_stock_accuracy: { warning: 90, critical: 80 },
      kpi_waste_pct: { warning: 5, critical: 15 },
      kpi_stockout_rate: { warning: 3, critical: 10 },
      kpi_dead_stock: { warning: 50000000, critical: 200000000 },
      kpi_gross_margin: { warning: 30, critical: 15 },
      kpi_net_margin: { warning: 10, critical: 3 },
      kpi_cash_flow: { warning: 10000000, critical: -5000000 },
      kpi_burn_rate: { warning: 50000000, critical: 100000000 },
      kpi_ebitda: { warning: 20000000, critical: 5000000 },
      kpi_operating_expense: { warning: 50000000, critical: 100000000 },
      kpi_working_capital: { warning: 100000000, critical: 30000000 },
      kpi_dso: { warning: 45, critical: 60 },
      kpi_attendance: { warning: 90, critical: 80 },
      kpi_turnover: { warning: 10, critical: 25 },
      kpi_productivity: { warning: 5000000, critical: 2000000 },
      kpi_overtime_pct: { warning: 10, critical: 25 },
      kpi_headcount: { warning: 50, critical: 20 },
      kpi_cac: { warning: 200000, critical: 500000 },
      kpi_roas: { warning: 3, critical: 1 },
      kpi_conversion_rate: { warning: 3, critical: 1 },
      kpi_engagement: { warning: 5, critical: 2 },
      kpi_marketing_roi: { warning: 200, critical: 50 },
      kpi_lead_count: { warning: 200, critical: 50 },
      kpi_yield: { warning: 90, critical: 80 },
      kpi_production_waste: { warning: 10000000, critical: 50000000 },
      kpi_oee: { warning: 75, critical: 50 },
      kpi_cycle_time: { warning: 24, critical: 48 },
      kpi_capacity_utilization: { warning: 70, critical: 40 },
      kpi_picking_accuracy: { warning: 95, critical: 85 },
      kpi_packing_speed: { warning: 15, critical: 30 },
      kpi_warehouse_capacity: { warning: 80, critical: 95 },
      kpi_shipping_accuracy: { warning: 95, critical: 85 },
      kpi_retention: { warning: 60, critical: 40 },
      kpi_repeat_rate: { warning: 30, critical: 15 },
      kpi_ltv: { warning: 3000000, critical: 1000000 },
      kpi_churn_rate: { warning: 10, critical: 25 },
      kpi_nps: { warning: 30, critical: 0 },
      kpi_uptime: { warning: 99, critical: 95 },
      kpi_error_rate: { warning: 1, critical: 5 },
      kpi_api_latency: { warning: 500, critical: 2000 },
      kpi_active_users: { warning: 500, critical: 100 },
      kpi_branch_count: { warning: 5, critical: 2 },
      kpi_branch_profitability: { warning: 50000000, critical: 10000000 },
      kpi_supplier_on_time: { warning: 85, critical: 70 },
      kpi_po_cycle_time: { warning: 7, critical: 14 },
    };

    for (const def of getAllDefinitions()) {
      if (defaults[def.id]) {
        this.thresholds.set(def.id, defaults[def.id]);
      }
    }
  }

  getThreshold(kpiId: string): { warning: number; critical: number } {
    const t = this.thresholds.get(kpiId);
    if (!t) return { warning: 0, critical: 0 };
    return { ...t };
  }

  setThreshold(kpiId: string, warning: number, critical: number): void {
    this.thresholds.set(kpiId, { warning, critical });
  }

  evaluate(value: number, kpiId: string, higherIsBetter: boolean): KPIAlert | null {
    const threshold = this.thresholds.get(kpiId);
    if (!threshold) return null;

    const { getAllDefinitions } = require("./KPIDefinition");
    const def = getAllDefinitions().find((d: any) => d.id === kpiId);

    const isBreached = (value: number, thresholdVal: number): boolean => {
      return higherIsBetter ? value < thresholdVal : value > thresholdVal;
    };

    if (isBreached(value, threshold.critical)) {
      return {
        kpiId,
        kpiName: def?.name ?? kpiId,
        dimension: def?.dimension ?? "sales",
        value,
        threshold: threshold.critical,
        severity: "critical" as Severity,
        message: `${def?.name ?? kpiId} di ambang kritis: ${value} (threshold: ${threshold.critical})`,
        timestamp: new Date().toISOString(),
      };
    }

    if (isBreached(value, threshold.warning)) {
      return {
        kpiId,
        kpiName: def?.name ?? kpiId,
        dimension: def?.dimension ?? "sales",
        value,
        threshold: threshold.warning,
        severity: "high" as Severity,
        message: `${def?.name ?? kpiId} melewati batas warning: ${value} (threshold: ${threshold.warning})`,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }
}

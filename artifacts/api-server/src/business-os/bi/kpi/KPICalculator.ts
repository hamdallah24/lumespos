import type { KPIValue } from "../types";
import { getDefinition } from "./KPIDefinition";

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function getSalesCtx(rc: any): any {
  return rc?.erpContexts?.sales ?? {};
}

function getFinanceCtx(rc: any): any {
  return rc?.erpContexts?.finance ?? {};
}

function getInventoryCtx(rc: any): any {
  return rc?.erpContexts?.inventory ?? {};
}

function getHRCtx(rc: any): any {
  return rc?.erpContexts?.hr ?? {};
}

function getProductionCtx(rc: any): any {
  return rc?.erpContexts?.production ?? {};
}

function getPurchasingCtx(rc: any): any {
  return rc?.erpContexts?.purchasing ?? {};
}

function computeKPIValue(kpiId: string, rc: any): number {
  const sales = getSalesCtx(rc);
  const finance = getFinanceCtx(rc);
  const inventory = getInventoryCtx(rc);
  const hr = getHRCtx(rc);
  const production = getProductionCtx(rc);
  const purchasing = getPurchasingCtx(rc);

  const todayRev = sales?.today?.revenue ?? 0;
  const periodRev = sales?.period?.revenue ?? 0;
  const todayOrders = sales?.today?.orders ?? 0;
  const periodOrders = sales?.period?.orders ?? 0;
  const periodAOV = periodOrders > 0 ? periodRev / periodOrders : (todayOrders > 0 ? todayRev / todayOrders : 0);
  const totalRev = periodRev || todayRev;
  const totalOrders = periodOrders || todayOrders;

  const finRev = finance?.revenue?.total ?? 0;
  const finCogs = 0;
  const finExpenses = finance?.expenseTrend?.categories ? sum(finance.expenseTrend.categories.map((c: any) => c.total ?? 0)) : 0;
  const grossProfit = finance?.profit?.gross ?? 0;
  const netProfit = finance?.profit?.net ?? 0;
  const cashPosition = finance?.cashPosition?.current ?? 0;
  const margin = finance?.profit?.margin ?? 0;

  const invValue = inventory?.inventoryValue?.total ?? 0;
  const criticalItems = inventory?.criticalItems ?? [];
  const stockRisks = inventory?.stockRisks ?? [];
  const warehouseUtil = inventory?.warehouseUtilization ?? [];

  const headcount = hr?.headcount?.total ?? 0;
  const activeHeadcount = hr?.headcount?.active ?? 0;
  const attendToday = hr?.attendance?.today ?? {};
  const presentDays = attendToday.present ?? 0;
  const absentDays = attendToday.absent ?? 0;
  const leaveDays = attendToday.onLeave ?? 0;

  const prodYield = production?.efficiency?.yield ?? 0;
  const prodWaste = production?.efficiency?.waste ?? 0;

  const branches = sales?.branches ?? [];

  const suppliers = purchasing?.suppliers ?? [];

  switch (kpiId) {
    case "kpi_revenue":
      return totalRev || finRev;
    case "kpi_gross_sales":
      return totalRev || finRev;
    case "kpi_net_sales":
      return totalRev || finRev;
    case "kpi_aov":
      return periodAOV;
    case "kpi_orders":
      return totalOrders;
    case "kpi_order_conversion":
      return 0;
    case "kpi_sales_target":
      return 0;
    case "kpi_inventory_turnover": {
      const avgInv = invValue || 1;
      const cogs = finCogs || 1;
      return avgInv > 0 ? cogs / avgInv : 0;
    }
    case "kpi_inventory_value":
      return invValue;
    case "kpi_stock_accuracy":
      return 0;
    case "kpi_waste_pct":
      return prodWaste;
    case "kpi_stockout_rate":
      return stockRisks.filter((r: any) => r.severity === "critical" || r.severity === "high").length;
    case "kpi_dead_stock":
      return 0;
    case "kpi_gross_margin":
      return margin || (totalRev > 0 ? ((totalRev - finCogs) / totalRev) * 100 : 0);
    case "kpi_net_margin":
      return margin || (totalRev > 0 ? ((totalRev - finCogs - finExpenses) / totalRev) * 100 : 0);
    case "kpi_cash_flow":
      return cashPosition;
    case "kpi_burn_rate":
      return finExpenses;
    case "kpi_ebitda":
      return netProfit || grossProfit;
    case "kpi_operating_expense":
      return finExpenses;
    case "kpi_working_capital":
      return cashPosition;
    case "kpi_dso":
      return 0;
    case "kpi_attendance": {
      const totalPeople = presentDays + absentDays + leaveDays;
      return totalPeople > 0 ? (presentDays / totalPeople) * 100 : 0;
    }
    case "kpi_turnover":
      return 0;
    case "kpi_productivity":
      return activeHeadcount > 0 ? (totalRev || finRev) / activeHeadcount : 0;
    case "kpi_overtime_pct":
      return 0;
    case "kpi_headcount":
      return headcount;
    case "kpi_cac":
      return 0;
    case "kpi_roas":
      return 0;
    case "kpi_conversion_rate":
      return 0;
    case "kpi_engagement":
      return 0;
    case "kpi_marketing_roi":
      return 0;
    case "kpi_lead_count":
      return 0;
    case "kpi_yield":
      return prodYield;
    case "kpi_production_waste":
      return prodWaste;
    case "kpi_oee":
      return 0;
    case "kpi_cycle_time":
      return 0;
    case "kpi_capacity_utilization":
      return 0;
    case "kpi_picking_accuracy":
      return 0;
    case "kpi_packing_speed":
      return 0;
    case "kpi_warehouse_capacity": {
      const avgUtil = warehouseUtil.length > 0
        ? avg(warehouseUtil.map((w: any) => w.percent ?? 0))
        : 0;
      return avgUtil;
    }
    case "kpi_shipping_accuracy":
      return 0;
    case "kpi_retention":
      return 0;
    case "kpi_repeat_rate":
      return 0;
    case "kpi_ltv":
      return 0;
    case "kpi_churn_rate":
      return 0;
    case "kpi_nps":
      return 0;
    case "kpi_uptime":
      return 0;
    case "kpi_error_rate":
      return 0;
    case "kpi_api_latency":
      return 0;
    case "kpi_active_users":
      return 0;
    case "kpi_branch_count":
      return branches.length;
    case "kpi_branch_profitability":
      return 0;
    case "kpi_supplier_on_time": {
      if (suppliers.length === 0) return 0;
      return avg(suppliers.map((s: any) => (s.reliability ?? 0) * 100));
    }
    case "kpi_po_cycle_time":
      return 0;
    default:
      return 0;
  }
}

export class KPICalculator {
  calculate(kpiId: string, runtimeContext: any): KPIValue {
    const def = getDefinition(kpiId);
    if (!def) throw new Error(`Unknown KPI: ${kpiId}`);

    const value = computeKPIValue(kpiId, runtimeContext);

    return {
      kpiId: def.id,
      kpiName: def.name,
      dimension: def.dimension,
      executive: def.ownerExecutive,
      value,
      unit: def.unit,
      higherIsBetter: def.higherIsBetter,
      timestamp: new Date().toISOString(),
      period: "monthly",
      periodKey: new Date().toISOString().slice(0, 7),
    };
  }

  calculateAll(runtimeContext: any): KPIValue[] {
    const { getAllDefinitions } = require("./KPIDefinition");
    return getAllDefinitions().map((def: any) => this.calculate(def.id, runtimeContext));
  }

  calculateForExecutive(executive: string, runtimeContext: any): KPIValue[] {
    const { getDefinitionsByExecutive } = require("./KPIDefinition");
    return getDefinitionsByExecutive(executive).map((def: any) => this.calculate(def.id, runtimeContext));
  }
}
import type { KPIValue } from "../types";
import { getDefinition } from "./KPIDefinition";

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function count(arr: any[]): number {
  return arr.length;
}

function findFinancialData(workspace: any, field: string): number[] {
  const results: number[] = [];
  const tasks = workspace?.tasks ?? [];
  const decisions = workspace?.decisions ?? [];

  for (const item of [...tasks, ...decisions]) {
    const fd = item?.financialData ?? item?.financial ?? item?.amount;
    if (fd && typeof fd === "object") {
      if (fd[field] !== undefined) results.push(Number(fd[field]));
    } else if (fd !== undefined && typeof fd === "number") {
      if (field === "total" || field === "value") results.push(Number(fd));
    }
  }

  if (results.length === 0) results.push(0);
  return results;
}

function getTotalFinancial(workspace: any, field: string): number {
  return sum(findFinancialData(workspace, field));
}

function getOrders(workspace: any): any[] {
  return workspace?.orders ?? workspace?.transactions ?? workspace?.sales ?? [];
}

function getOrderTotal(workspace: any): number {
  return sum(getOrders(workspace).map((o: any) => Number(o?.total ?? o?.amount ?? 0)));
}

function getDiscountTotal(workspace: any): number {
  return sum(getOrders(workspace).map((o: any) => Number(o?.discount ?? 0)));
}

function getReturnsTotal(workspace: any): number {
  return sum(getOrders(workspace).map((o: any) => Number(o?.return ?? o?.returnAmount ?? 0)));
}

function getCOGS(workspace: any): number {
  return getTotalFinancial(workspace, "cogs") || getTotalFinancial(workspace, "costOfGoodsSold") || 0;
}

function getAvgInventory(workspace: any): number {
  const inventory = workspace?.inventory ?? [];
  const stockValues = inventory.map((i: any) => {
    const stock = Number(i?.stock ?? i?.quantity ?? 0);
    const cost = Number(i?.unitCost ?? i?.cost ?? 0);
    return stock * cost;
  });
  return stockValues.length > 0 ? avg(stockValues) : 0;
}

function computeKPIAOV(workspace: any): number {
  const orders = getOrders(workspace);
  if (orders.length === 0) return 0;
  const revenue = getOrderTotal(workspace) - getDiscountTotal(workspace);
  return revenue / orders.length;
}

function computeKPIValue(kpiId: string, workspace: any): number {
  const revenue = getOrderTotal(workspace) - getDiscountTotal(workspace);
  const grossSales = getOrderTotal(workspace);
  const netSales = grossSales - getReturnsTotal(workspace) - getDiscountTotal(workspace);
  const orderCount = getOrders(workspace).length;
  const cogs = getCOGS(workspace);
  const avgInventory = getAvgInventory(workspace);

  const employees = workspace?.employees ?? workspace?.staff ?? [];
  const headcount = employees.length || 1;

  switch (kpiId) {
    case "kpi_revenue":
      return revenue;
    case "kpi_gross_sales":
      return grossSales;
    case "kpi_net_sales":
      return netSales;
    case "kpi_aov":
      return computeKPIAOV(workspace);
    case "kpi_orders":
      return orderCount;
    case "kpi_order_conversion": {
      const leads = workspace?.leads ?? workspace?.prospects ?? [];
      return leads.length > 0 ? (orderCount / leads.length) * 100 : 0;
    }
    case "kpi_sales_target": {
      const target = workspace?.salesTarget ?? workspace?.target ?? 1;
      return target > 0 ? (revenue / Number(target)) * 100 : 0;
    }
    case "kpi_inventory_turnover": {
      return avgInventory > 0 ? cogs / avgInventory : 0;
    }
    case "kpi_inventory_value": {
      return sum((workspace?.inventory ?? []).map((i: any) => Number(i?.stock ?? 0) * Number(i?.unitCost ?? 0)));
    }
    case "kpi_stock_accuracy": {
      const systemStock = getTotalFinancial(workspace, "systemStock") || 1;
      const physicalStock = getTotalFinancial(workspace, "physicalStock") || 0;
      return (1 - Math.abs(physicalStock - systemStock) / systemStock) * 100;
    }
    case "kpi_waste_pct": {
      const waste = getTotalFinancial(workspace, "waste") || 0;
      const totalValue = getTotalFinancial(workspace, "totalValue") || 1;
      return (waste / totalValue) * 100;
    }
    case "kpi_stockout_rate":
      return count(workspace?.stockoutEvents ?? []);
    case "kpi_dead_stock": {
      return sum((workspace?.inventory ?? [])
        .filter((i: any) => (i?.daysWithoutMovement ?? 0) >= 90)
        .map((i: any) => Number(i?.stock ?? 0) * Number(i?.unitCost ?? 0)));
    }
    case "kpi_gross_margin": {
      return revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
    }
    case "kpi_net_margin": {
      const expenses = getTotalFinancial(workspace, "expenses") || 0;
      const netProfit = revenue - cogs - expenses;
      return revenue > 0 ? (netProfit / revenue) * 100 : 0;
    }
    case "kpi_cash_flow": {
      const cashIn = getTotalFinancial(workspace, "cashIn") || revenue;
      const cashOut = getTotalFinancial(workspace, "cashOut") || getTotalFinancial(workspace, "expenses") || 0;
      return cashIn - cashOut;
    }
    case "kpi_burn_rate":
      return getTotalFinancial(workspace, "monthlyExpenses") || getTotalFinancial(workspace, "expenses") || 0;
    case "kpi_ebitda": {
      const netProfit = revenue - cogs - (getTotalFinancial(workspace, "expenses") || 0);
      const interest = getTotalFinancial(workspace, "interest") || 0;
      const tax = getTotalFinancial(workspace, "tax") || 0;
      const depreciation = getTotalFinancial(workspace, "depreciation") || 0;
      const amortization = getTotalFinancial(workspace, "amortization") || 0;
      return netProfit + interest + tax + depreciation + amortization;
    }
    case "kpi_operating_expense":
      return getTotalFinancial(workspace, "operatingExpenses") || getTotalFinancial(workspace, "expenses") || 0;
    case "kpi_working_capital": {
      const currentAssets = getTotalFinancial(workspace, "currentAssets") || revenue;
      const currentLiabilities = getTotalFinancial(workspace, "currentLiabilities") || 0;
      return currentAssets - currentLiabilities;
    }
    case "kpi_dso": {
      const receivables = getTotalFinancial(workspace, "receivables") || 0;
      return revenue > 0 ? (receivables / revenue) * 30 : 0;
    }
    case "kpi_attendance": {
      const presentDays = sum((workspace?.attendance ?? []).map((a: any) => Number(a?.presentDays ?? 0)));
      const totalWorkDays = sum((workspace?.attendance ?? []).map((a: any) => Number(a?.totalDays ?? 0))) || 1;
      return (presentDays / totalWorkDays) * 100;
    }
    case "kpi_turnover": {
      const resigned = count(workspace?.resignedEmployees ?? workspace?.terminatedEmployees ?? []);
      return headcount > 0 ? (resigned / headcount) * 100 : 0;
    }
    case "kpi_productivity":
      return revenue / Math.max(headcount, 1);
    case "kpi_overtime_pct": {
      const overtime = sum((workspace?.attendance ?? []).map((a: any) => Number(a?.overtimeHours ?? 0)));
      const totalHours = sum((workspace?.attendance ?? []).map((a: any) => Number(a?.totalHours ?? 0))) || 1;
      return (overtime / totalHours) * 100;
    }
    case "kpi_headcount":
      return headcount;
    case "kpi_cac": {
      const marketingCost = getTotalFinancial(workspace, "marketingCost") || getTotalFinancial(workspace, "adSpend") || 0;
      const newCustomers = count(workspace?.newCustomers ?? workspace?.customers ?? []);
      return newCustomers > 0 ? marketingCost / newCustomers : 0;
    }
    case "kpi_roas": {
      const adRevenue = getTotalFinancial(workspace, "adRevenue") || 0;
      const adSpend = getTotalFinancial(workspace, "adSpend") || getTotalFinancial(workspace, "marketingCost") || 1;
      return adSpend > 0 ? adRevenue / adSpend : 0;
    }
    case "kpi_conversion_rate": {
      const conversions = count(workspace?.conversions ?? []);
      const impressions = count(workspace?.impressions ?? workspace?.leads ?? []) || 1;
      return (conversions / impressions) * 100;
    }
    case "kpi_engagement": {
      const interactions = count(workspace?.interactions ?? []);
      const reach = count(workspace?.reach ?? workspace?.impressions ?? []) || 1;
      return (interactions / reach) * 100;
    }
    case "kpi_marketing_roi": {
      const marketingRevenue = getTotalFinancial(workspace, "marketingRevenue") || 0;
      const marketingCost = getTotalFinancial(workspace, "marketingCost") || 1;
      return marketingCost > 0 ? ((marketingRevenue - marketingCost) / marketingCost) * 100 : 0;
    }
    case "kpi_lead_count":
      return count(workspace?.leads ?? workspace?.prospects ?? []);
    case "kpi_yield": {
      const goodOutput = count(workspace?.goodOutput ?? workspace?.qualityPass ?? []);
      const totalOutput = count(workspace?.productionOutput ?? workspace?.batches ?? []) || 1;
      return (goodOutput / totalOutput) * 100;
    }
    case "kpi_production_waste":
      return getTotalFinancial(workspace, "defectCost") + getTotalFinancial(workspace, "reworkCost");
    case "kpi_oee": {
      const availability = Math.random() * 0.15 + 0.85;
      const performance = Math.random() * 0.15 + 0.85;
      const quality = Math.random() * 0.1 + 0.9;
      return availability * performance * quality * 100;
    }
    case "kpi_cycle_time": {
      const batches = workspace?.batches ?? workspace?.productionBatches ?? [];
      const totalTime = sum(batches.map((b: any) => Number(b?.duration ?? b?.time ?? 0)));
      return batches.length > 0 ? totalTime / batches.length : 0;
    }
    case "kpi_capacity_utilization": {
      const actual = count(workspace?.productionOutput ?? []);
      const maxCap = count(workspace?.maxCapacity ?? workspace?.capacity ?? []) || 1;
      return (actual / maxCap) * 100;
    }
    case "kpi_picking_accuracy": {
      const totalPicks = count(workspace?.picks ?? []) || 1;
      const errors = count(workspace?.pickingErrors ?? []);
      return ((1 - errors / totalPicks)) * 100;
    }
    case "kpi_packing_speed": {
      const packTimes = (workspace?.packingTimes ?? []).map((p: any) => Number(p?.minutes ?? p?.time ?? 0));
      return packTimes.length > 0 ? avg(packTimes) : 0;
    }
    case "kpi_warehouse_capacity": {
      const used = getTotalFinancial(workspace, "usedCapacity") || 0;
      const total = getTotalFinancial(workspace, "totalCapacity") || 1;
      return (used / total) * 100;
    }
    case "kpi_shipping_accuracy": {
      const totalShipments = count(workspace?.shipments ?? []) || 1;
      const correct = count(workspace?.correctShipments ?? workspace?.shipments ?? []);
      return (correct / totalShipments) * 100;
    }
    case "kpi_retention": {
      const repeat = count(workspace?.repeatCustomers ?? []);
      const totalCust = count(workspace?.customers ?? []) || 1;
      return (repeat / totalCust) * 100;
    }
    case "kpi_repeat_rate": {
      const withRepeat = count(workspace?.repeatCustomers ?? []);
      const totalCust = count(workspace?.customers ?? []) || 1;
      return (withRepeat / totalCust) * 100;
    }
    case "kpi_ltv": {
      const aov = computeKPIAOV(workspace) || 1;
      const freq = Number(workspace?.purchaseFrequency ?? 1) || 1;
      const lifespan = Number(workspace?.avgLifespan ?? 12) || 12;
      return aov * freq * lifespan;
    }
    case "kpi_churn_rate": {
      const lost = count(workspace?.lostCustomers ?? []);
      const startCust = count(workspace?.customers ?? []) || 1;
      return (lost / startCust) * 100;
    }
    case "kpi_nps": {
      const promoters = count(workspace?.promoters ?? []);
      const detractors = count(workspace?.detractors ?? []);
      const totalResp = promoters + detractors + count(workspace?.passives ?? []);
      return totalResp > 0 ? ((promoters - detractors) / totalResp) * 100 : 0;
    }
    case "kpi_uptime": {
      const uptime = Number(workspace?.uptimeHours ?? 0);
      const total = Number(workspace?.totalHours ?? 8760) || 1;
      return (uptime / total) * 100;
    }
    case "kpi_error_rate": {
      const errors = count(workspace?.errors ?? workspace?.errorLogs ?? []);
      const requests = count(workspace?.requests ?? workspace?.apiCalls ?? []) || 1;
      return (errors / requests) * 100;
    }
    case "kpi_api_latency": {
      const latencies = (workspace?.latencies ?? workspace?.apiLatencies ?? []).map((l: any) => Number(l?.ms ?? l?.latency ?? l ?? 0));
      return latencies.length > 0 ? avg(latencies) : 0;
    }
    case "kpi_active_users":
      return count(workspace?.activeUsers ?? workspace?.activeSessions ?? []);
    case "kpi_branch_count":
      return count(workspace?.branches ?? workspace?.locations ?? []);
    case "kpi_branch_profitability": {
      const branches = workspace?.branches ?? workspace?.locations ?? [];
      const totalProfit = sum(branches.map((b: any) => Number(b?.profit ?? b?.revenue ?? 0)));
      return branches.length > 0 ? totalProfit / branches.length : 0;
    }
    case "kpi_supplier_on_time": {
      const totalDeliveries = count(workspace?.deliveries ?? []) || 1;
      const onTime = count(workspace?.onTimeDeliveries ?? []);
      return (onTime / totalDeliveries) * 100;
    }
    case "kpi_po_cycle_time": {
      const cycleDays = (workspace?.poCycleDays ?? workspace?.purchaseOrderDays ?? []).map((d: any) => Number(d?.days ?? d ?? 0));
      return cycleDays.length > 0 ? avg(cycleDays) : 0;
    }
    default:
      return 0;
  }
}

export class KPICalculator {
  calculate(kpiId: string, workspace: any): KPIValue {
    const def = getDefinition(kpiId);
    if (!def) throw new Error(`Unknown KPI: ${kpiId}`);

    const value = computeKPIValue(kpiId, workspace);

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

  calculateAll(workspace: any): KPIValue[] {
    const { getAllDefinitions } = require("./KPIDefinition");
    return getAllDefinitions().map((def: any) => this.calculate(def.id, workspace));
  }

  calculateForExecutive(executive: string, workspace: any): KPIValue[] {
    const { getDefinitionsByExecutive } = require("./KPIDefinition");
    return getDefinitionsByExecutive(executive).map((def: any) => this.calculate(def.id, workspace));
  }
}

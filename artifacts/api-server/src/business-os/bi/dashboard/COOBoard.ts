import type { KPIValue, KPIAlert, ForecastResult, DashboardSection } from "../types";

export class COOBoard {
  build(kpiValues: KPIValue[], alerts: KPIAlert[], forecast: ForecastResult[]): DashboardSection[] {
    return [
      {
        id: "coo_operations_overview",
        title: "Operations Overview",
        type: "kpi_grid",
        data: {
          inventoryTurnover: kpiValues.find(k => k.kpiId === "kpi_inventory_turnover"),
          stockAccuracy: kpiValues.find(k => k.kpiId === "kpi_stock_accuracy"),
          supplierOnTime: kpiValues.find(k => k.kpiId === "kpi_supplier_on_time"),
          poCycleTime: kpiValues.find(k => k.kpiId === "kpi_po_cycle_time"),
        },
        order: 0,
      },
      {
        id: "coo_inventory_status",
        title: "Inventory Status",
        type: "kpi_grid",
        data: {
          turnover: kpiValues.find(k => k.kpiId === "kpi_inventory_turnover"),
          value: kpiValues.find(k => k.kpiId === "kpi_inventory_value"),
          accuracy: kpiValues.find(k => k.kpiId === "kpi_stock_accuracy"),
          waste: kpiValues.find(k => k.kpiId === "kpi_waste_pct"),
          deadStock: kpiValues.find(k => k.kpiId === "kpi_dead_stock"),
        },
        order: 1,
      },
      {
        id: "coo_production_metrics",
        title: "Production Metrics",
        type: "kpi_grid",
        data: {
          yield: kpiValues.find(k => k.kpiId === "kpi_yield"),
          oee: kpiValues.find(k => k.kpiId === "kpi_oee"),
          waste: kpiValues.find(k => k.kpiId === "kpi_production_waste"),
          cycleTime: kpiValues.find(k => k.kpiId === "kpi_cycle_time"),
          capacityUtilization: kpiValues.find(k => k.kpiId === "kpi_capacity_utilization"),
        },
        order: 2,
      },
      {
        id: "coo_warehouse_status",
        title: "Warehouse Status",
        type: "kpi_grid",
        data: {
          pickingAccuracy: kpiValues.find(k => k.kpiId === "kpi_picking_accuracy"),
          capacity: kpiValues.find(k => k.kpiId === "kpi_warehouse_capacity"),
          packingSpeed: kpiValues.find(k => k.kpiId === "kpi_packing_speed"),
          shippingAccuracy: kpiValues.find(k => k.kpiId === "kpi_shipping_accuracy"),
        },
        order: 3,
      },
      {
        id: "coo_supply_chain_alerts",
        title: "Supply Chain Alerts",
        type: "alert_list",
        data: alerts.filter(a => a.dimension === "purchasing" || a.dimension === "inventory"),
        order: 4,
      },
      {
        id: "coo_stockout_forecast",
        title: "Stockout Forecast",
        type: "forecast_card",
        data: {
          stockoutRate: kpiValues.find(k => k.kpiId === "kpi_stockout_rate"),
          forecast: forecast.filter(f => f.dimension === "inventory"),
          warnings: forecast.filter(f => f.dimension === "inventory").flatMap(f => f.warnings),
        },
        order: 5,
      },
    ];
  }
}

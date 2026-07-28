import type { BusinessScenario } from "../types";

export const warehouseScenarios: BusinessScenario[] = [
  {
    id: "wh-001", name: "Warehouse Capacity Critical", domain: "warehouse",
    description: "Kapasitas gudang hampir penuh",
    trigger: { type: "event", eventType: "warehouse.capacity_critical", data: { warehouseId: "WH-001", name: "Gudang Pusat", utilizationPct: 94, totalCapacity: 5000, usedCapacity: 4700, branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_warehouse", "cap_inventory"],
    expectedActions: ["OptimizeLayout", "IdentifySlowMoving"], expectedEvents: ["warehouse.capacity_reviewed"],
    priority: "high", tags: ["warehouse", "capacity", "logistics"],
  },
  {
    id: "wh-002", name: "Picking Error Rate High", domain: "warehouse",
    description: "Kesalahan picking barang melebihi batas toleransi",
    trigger: { type: "event", eventType: "warehouse.picking_errors", data: { errorRate: 4.2, tolerance: 1.0, affectedOrders: 18, totalOrders: 430, period: "This Week", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_warehouse"],
    expectedActions: ["InvestigateErrors", "StaffRetraining"], expectedEvents: ["warehouse.picking_improved"],
    priority: "normal", tags: ["warehouse", "quality", "operations"],
  },
  {
    id: "wh-003", name: "Goods Received Mismatch", domain: "warehouse",
    description: "Barang datang tidak sesuai dengan pesanan",
    trigger: { type: "event", eventType: "warehouse.goods_mismatch", data: { poId: "PO-2026-07-1002", expectedItems: [{ productId: 301, qty: 200 }], receivedItems: [{ productId: 301, qty: 150 }, { productId: 302, qty: 50 }], branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_warehouse", "cap_purchasing"],
    expectedActions: ["RecordDiscrepancy", "ContactSupplier"], expectedEvents: ["warehouse.discrepancy_recorded"],
    priority: "high", tags: ["warehouse", "receiving", "supplier"],
  },
  {
    id: "wh-004", name: "Temperature Alert", domain: "warehouse",
    description: "Suhu gudang pendingin menyimpang dari standar",
    trigger: { type: "event", eventType: "warehouse.temperature_alert", data: { zoneId: "COLD-01", currentTemp: 12.5, minTemp: 2, maxTemp: 8, productType: "Dairy", risk: "high", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_warehouse"],
    expectedActions: ["FixCoolingSystem", "InspectStock"], expectedEvents: ["warehouse.temperature_resolved"],
    priority: "critical", tags: ["warehouse", "cold-chain", "quality"],
  },
  {
    id: "wh-005", name: "Stocktake Scheduled", domain: "warehouse",
    description: "Stocktake bulanan akan dilaksanakan",
    trigger: { type: "event", eventType: "warehouse.stocktake_due", data: { warehouseId: "WH-001", scheduleDate: "2026-07-30", itemCount: 3500, lastStocktake: "2026-06-30", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_warehouse", "cap_inventory"],
    expectedActions: ["PrepareStocktake", "AssignTeam"], expectedEvents: ["warehouse.stocktake_started"],
    priority: "normal", tags: ["warehouse", "audit", "inventory"],
  },
  {
    id: "wh-006", name: "Cross-Dock Opportunity", domain: "warehouse",
    description: "Peluang cross-docking untuk menghemat biaya penyimpanan",
    trigger: { type: "event", eventType: "warehouse.crossdock_opportunity", data: { incomingShipment: "SHIP-2026-07-501", outgoingOrders: ["ORD-501", "ORD-502", "ORD-503"], estimatedSavings: 3500000, branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_warehouse", "cap_sales"],
    expectedActions: ["ApproveCrossDock", "CoordinateLogistics"], expectedEvents: ["warehouse.crossdock_executed"],
    priority: "normal", tags: ["warehouse", "logistics", "efficiency"],
  },
];

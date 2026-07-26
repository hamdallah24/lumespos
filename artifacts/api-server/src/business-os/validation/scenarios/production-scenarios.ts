import type { BusinessScenario } from "../types";

export const productionScenarios: BusinessScenario[] = [
  {
    id: "prd-001", name: "Machine Breakdown", domain: "production",
    description: "Mesin produksi utama mengalami kerusakan",
    trigger: { type: "event", eventType: "production.machine_breakdown", data: { machineId: "MCH-001", machineName: "Mesin Pengemas", downtimeEstimate: "6 jam", impact: "Produksi terhenti line A", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_production", "cap_inventory"],
    expectedActions: ["EmergencyRepair", "RerouteProduction"], expectedEvents: ["production.machine_repaired", "production.rerouted"],
    priority: "critical", tags: ["production", "maintenance", "downtime"],
  },
  {
    id: "prd-002", name: "Production Defect Spike", domain: "production",
    description: "Tingkat cacat produksi melonjak di atas toleransi",
    trigger: { type: "event", eventType: "production.defect_spike", data: { batchId: "B2026-07-15", defectRate: 12.5, tolerance: 3.0, productId: 301, productName: "Kecap Manis", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_production"],
    expectedActions: ["QualityInvestigation", "BatchRecall"], expectedEvents: ["production.quality_hold", "production.investigation_started"],
    priority: "high", tags: ["production", "quality", "defect"],
  },
  {
    id: "prd-003", name: "Production Capacity Full", domain: "production",
    description: "Kapasitas produksi mencapai batas maksimal",
    trigger: { type: "event", eventType: "production.capacity_full", data: { utilizationPct: 97, maxCapacity: 10000, currentOutput: 9700, unit: "unit/hari", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_production", "cap_expansion"],
    expectedActions: ["ShiftOptimization", "CapacityExpansionPlan"], expectedEvents: ["production.capacity_reviewed"],
    priority: "high", tags: ["production", "capacity", "expansion"],
  },
  {
    id: "prd-004", name: "Raw Material Shortage", domain: "production",
    description: "Bahan baku produksi habis, produksi terancam berhenti",
    trigger: { type: "event", eventType: "production.material_shortage", data: { materialId: 401, materialName: "Tepung Terigu", requiredQty: 500, availableQty: 50, productionOrderId: "PO-2026-07-901", branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_production", "cap_purchasing", "cap_inventory"],
    expectedActions: ["ExpediteMaterial", "AdjustProductionSchedule"], expectedEvents: ["production.material_ordered", "production.schedule_adjusted"],
    priority: "critical", tags: ["production", "material", "supply-chain"],
  },
  {
    id: "prd-005", name: "Production Efficiency Drop", domain: "production",
    description: "Efisiensi produksi turun signifikan",
    trigger: { type: "event", eventType: "production.efficiency_drop", data: { lineId: "LINE-A", efficiency: 62, baseline: 85, dropPct: 27, branchId: 1 }, branchId: 1 },
    expectedExecutive: "COO", expectedCapabilities: ["cap_production"],
    expectedActions: ["EfficiencyAudit", "ProcessOptimization"], expectedEvents: ["production.efficiency_audit"],
    priority: "normal", tags: ["production", "efficiency", "optimization"],
  },
];

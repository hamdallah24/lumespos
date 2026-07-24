export interface KpiTrend {
  value: number; previous: number; change: number; direction: "up" | "down" | "flat";
}

export interface WarehouseDetail {
  warehouseId: number; warehouseName: string; totalValue: number; itemCount: number;
  movementIn: number; movementOut: number; utilization: number;
}

export interface InventoryDashboard {
  totalValue: number; totalValueTrend: KpiTrend;
  totalItems: number; totalItemsTrend: KpiTrend;
  byWarehouse: WarehouseDetail[];
  byBranch: Array<{ branchId: number; itemCount: number; totalValue: number }>;
  negativeStockCount: number; lowStockCount: number; lowStockTrend: KpiTrend;
  outOfStockCount: number; recentMovements: number; recentMovementsTrend: KpiTrend;
  validationScore: number; validationLabel: string;
  warehouseDetail: WarehouseDetail[];
}

export interface InventoryValidationReport {
  checks: Array<{ name: string; status: "passed" | "warning" | "failed" | "info"; detail: string; count?: number }>;
  totalChecks: number; passedChecks: number; failedChecks: number;
  overallScore: number; overallLabel: string;
}

export interface RecentMovement {
  id: number; movementType: string; direction: "in" | "out";
  qtyChange: string; qtyAfter: string; unitCost: string | null;
  description: string | null; referenceType: string | null;
  itemType: string; itemId: number; warehouseId: number;
  warehouseName: string | null; createdAt: string;
}

export interface AiRecommendation {
  type: "reorder" | "transfer" | "overstock" | "slow" | "imbalance" | "abnormal";
  title: string; description: string; severity: "low" | "medium" | "high";
  action?: string; source?: string;
}

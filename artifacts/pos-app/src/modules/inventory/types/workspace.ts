export interface InventoryDashboard {
  totalValue: number; totalItems: number; byWarehouse: Array<{ warehouseId: number; warehouseName: string; itemCount: number; totalValue: number }>;
  byBranch: Array<{ branchId: number; itemCount: number; totalValue: number }>;
  negativeStockCount: number; lowStockCount: number; recentMovements: number;
  validationScore: number; validationLabel: string;
}

export interface InventoryValidationReport {
  checks: Array<{ name: string; status: "passed" | "warning" | "failed"; detail: string; count?: number }>;
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

export interface LowStockItem {
  itemType: string; itemId: number; warehouseId: number;
  itemName: string; warehouseName: string;
  currentStock: number; minStock: number;
}

export interface InventoryItem {
  id: number; itemType: string; itemId: number;
  sku: string; name: string; category: string;
  warehouseId: number; warehouseName: string;
  currentStock: number; averageCost: number; totalValue: number;
  lastMovement: string | null; status: string;
}

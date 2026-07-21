export interface Warehouse {
  id: number;
  branchId: number;
  code: string;
  name: string;
  type: "central" | "branch" | "production";
  isActive: boolean;
  createdAt: string;
}

export interface StockCardEntry {
  id: number;
  branchId: number;
  warehouseId: number;
  itemType: string;
  itemId: number;
  movementType: string;
  direction: "in" | "out";
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  valueBefore: number;
  valueChange: number;
  valueAfter: number;
  unitCost: number | null;
  referenceType: string | null;
  referenceId: number | null;
  batchId: string | null;
  description: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface StockCardResult {
  items: StockCardEntry[];
  total: number;
}

export interface MovementPayload {
  branchId: number;
  warehouseId?: number;
  itemType: string;
  itemId: number;
  movementType: string;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: number;
  description?: string;
}

export interface MovementResult {
  stockCardId: number;
  qtyBefore: number;
  qtyAfter: number;
  valueBefore: number;
  valueAfter: number;
  totalCost: number;
}

export interface ValuationItem {
  itemType: string;
  itemId: number;
  quantity: number;
  unitCost: number;
  totalValue: number;
}

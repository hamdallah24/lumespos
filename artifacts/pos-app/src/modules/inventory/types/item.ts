export interface ItemCategory {
  id: number;
  name: string;
  parentId: number | null;
  color: string | null;
  isActive: boolean | null;
  createdAt: string;
}

export interface Item {
  id: number;
  branchId: number;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  categoryId: number | null;
  type: string;
  baseUnit: string;
  purchaseUnit: string | null;
  salesUnit: string | null;
  purchaseUnitConversion: string | null;
  salesUnitConversion: string | null;
  purchasePrice: string;
  standardCost: string;
  defaultSupplierId: number | null;
  defaultWarehouseId: number | null;
  reorderPoint: string;
  minStock: string;
  maxStock: string;
  leadTime: number;
  safetyStock: string;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemListResponse {
  items: Item[];
  total: number;
  totalPages: number;
  page: number;
}
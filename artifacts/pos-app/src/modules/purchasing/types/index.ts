export interface Supplier {
  id: number; code: string; name: string; contactPerson: string | null;
  phone: string | null; email: string | null; address: string | null;
  taxId: string | null; paymentTerms: string | null;
  isActive: boolean; createdAt: string;
}
export interface PurchaseOrderItem {
  id: number; poId: number; itemType: string; itemId: number;
  quantityOrdered: number; quantityReceived: number;
  unitCost: number; totalCost: number; notes: string | null;
}
export interface PurchaseOrder {
  id: number; poNumber: string; supplierId: number; branchId: number;
  status: string; orderDate: string; expectedDate: string | null;
  shippingCost: number; taxAmount: number; totalAmount: number;
  notes: string | null; approvedBy: number | null; approvedAt: string | null;
  createdBy: number | null; createdAt: string;
  items?: PurchaseOrderItem[];
  supplierName?: string;
}
export interface GoodsReceiptItem {
  id: number; receiptId: number; poItemId: number;
  itemType: string; itemId: number; quantityReceived: number;
  unitCost: number; totalCost: number;
}
export interface GoodsReceipt {
  id: number; grNumber: string; poId: number; branchId: number;
  warehouseId: number; receivedDate: string; status: string;
  notes: string | null; receivedBy: number | null; createdAt: string;
  items?: GoodsReceiptItem[];
  poNumber?: string; warehouseName?: string;
}
export interface SupplierInvoice {
  id: number; invoiceNumber: string; supplierId: number; poId: number;
  invoiceDate: string; dueDate: string | null; totalAmount: number;
  status: string; notes: string | null; threeWayMatchStatus: string | null;
  createdBy: number | null; createdAt: string;
  supplierName?: string; poNumber?: string;
}
export interface PurchasingDashboard {
  openPOs: number; goodsWaitingReceipt: number;
  outstandingInvoices: number; apPendingPayment: number;
  supplierPerformance: { supplierId: number; supplierName: string; poCount: number; receiptCount: number }[];
  procurementValue: number;
  validationScore: number; validationLabel: string;
}
export interface PurchasingValidation {
  checks: { name: string; status: string; detail: string; count?: number }[];
  totalChecks: number; passedChecks: number; overallScore: number; overallLabel: string;
}
export interface SupplierAISuggestion {
  type: string; severity: "info" | "warning" | "critical";
  title: string; detail: string; supplierId?: number; supplierName?: string;
}

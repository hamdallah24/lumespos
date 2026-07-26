export interface BuildOptions {
  branchId?: number;
  period?: string;
  forceRefresh?: boolean;
  userId?: number;
}

export interface ContextBuilder<I, O> {
  readonly domain: string;
  build(input: I, options?: BuildOptions): Promise<O>;
  refresh(options?: BuildOptions): Promise<void>;
}

export interface RawWarehouseItem {
  id: number;
  name: string;
  currentStock: number;
  reorderPoint: number;
  unit: string;
  costPrice: number;
}

export interface RawWarehouse {
  id: number;
  name: string;
  type: string;
  items: RawWarehouseItem[];
}

export interface RawMovement {
  id: number;
  itemType: string;
  itemId: number;
  movementType: string;
  quantity: number;
  createdAt: string;
}

export interface RawAgingEntry {
  itemId: number;
  itemName: string;
  daysInWarehouse: number;
  quantity: number;
}

export interface RawFifoLayer {
  itemId: number;
  layerId: number;
  quantity: number;
  unitCost: number;
  remainingQty: number;
}

export interface RawProjection {
  itemId: number;
  itemName: string;
  projectedDate: string;
  projectedStock: number;
}

export interface RawInventoryData {
  warehouses: RawWarehouse[];
  movements: RawMovement[];
  aging: RawAgingEntry[];
  fifoLayers: RawFifoLayer[];
  projections: RawProjection[];
  validationScore: number;
}

export interface RawAccount {
  code: string;
  name: string;
  type: string;
  normalBalance: string;
}

export interface RawTrialBalanceEntry {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface RawCashFlowEntry {
  category: string;
  amount: number;
  type: string;
}

export interface RawBalanceSheetEntry {
  accountCategory: string;
  total: number;
}

export interface RawProfitLossEntry {
  name: string;
  type: string;
  total: number;
}

export interface RawAccountingPeriod {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  lastClosed?: string;
}

export interface RawFinanceData {
  accounts: RawAccount[];
  trialBalance: RawTrialBalanceEntry[];
  cashFlow: RawCashFlowEntry[];
  balanceSheet: RawBalanceSheetEntry[];
  profitLoss: RawProfitLossEntry[];
  period: RawAccountingPeriod;
  revenueTotal: number;
  expenseTotal: number;
}

export interface RawEmployee {
  id: number;
  name: string;
  status: string;
  department: string;
  position: string;
  rating?: number;
}

export interface RawAttendanceEntry {
  id: number;
  employeeId: number;
  type: string;
  date: string;
}

export interface RawLeaveEntry {
  id: number;
  employeeId: number;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface RawHRData {
  employees: RawEmployee[];
  attendance: RawAttendanceEntry[];
  leave: RawLeaveEntry[];
}

export interface RawSupplier {
  id: number;
  name: string;
  status: string;
  avgLeadTime: number;
  reliability: number;
}

export interface RawPurchaseOrder {
  id: number;
  supplierId: number;
  supplierName: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface RawGoodsReceipt {
  id: number;
  poId: number;
  receivedAt: string;
}

export interface RawSupplierInvoice {
  id: number;
  supplierId: number;
  total: number;
  status: string;
}

export interface RawPurchasingData {
  suppliers: RawSupplier[];
  purchaseOrders: RawPurchaseOrder[];
  goodsReceipts: RawGoodsReceipt[];
  invoices: RawSupplierInvoice[];
}

export interface RawRecipe {
  id: number;
  parentType: string;
  parentId: number;
  componentType: string;
  componentId: number;
  quantity: number;
}

export interface RawBatch {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  status: string;
}

export interface RawCostEntry {
  id: number;
  productId: number;
  costType: string;
  amount: number;
}

export interface RawProductionData {
  recipes: RawRecipe[];
  batches: RawBatch[];
  costs: RawCostEntry[];
}

export interface RawOrderSummary {
  id: number;
  total: number;
  createdAt: string;
  branchId: number;
}

export interface RawProductSales {
  productId: number;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface RawSalesData {
  orders: RawOrderSummary[];
  topProducts: RawProductSales[];
  periodStart: string;
  periodEnd: string;
}

export interface InventoryContext {
  health: "healthy" | "warning" | "critical";
  criticalItems: { name: string; stock: number; reorderPoint: number; unit: string; warehouse: string }[];
  warehouseUtilization: { warehouseId: number; name: string; capacity: number; used: number; percent: number }[];
  inventoryValue: { total: number; byWarehouse: { warehouse: string; value: number }[] };
  transferRecommendations: { from: string; to: string; item: string; qty: number; reason: string }[];
  stockRisks: { item: string; risk: string; severity: number; description: string }[];
  validationScore: number;
  movementSummary: { last24h: { in: number; out: number; adjust: number }; trend: string };
  aiFindings: string[];
  timestamp: number;
}

export interface FinancialContext {
  revenue: { total: number; trend: string; percentChange: number; period: string };
  profit: { gross: number; net: number; margin: number };
  cashPosition: { current: number; projected: number; minRequired: number };
  expenseTrend: { categories: { name: string; total: number; percentOfRevenue: number }[]; topExpenses: string[] };
  financialHealth: { score: number; flags: string[] };
  risks: { type: string; severity: string; description: string }[];
  forecast: { nextPeriod: { revenue: number; expense: number; profit: number }; confidence: number };
  trialBalance: { totalDebit: number; totalCredit: number; isBalanced: boolean; difference: number };
  periodStatus: { currentPeriod: string; status: string; lastClosed: string };
  timestamp: number;
}

export interface PeopleContext {
  headcount: { total: number; active: number; byDepartment: { department: string; count: number }[] };
  attendance: { today: { present: number; absent: number; onLeave: number }; trend: string };
  leave: { pending: number; approved: number; byType: { type: string; count: number }[] };
  performance: { topPerformers: string[]; issues: string[] };
  hiring: { openPositions: number; candidates: number; timeToHire: number };
  risks: { type: string; severity: string; description: string }[];
  timestamp: number;
}

export interface SupplierContext {
  suppliers: { id: number; name: string; status: string; avgLeadTime: number; reliability: number }[];
  pendingPOs: { id: number; supplier: string; total: number; daysOpen: number }[];
  overdueDeliveries: { poId: number; supplier: string; item: string; daysLate: number }[];
  supplierHealth: { atRisk: string[]; critical: string[]; totalActive: number };
  timestamp: number;
}

export interface ProductionContext {
  activeBatches: { id: number; product: string; status: string; progress: number; eta: string }[];
  efficiency: { yield: number; waste: number; downtime: number; trend: string };
  costs: { perUnit: number; total: number; byProduct: { name: string; cost: number }[] };
  bottlenecks: { resource: string; severity: string; impact: string }[];
  timestamp: number;
}

export interface SalesContext {
  today: { revenue: number; orders: number; avgOrderValue: number };
  period: { revenue: number; orders: number; growth: number; label: string };
  topProducts: { name: string; sold: number; revenue: number; trend: string }[];
  comparisons: { vsYesterday: { revenuePercent: number; ordersPercent: number }; vsLastWeek: { revenuePercent: number; ordersPercent: number } };
  timestamp: number;
}

export interface OperationalState {
  inventory?: InventoryContext;
  finance?: FinancialContext;
  people?: PeopleContext;
  suppliers?: SupplierContext;
  production?: ProductionContext;
  sales?: SalesContext;
  timestamp: number;
}

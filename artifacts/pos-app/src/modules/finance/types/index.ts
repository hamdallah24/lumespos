export interface FinanceAccount {
  id: number;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  parentId: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceTransaction {
  id: number;
  branchId: number;
  type: string;
  category: string;
  description: string;
  amount: string;
  referenceType: string | null;
  referenceId: number | null;
  referenceCode: string | null;
  sourceModule: string | null;
  status: string;
  notes: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceJournalEntry {
  id: number;
  transactionId: number;
  accountId: number;
  debit: string;
  credit: string;
  description: string | null;
  createdAt: Date;
}

export interface FinanceLedgerEntry {
  id: number;
  accountId: number;
  journalEntryId: number;
  transactionId: number;
  date: Date;
  description: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
  createdAt: Date;
}

export interface FinanceDashboardData {
  cashBalance: number;
  todayIncome: number;
  todayCOGS: number;
  todayOperatingExpense: number;
  todayExpense: number;
  profitToday: number;
  hasData: boolean;
  cashPosition: CashPosition;
  health: FinancialHealth | null;
  insight: InsightData | null;
  accountingPeriod?: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    remainingDays: number;
  } | null;
}

export interface CashPositionItem {
  code: string;
  name: string;
  balance: number;
}

export interface CashPosition {
  cash: number;
  bank: number;
  eWallet: number;
  accountsReceivable: number;
  accountsPayable: number;
  total: number;
}

export interface FinancialHealth {
  cashHealth: { score: number; label: string; description: string };
  profitability: { score: number; label: string; description: string };
  expenseRatio: { score: number; label: string; description: string };
  revenueTrend: { score: number; label: string; description: string };
  overallScore: number;
  overallLabel: string;
}

export interface InsightData {
  income: { current: number; previous: number; change: number; direction: "up" | "down" | "flat" };
  operatingExpense: { current: number; previous: number; change: number; direction: "up" | "down" | "flat" };
  totalExpense: { current: number; previous: number; change: number; direction: "up" | "down" | "flat" };
  cogs: { current: number; previous: number; change: number };
  grossMargin: number;
  profitMargin: number;
  netProfit: number;
  hasHistory: boolean;
}

export interface TimelineItem {
  id: number;
  branchId: number;
  type: string;
  category: string;
  description: string;
  amount: number;
  referenceType: string | null;
  referenceId: number | null;
  referenceCode: string | null;
  sourceModule: string | null;
  status: string;
  createdBy: number | null;
  createdAt: Date;
  balanceAfter: number;
  journalGenerated: boolean;
  ledgerUpdated: boolean;
}

export interface TimelineResult {
  items: TimelineItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DailySnapshot {
  id: number;
  branchId: number;
  snapshotDate: Date;
  openingCash: number;
  closingCash: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  transactionCount: number;
  createdAt: Date;
}

export interface TrialBalanceRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

export interface BalanceSheetData {
  assets: Array<{ code: string; name: string; balance: number }>;
  liabilities: Array<{ code: string; name: string; balance: number }>;
  equity: Array<{ code: string; name: string; balance: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface ProfitLossData {
  revenue: Array<{ code: string; name: string; balance: number }>;
  expenses: Array<{ code: string; name: string; balance: number }>;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export type TransactionCategory =
  | "pos_sale"
  | "depot_sale"
  | "marketplace_sale"
  | "service_revenue"
  | "raw_material"
  | "salary"
  | "utilities"
  | "internet"
  | "rent"
  | "transportation"
  | "marketing"
  | "maintenance"
  | "other_expense";

export const TRANSACTION_CATEGORIES: Record<string, { label: string; type: "income" | "expense" }> = {
  pos_sale: { label: "POS", type: "income" },
  depot_sale: { label: "Depot", type: "income" },
  marketplace_sale: { label: "Marketplace", type: "income" },
  service_revenue: { label: "Jasa", type: "income" },
  raw_material: { label: "Bahan Baku", type: "expense" },
  salary: { label: "Gaji", type: "expense" },
  utilities: { label: "Utilitas", type: "expense" },
  internet: { label: "Internet", type: "expense" },
  rent: { label: "Sewa", type: "expense" },
  transportation: { label: "Transportasi", type: "expense" },
  marketing: { label: "Marketing", type: "expense" },
  maintenance: { label: "Perawatan", type: "expense" },
  other_expense: { label: "Lainnya", type: "expense" },
};

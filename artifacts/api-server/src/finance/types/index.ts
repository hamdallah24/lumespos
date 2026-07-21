export interface JournalLine {
  accountId: number;
  debit: number;
  credit: number;
  description?: string;
}

export interface TransactionInput {
  branchId: number;
  type: string;
  category: string;
  description: string;
  amount: number;
  accountId?: number;
  referenceType?: string;
  referenceId?: number;
  referenceCode?: string;
  sourceModule?: string;
  notes?: string;
  createdBy?: number;
  updatedBy?: number;
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

export interface CashflowData {
  operating: Array<{ description: string; amount: number }>;
  investing: Array<{ description: string; amount: number }>;
  financing: Array<{ description: string; amount: number }>;
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChange: number;
}

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";

export type ValidationSeverity = "critical" | "error" | "warning" | "info";
export type ValidationStatus = "passed" | "failed" | "warning";

export interface ValidationCheckResult {
  name: string;
  status: ValidationStatus;
  severity: ValidationSeverity;
  detail: string;
  recommendation: string;
  autoFix: boolean;
  affectedCount: number;
}

export interface ValidationReport {
  runAt: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  overallScore: number;
  checks: ValidationCheckResult[];
  summary: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
}

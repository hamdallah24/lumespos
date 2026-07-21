import { db, accountsTable, ledgerEntriesTable, transactionsTable } from "@workspace/db";
import { eq, sql, and, inArray, gte, lte } from "drizzle-orm";
import { getAccountBalances as getLedgerBalances } from "./ledgerEngine";
import type { TrialBalanceRow, BalanceSheetData, ProfitLossData, CashflowData } from "../types";

export interface ReportFilters {
  branchIds?: number[];
  startDate?: Date;
  endDate?: Date;
}

export interface EquityStatementData {
  openingBalance: number;
  additions: Array<{ description: string; amount: number }>;
  deductions: Array<{ description: string; amount: number }>;
  netIncome: number;
  closingBalance: number;
}

export async function generateTrialBalance(filters?: ReportFilters): Promise<TrialBalanceRow[]> {
  const conditions: any[] = [];

  if (filters?.branchIds && filters.branchIds.length > 0) {
    conditions.push(inArray(transactionsTable.branchId, filters.branchIds));
  }
  if (filters?.startDate) {
    conditions.push(gte(ledgerEntriesTable.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(ledgerEntriesTable.date, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const query = db
    .select({
      accountId: ledgerEntriesTable.accountId,
      accountCode: accountsTable.code,
      accountName: accountsTable.name,
      accountType: accountsTable.type,
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .innerJoin(accountsTable, eq(ledgerEntriesTable.accountId, accountsTable.id));

  if (filters?.branchIds && filters.branchIds.length > 0) {
    query.leftJoin(transactionsTable, eq(ledgerEntriesTable.transactionId, transactionsTable.id));
  }

  if (whereClause) {
    query.where(whereClause);
  }

  const result = await query
    .groupBy(ledgerEntriesTable.accountId, accountsTable.code, accountsTable.name, accountsTable.type)
    .orderBy(accountsTable.code);

  return result.map((row) => ({
    accountId: row.accountId,
    accountCode: row.accountCode,
    accountName: row.accountName,
    accountType: row.accountType,
    debit: Math.round(parseFloat(row.totalDebit) * 100) / 100,
    credit: Math.round(parseFloat(row.totalCredit) * 100) / 100,
  }));
}

export async function generateBalanceSheet(filters?: ReportFilters): Promise<BalanceSheetData> {
  const balances = await getLedgerBalances(filters);

  const assets = balances
    .filter((b) => b.accountType === "asset")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const liabilities = balances
    .filter((b) => b.accountType === "liability")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const equityBase = balances
    .filter((b) => b.accountType === "equity")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const totalRevenue = balances
    .filter((b) => b.accountType === "revenue")
    .reduce((sum, b) => sum + b.balance, 0);
  const totalExpenses = balances
    .filter((b) => b.accountType === "expense")
    .reduce((sum, b) => sum + b.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  const equity = netIncome !== 0
    ? [...equityBase, { code: "NET_INCOME", name: "Laba Berjalan", balance: netIncome }]
    : equityBase;

  const totalAssets = Math.round(assets.reduce((sum, a) => sum + a.balance, 0) * 100) / 100;
  const totalLiabilities = Math.round(liabilities.reduce((sum, l) => sum + l.balance, 0) * 100) / 100;
  const totalEquity = Math.round(equity.reduce((sum, e) => sum + e.balance, 0) * 100) / 100;

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
}

export async function generateProfitLoss(filters?: ReportFilters): Promise<ProfitLossData> {
  const balances = await getLedgerBalances(filters);

  const revenue = balances
    .filter((b) => b.accountType === "revenue")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const expenses = balances
    .filter((b) => b.accountType === "expense")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);

  return { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
}

export async function generateCashflow(filters?: ReportFilters): Promise<CashflowData> {
  // Dynamically discover cash-equivalent accounts (type = asset, starting with 1)
  const cashAccounts = await db
    .select()
    .from(accountsTable)
    .where(
      and(
        eq(accountsTable.type, "asset"),
        sql`${accountsTable.code} LIKE '1%'`,
      ),
    );

  const balances = await getLedgerBalances(filters);
  const balanceMap = new Map(balances.map((b) => [b.accountCode, b.balance]));

  const operating = cashAccounts.map((acc) => ({
    description: acc.name,
    amount: balanceMap.get(acc.code) || 0,
  }));

  // Investing: accounts with type=asset, code starting with '15'+
  const investingAccounts = cashAccounts.filter((a) => a.code.startsWith("15") || a.code.startsWith("16") || a.code.startsWith("17"));
  const investing = investingAccounts.map((acc) => ({
    description: acc.name,
    amount: balanceMap.get(acc.code) || 0,
  }));

  // Financing: accounts with type=liability or equity, code starting with '3'
  const financingAccounts = (await db
    .select()
    .from(accountsTable)
    .where(
      and(
        sql`(${accountsTable.type} = 'liability' OR ${accountsTable.type} = 'equity')`,
        sql`${accountsTable.code} LIKE '3%'`,
      ),
    ));
  const financing = financingAccounts.map((acc) => ({
    description: acc.name,
    amount: balanceMap.get(acc.code) || 0,
  }));

  const netOperating = Math.round(operating.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const netInvesting = Math.round(investing.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const netFinancing = Math.round(financing.reduce((s, i) => s + i.amount, 0) * 100) / 100;

  return {
    operating,
    investing,
    financing,
    netOperating,
    netInvesting,
    netFinancing,
    netChange: netOperating + netInvesting + netFinancing,
  };
}

export async function generateEquityStatement(filters?: ReportFilters): Promise<EquityStatementData> {
  const balances = await getLedgerBalances(filters);

  const equityAccounts = balances.filter((b) => b.accountType === "equity");
  const totalRevenue = Math.round(balances.filter((b) => b.accountType === "revenue").reduce((s, b) => s + b.balance, 0) * 100) / 100;
  const totalExpenses = Math.round(balances.filter((b) => b.accountType === "expense").reduce((s, b) => s + b.balance, 0) * 100) / 100;
  const netIncome = Math.round((totalRevenue - totalExpenses) * 100) / 100;

  const additions = equityAccounts.filter((b) => b.balance > 0).map((b) => ({
    description: b.accountName,
    amount: Math.round(b.balance * 100) / 100,
  }));
  const deductions = equityAccounts.filter((b) => b.balance < 0).map((b) => ({
    description: b.accountName,
    amount: Math.round(Math.abs(b.balance) * 100) / 100,
  }));

  const priorFilters = filters ? { ...filters, endDate: filters.startDate } : undefined;
  const priorBalances = priorFilters?.endDate
    ? await getLedgerBalances({ ...priorFilters, startDate: undefined })
    : [];
  const openingEquity = Math.round(priorBalances.filter((b) => b.accountType === "equity").reduce((s, b) => s + b.balance, 0) * 100) / 100;

  const totalAdditions = Math.round(additions.reduce((s, a) => s + a.amount, 0) * 100) / 100;
  const totalDeductions = Math.round(deductions.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  const closingBalance = Math.round((openingEquity + totalAdditions - totalDeductions + netIncome) * 100) / 100;

  return {
    openingBalance: openingEquity,
    additions,
    deductions,
    netIncome,
    closingBalance,
  };
}

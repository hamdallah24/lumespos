import { db, accountsTable, ledgerEntriesTable, transactionsTable } from "@workspace/db";
import { eq, sql, and, inArray, gte, lte } from "drizzle-orm";
import { getAccountBalances as getLedgerBalances } from "./ledgerEngine";
import type { TrialBalanceRow, BalanceSheetData, ProfitLossData, CashflowData } from "../types";

export interface ReportFilters {
  branchIds?: number[];
  startDate?: Date;
  endDate?: Date;
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
    debit: parseFloat(row.totalDebit),
    credit: parseFloat(row.totalCredit),
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

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

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
  const cashAccount = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, "1000"))
    .then((rows) => rows[0]);

  const bankAccount = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, "1100"))
    .then((rows) => rows[0]);

  const ewalletAccount = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, "1250"))
    .then((rows) => rows[0]);

  const balances = await getLedgerBalances(filters);
  const balanceMap = new Map(balances.map((b) => [b.accountCode, b.balance]));

  const cashBalance = balanceMap.get("1000") || 0;
  const bankBalance = balanceMap.get("1100") || 0;
  const ewalletBalance = balanceMap.get("1250") || 0;

  const operating = [
    { description: "Kas", amount: cashBalance },
    { description: "Bank", amount: bankBalance },
    { description: "E-Wallet", amount: ewalletBalance },
  ];

  const totalCash = cashBalance + bankBalance + ewalletBalance;

  return {
    operating,
    investing: [],
    financing: [],
    netOperating: totalCash,
    netInvesting: 0,
    netFinancing: 0,
    netChange: totalCash,
  };
}

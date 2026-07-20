import { db, accountsTable, ledgerEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { TrialBalanceRow, BalanceSheetData, ProfitLossData, CashflowData } from "../types";

export async function generateTrialBalance(): Promise<TrialBalanceRow[]> {
  const result = await db
    .select({
      accountId: ledgerEntriesTable.accountId,
      accountCode: accountsTable.code,
      accountName: accountsTable.name,
      accountType: accountsTable.type,
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .innerJoin(accountsTable, eq(ledgerEntriesTable.accountId, accountsTable.id))
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

export async function generateBalanceSheet(): Promise<BalanceSheetData> {
  const balances = await getAccountBalances();

  const assets = balances
    .filter((b) => b.accountType === "asset")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const liabilities = balances
    .filter((b) => b.accountType === "liability")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const equity = balances
    .filter((b) => b.accountType === "equity")
    .map((b) => ({ code: b.accountCode, name: b.accountName, balance: b.balance }));

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
  const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
}

export async function generateProfitLoss(): Promise<ProfitLossData> {
  const balances = await getAccountBalances();

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

export async function generateCashflow(): Promise<CashflowData> {
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

  const cashBalance = cashAccount
    ? await getAccountBalance(cashAccount.id)
    : 0;

  const bankBalance = bankAccount
    ? await getAccountBalance(bankAccount.id)
    : 0;

  const operating = [
    { description: "Kas", amount: cashBalance },
    { description: "Bank", amount: bankBalance },
  ];

  const totalCash = cashBalance + bankBalance;

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

async function getAccountBalance(accountId: number): Promise<number> {
  const [result] = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.accountId, accountId));

  if (!result) return 0;

  const account = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId))
    .then((rows) => rows[0]);

  const totalDebit = parseFloat(result.totalDebit);
  const totalCredit = parseFloat(result.totalCredit);

  if (account?.normalBalance === "debit") {
    return totalDebit - totalCredit;
  }
  return totalCredit - totalDebit;
}

async function getAccountBalances() {
  const result = await db
    .select({
      accountId: ledgerEntriesTable.accountId,
      accountCode: accountsTable.code,
      accountName: accountsTable.name,
      accountType: accountsTable.type,
      normalBalance: accountsTable.normalBalance,
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .innerJoin(accountsTable, eq(ledgerEntriesTable.accountId, accountsTable.id))
    .groupBy(ledgerEntriesTable.accountId, accountsTable.code, accountsTable.name, accountsTable.type, accountsTable.normalBalance);

  return result.map((row) => {
    const totalDebit = parseFloat(row.totalDebit);
    const totalCredit = parseFloat(row.totalCredit);
    const isDebitNormal = row.normalBalance === "debit";
    const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;

    return {
      accountId: row.accountId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType,
      normalBalance: row.normalBalance,
      balance,
    };
  });
}

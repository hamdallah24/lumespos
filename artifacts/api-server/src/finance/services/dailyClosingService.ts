import { db, transactionsTable, accountsTable, ledgerEntriesTable, balanceSnapshotsTable } from "@workspace/db";
import { eq, and, sql, gte, lt } from "drizzle-orm";

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

async function getAccountBalanceByCode(code: string): Promise<number> {
  const account = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, code))
    .then((r) => r[0]);

  if (!account) return 0;

  const [result] = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.accountId, account.id));

  if (!result) return 0;

  const totalDebit = parseFloat(result.totalDebit);
  const totalCredit = parseFloat(result.totalCredit);

  return account.normalBalance === "debit"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}

async function getPreviousSnapshot(branchId: number, beforeDate: Date): Promise<DailySnapshot | null> {
  const [snapshot] = await db
    .select()
    .from(balanceSnapshotsTable)
    .where(
      and(
        eq(balanceSnapshotsTable.branchId, branchId),
        lt(balanceSnapshotsTable.snapshotDate, beforeDate)
      )
    )
    .orderBy(sql`${balanceSnapshotsTable.snapshotDate} DESC`)
    .limit(1);

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    branchId: snapshot.branchId,
    snapshotDate: snapshot.snapshotDate,
    openingCash: parseFloat(snapshot.openingCash),
    closingCash: parseFloat(snapshot.closingCash),
    totalAssets: parseFloat(snapshot.totalAssets),
    totalLiabilities: parseFloat(snapshot.totalLiabilities),
    totalEquity: parseFloat(snapshot.totalEquity),
    totalRevenue: parseFloat(snapshot.totalRevenue),
    totalExpenses: parseFloat(snapshot.totalExpenses),
    netIncome: parseFloat(snapshot.netIncome),
    cashBalance: parseFloat(snapshot.cashBalance),
    transactionCount: snapshot.transactionCount,
    createdAt: snapshot.createdAt,
  };
}

async function getDailyTransactions(branchId: number, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.branchId, branchId),
        gte(transactionsTable.createdAt, startOfDay),
        lt(transactionsTable.createdAt, endOfDay)
      )
    );
}

export async function createDailySnapshot(branchId: number, date?: Date): Promise<DailySnapshot> {
  const snapshotDate = date || new Date();
  snapshotDate.setHours(0, 0, 0, 0);

  const existing = await db
    .select()
    .from(balanceSnapshotsTable)
    .where(
      and(
        eq(balanceSnapshotsTable.branchId, branchId),
        sql`DATE(${balanceSnapshotsTable.snapshotDate}) = DATE(${snapshotDate})`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      id: existing[0].id,
      branchId: existing[0].branchId,
      snapshotDate: existing[0].snapshotDate,
      openingCash: parseFloat(existing[0].openingCash),
      closingCash: parseFloat(existing[0].closingCash),
      totalAssets: parseFloat(existing[0].totalAssets),
      totalLiabilities: parseFloat(existing[0].totalLiabilities),
      totalEquity: parseFloat(existing[0].totalEquity),
      totalRevenue: parseFloat(existing[0].totalRevenue),
      totalExpenses: parseFloat(existing[0].totalExpenses),
      netIncome: parseFloat(existing[0].netIncome),
      cashBalance: parseFloat(existing[0].cashBalance),
      transactionCount: existing[0].transactionCount,
      createdAt: existing[0].createdAt,
    };
  }

  const previousSnapshot = await getPreviousSnapshot(branchId, snapshotDate);
  const openingCash = previousSnapshot?.closingCash || 0;

  const dailyTransactions = await getDailyTransactions(branchId, snapshotDate);

  let income = 0;
  let expense = 0;
  for (const t of dailyTransactions) {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      income += amount;
    } else {
      expense += amount;
    }
  }

  const cashBalance = await getAccountBalanceByCode("1000");
  const bankBalance = await getAccountBalanceByCode("1100");
  const closingCash = cashBalance;

  const [snapshot] = await db
    .insert(balanceSnapshotsTable)
    .values({
      branchId,
      snapshotDate,
      openingCash: String(openingCash),
      closingCash: String(closingCash),
      totalAssets: String(cashBalance + bankBalance),
      totalLiabilities: String(await getAccountBalanceByCode("2000")),
      totalEquity: String(await getAccountBalanceByCode("3000")),
      totalRevenue: String(income),
      totalExpenses: String(expense),
      netIncome: String(income - expense),
      cashBalance: String(cashBalance),
      transactionCount: dailyTransactions.length,
    })
    .returning();

  return {
    id: snapshot.id,
    branchId: snapshot.branchId,
    snapshotDate: snapshot.snapshotDate,
    openingCash,
    closingCash,
    totalAssets: parseFloat(snapshot.totalAssets),
    totalLiabilities: parseFloat(snapshot.totalLiabilities),
    totalEquity: parseFloat(snapshot.totalEquity),
    totalRevenue: parseFloat(snapshot.totalRevenue),
    totalExpenses: parseFloat(snapshot.totalExpenses),
    netIncome: parseFloat(snapshot.netIncome),
    cashBalance: parseFloat(snapshot.cashBalance),
    transactionCount: snapshot.transactionCount,
    createdAt: snapshot.createdAt,
  };
}

export async function getDailySnapshots(branchId: number, days?: number): Promise<DailySnapshot[]> {
  const limit = days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - limit);
  startDate.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(balanceSnapshotsTable)
    .where(
      and(
        eq(balanceSnapshotsTable.branchId, branchId),
        sql`${balanceSnapshotsTable.snapshotDate} >= ${startDate}`
      )
    )
    .orderBy(sql`${balanceSnapshotsTable.snapshotDate} DESC`);

  return rows.map((row) => ({
    id: row.id,
    branchId: row.branchId,
    snapshotDate: row.snapshotDate,
    openingCash: parseFloat(row.openingCash),
    closingCash: parseFloat(row.closingCash),
    totalAssets: parseFloat(row.totalAssets),
    totalLiabilities: parseFloat(row.totalLiabilities),
    totalEquity: parseFloat(row.totalEquity),
    totalRevenue: parseFloat(row.totalRevenue),
    totalExpenses: parseFloat(row.totalExpenses),
    netIncome: parseFloat(row.netIncome),
    cashBalance: parseFloat(row.cashBalance),
    transactionCount: row.transactionCount,
    createdAt: row.createdAt,
  }));
}

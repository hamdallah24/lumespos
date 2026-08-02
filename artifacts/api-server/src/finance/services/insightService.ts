import { db, transactionsTable, balanceSnapshotsTable, ordersTable } from "@workspace/db";
import { eq, and, sql, gte, lt } from "drizzle-orm";

export interface InsightData {
  income: {
    current: number;
    previous: number;
    change: number;
    direction: "up" | "down" | "flat";
  };
  operatingExpense: {
    current: number;
    previous: number;
    change: number;
    direction: "up" | "down" | "flat";
  };
  totalExpense: {
    current: number;
    previous: number;
    change: number;
    direction: "up" | "down" | "flat";
  };
  cogs: {
    current: number;
    previous: number;
    change: number;
  };
  grossMargin: number;
  profitMargin: number;
  netProfit: number;
  hasHistory: boolean;
}

async function getDailyTotals(branchId: number, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return getRangeTotals(branchId, startOfDay, endOfDay);
}

async function getRangeTotals(branchId: number, start: Date, end: Date) {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.branchId, branchId),
        gte(transactionsTable.createdAt, startDate),
        lt(transactionsTable.createdAt, endDate)
      )
    );

  let income = 0;
  let expense = 0;
  let cogs = 0;
  for (const t of rows) {
    if (t.status === "voided") continue;
    const amount = Math.round(parseFloat(t.amount) * 100) / 100;
    if (t.type === "income") {
      income += amount;
    } else if (t.category === "cogs") {
      cogs += amount;
    } else {
      expense += amount;
    }
  }

  // Fallback: If no income in transactionsTable, fetch from ordersTable
  if (income === 0) {
    const orderRows = await db
      .select({ total: sql<string>`COALESCE(SUM(${ordersTable.total}), 0)` })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.branchId, branchId),
          sql`${ordersTable.status} != 'voided'`,
          gte(ordersTable.createdAt, startDate),
          lt(ordersTable.createdAt, endDate)
        )
      );
    income = parseFloat(orderRows[0]?.total || "0");
  }

  income = Math.round(income * 100) / 100;
  expense = Math.round(expense * 100) / 100;
  cogs = Math.round(cogs * 100) / 100;

  return { income, expense, cogs };
}

export async function getInsightData(branchId: number, startDate?: Date, endDate?: Date): Promise<InsightData> {
  let today: Date;
  let yesterday: Date;
  let todayEnd: Date;
  let yesterdayEnd: Date;

  if (startDate && endDate) {
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    const durationDays = Math.max(
      1,
      Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const prevEnd = new Date(rangeStart);
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (durationDays - 1));
    prevStart.setHours(0, 0, 0, 0);

    today = rangeStart;
    todayEnd = rangeEnd;
    yesterday = prevStart;
    yesterdayEnd = prevEnd;
  } else {
    today = new Date();
    today.setHours(0, 0, 0, 0);
    todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
  }

  const [todayData, yesterdayData] = await Promise.all([
    getRangeTotals(branchId, today, todayEnd),
    getRangeTotals(branchId, yesterday, yesterdayEnd),
  ]);

  const hasHistory = yesterdayData.income > 0 || yesterdayData.expense > 0 || yesterdayData.cogs > 0;

  const incomeChange = yesterdayData.income > 0
    ? ((todayData.income - yesterdayData.income) / yesterdayData.income) * 100
    : 0;

  const expenseChange = yesterdayData.expense > 0
    ? ((todayData.expense - yesterdayData.expense) / yesterdayData.expense) * 100
    : 0;

  const totalRevenue = todayData.income;
  const totalCOGS = todayData.cogs;
  const totalOperatingExpense = todayData.expense;
  const totalExpenses = Math.round((totalCOGS + totalOperatingExpense) * 100) / 100;
  const grossProfit = Math.round((totalRevenue - totalCOGS) * 100) / 100;
  const netProfit = Math.round((grossProfit - totalOperatingExpense) * 100) / 100;
  const grossMargin = totalRevenue > 0
    ? Math.round((grossProfit / totalRevenue) * 1000) / 10
    : 0;
  const netMargin = totalRevenue > 0
    ? Math.round((netProfit / totalRevenue) * 1000) / 10
    : 0;

  const yesterdayTotalExpense = Math.round(((yesterdayData.cogs || 0) + (yesterdayData.expense || 0)) * 100) / 100;
  const totalExpenseChange = yesterdayTotalExpense > 0
    ? Math.round(((totalExpenses - yesterdayTotalExpense) / yesterdayTotalExpense) * 1000) / 10
    : 0;

  return {
    income: {
      current: Math.round(todayData.income * 100) / 100,
      previous: Math.round(yesterdayData.income * 100) / 100,
      change: Math.abs(Math.round(incomeChange * 10) / 10),
      direction: incomeChange > 0 ? "up" : incomeChange < 0 ? "down" : "flat",
    },
    operatingExpense: {
      current: Math.round(todayData.expense * 100) / 100,
      previous: Math.round(yesterdayData.expense * 100) / 100,
      change: Math.abs(Math.round(expenseChange * 10) / 10),
      direction: expenseChange > 0 ? "up" : expenseChange < 0 ? "down" : "flat",
    },
    totalExpense: {
      current: totalExpenses,
      previous: yesterdayTotalExpense,
      change: Math.abs(Math.round(totalExpenseChange * 10) / 10),
      direction: totalExpenseChange > 0 ? "up" : totalExpenseChange < 0 ? "down" : "flat",
    },
    cogs: {
      current: Math.round(todayData.cogs * 100) / 100,
      previous: Math.round(yesterdayData.cogs * 100) / 100,
      change: yesterdayData.cogs > 0 ? Math.round(((todayData.cogs - yesterdayData.cogs) / yesterdayData.cogs) * 1000) / 10 : 0,
    },
    grossMargin,
    profitMargin: netMargin,
    netProfit,
    hasHistory,
  };
}

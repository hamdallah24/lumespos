import { db, transactionsTable, balanceSnapshotsTable } from "@workspace/db";
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

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.branchId, branchId),
        gte(transactionsTable.createdAt, startOfDay),
        lt(transactionsTable.createdAt, endOfDay)
      )
    );

  let income = 0;
  let expense = 0;
  let cogs = 0;
  for (const t of rows) {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      income += amount;
    } else if (t.category === "cogs") {
      cogs += amount;
    } else {
      expense += amount;
    }
  }

  return { income, expense, cogs };
}

export async function getInsightData(branchId: number): Promise<InsightData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [todayData, yesterdayData] = await Promise.all([
    getDailyTotals(branchId, today),
    getDailyTotals(branchId, yesterday),
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
  const totalExpenses = totalCOGS + totalOperatingExpense;
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalOperatingExpense;
  const grossMargin = totalRevenue > 0
    ? (grossProfit / totalRevenue) * 100
    : 0;
  const netMargin = totalRevenue > 0
    ? (netProfit / totalRevenue) * 100
    : 0;

  // Total expense change
  const yesterdayTotalExpense = (yesterdayData.cogs || 0) + (yesterdayData.expense || 0);
  const totalExpenseChange = yesterdayTotalExpense > 0
    ? ((totalExpenses - yesterdayTotalExpense) / yesterdayTotalExpense) * 100
    : 0;

  return {
    income: {
      current: todayData.income,
      previous: yesterdayData.income,
      change: Math.abs(incomeChange),
      direction: incomeChange > 0 ? "up" : incomeChange < 0 ? "down" : "flat",
    },
    operatingExpense: {
      current: todayData.expense,
      previous: yesterdayData.expense,
      change: Math.abs(expenseChange),
      direction: expenseChange > 0 ? "up" : expenseChange < 0 ? "down" : "flat",
    },
    totalExpense: {
      current: totalExpenses,
      previous: yesterdayTotalExpense,
      change: Math.abs(totalExpenseChange),
      direction: totalExpenseChange > 0 ? "up" : totalExpenseChange < 0 ? "down" : "flat",
    },
    cogs: {
      current: todayData.cogs,
      previous: yesterdayData.cogs,
      change: yesterdayData.cogs > 0 ? ((todayData.cogs - yesterdayData.cogs) / yesterdayData.cogs) * 100 : 0,
    },
    grossMargin,
    profitMargin: netMargin,
    netProfit,
    hasHistory,
  };
}

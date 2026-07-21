import { db, transactionsTable, accountsTable, ledgerEntriesTable } from "@workspace/db";
import { eq, and, sql, gte, lt } from "drizzle-orm";

export interface HealthData {
  cashHealth: {
    score: number;
    label: string;
    description: string;
  };
  profitability: {
    score: number;
    label: string;
    description: string;
  };
  expenseRatio: {
    score: number;
    label: string;
    description: string;
  };
  revenueTrend: {
    score: number;
    label: string;
    description: string;
  };
  overallScore: number;
  overallLabel: string;
}

async function getAccountBalance(code: string): Promise<number> {
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

async function getMonthlyTotals(branchId: number, monthsAgo: number) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsAgo);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() - monthsAgo + 1);
  endDate.setHours(0, 0, 0, 0);

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
  let operatingExpense = 0;
  for (const t of rows) {
    const amount = parseFloat(t.amount);
    if (t.type === "income") {
      income += amount;
    } else {
      expense += amount;
      if (t.category !== "cogs") {
        operatingExpense += amount;
      }
    }
  }

  return { income, expense, operatingExpense };
}

export async function getHealthData(branchId: number, precomputedBalances?: { cash: number; bank: number; ewallet?: number }): Promise<HealthData> {
  let totalCash: number;

  if (precomputedBalances) {
    totalCash = precomputedBalances.cash + precomputedBalances.bank + (precomputedBalances.ewallet || 0);
  } else {
    const [cashBalance, bankBalance, ewalletBalance] = await Promise.all([
      getAccountBalance("1000"),
      getAccountBalance("1100"),
      getAccountBalance("1250"),
    ]);
    totalCash = cashBalance + bankBalance + ewalletBalance;
  }

  const [currentMonth, lastMonth] = await Promise.all([
    getMonthlyTotals(branchId, 0),
    getMonthlyTotals(branchId, 1),
  ]);

  let cashHealthScore = 50;
  if (totalCash > 10000000) cashHealthScore = 90;
  else if (totalCash > 5000000) cashHealthScore = 75;
  else if (totalCash > 1000000) cashHealthScore = 60;
  else if (totalCash > 0) cashHealthScore = 40;
  else cashHealthScore = 20;

  const currentProfit = currentMonth.income - currentMonth.expense;
  const lastProfit = lastMonth.income - lastMonth.expense;
  let profitabilityScore = 50;
  if (currentProfit > 0) {
    profitabilityScore = lastProfit > 0
      ? Math.min(100, 70 + ((currentProfit - lastProfit) / lastProfit) * 30)
      : 80;
  } else {
    profitabilityScore = 30;
  }

  const expenseRatio = currentMonth.income > 0
    ? (currentMonth.operatingExpense / currentMonth.income) * 100
    : 0;
  let expenseRatioScore = 50;
  if (expenseRatio < 50) expenseRatioScore = 90;
  else if (expenseRatio < 70) expenseRatioScore = 75;
  else if (expenseRatio < 90) expenseRatioScore = 60;
  else expenseRatioScore = 30;

  const revenueGrowth = lastMonth.income > 0
    ? ((currentMonth.income - lastMonth.income) / lastMonth.income) * 100
    : 0;
  let revenueTrendScore = 50;
  if (revenueGrowth > 20) revenueTrendScore = 90;
  else if (revenueGrowth > 10) revenueTrendScore = 75;
  else if (revenueGrowth > 0) revenueTrendScore = 60;
  else revenueTrendScore = 40;

  const overallScore = Math.round(
    (cashHealthScore + profitabilityScore + expenseRatioScore + revenueTrendScore) / 4
  );

  let overallLabel = "Sangat Baik";
  if (overallScore < 40) overallLabel = "Perlu Perhatian";
  else if (overallScore < 60) overallLabel = "Cukup";
  else if (overallScore < 80) overallLabel = "Baik";

  return {
    cashHealth: {
      score: cashHealthScore,
      label: cashHealthScore >= 70 ? "Sehat" : cashHealthScore >= 40 ? "Cukup" : "Rendah",
      description: `Saldo kas: Rp ${totalCash.toLocaleString("id-ID")}`,
    },
    profitability: {
      score: profitabilityScore,
      label: profitabilityScore >= 70 ? "Profitable" : profitabilityScore >= 40 ? "Break-even" : "Rugi",
      description: `Laba bulan ini: Rp ${currentProfit.toLocaleString("id-ID")}`,
    },
    expenseRatio: {
      score: expenseRatioScore,
      label: expenseRatioScore >= 70 ? "Efisien" : expenseRatioScore >= 40 ? "Normal" : "Tinggi",
      description: `Rasio pengeluaran: ${expenseRatio.toFixed(1)}%`,
    },
    revenueTrend: {
      score: revenueTrendScore,
      label: revenueTrendScore >= 70 ? "Naik" : revenueTrendScore >= 40 ? "Stabil" : "Turun",
      description: `Pertumbuhan: ${revenueGrowth.toFixed(1)}%`,
    },
    overallScore,
    overallLabel,
  };
}

export class CashForecast {
  forecastBurnRate(
    expenses: number[],
    income: number[]
  ): { burnRate: number; runway: number; criticalDate: string | null } {
    const avgExpenses = expenses.length > 0
      ? expenses.reduce((a, b) => a + b, 0) / expenses.length
      : 0;
    const avgIncome = income.length > 0
      ? income.reduce((a, b) => a + b, 0) / income.length
      : 0;
    const burnRate = Math.max(0, avgExpenses - avgIncome);
    return { burnRate, runway: 0, criticalDate: null };
  }

  forecastCashPosition(
    currentCash: number,
    projectedIncome: number[],
    projectedExpenses: number[]
  ): { day: number; cash: number }[] {
    const days = Math.max(projectedIncome.length, projectedExpenses.length, 30);
    const result: { day: number; cash: number }[] = [];
    let cash = currentCash;
    for (let i = 0; i < days; i++) {
      const inc = i < projectedIncome.length ? projectedIncome[i] : 0;
      const exp = i < projectedExpenses.length ? projectedExpenses[i] : 0;
      cash += inc - exp;
      result.push({ day: i + 1, cash: Math.round(cash * 100) / 100 });
    }
    return result;
  }

  getCashWarnings(
    cashProjection: { day: number; cash: number }[],
    minThreshold: number
  ): { day: number; cash: number; severity: string }[] {
    return cashProjection
      .filter((p) => p.cash < minThreshold)
      .map((p) => ({
        day: p.day,
        cash: p.cash,
        severity: p.cash < 0 ? "critical" : p.cash < minThreshold * 0.5 ? "high" : "warning",
      }));
  }
}

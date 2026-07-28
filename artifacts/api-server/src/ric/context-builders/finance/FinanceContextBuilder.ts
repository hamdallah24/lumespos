import type { ContextBuilder, BuildOptions, RawFinanceData, FinancialContext } from '../types';

interface CacheEntry {
  data: FinancialContext;
  expiresAt: number;
}

export class FinanceContextBuilder implements ContextBuilder<RawFinanceData, FinancialContext> {
  readonly domain = "finance";
  private cache = new Map<string, CacheEntry>();

  private getCacheKey(options?: BuildOptions): string {
    return `finance|b${options?.branchId ?? 0}|p${options?.period ?? "today"}`;
  }

  async build(input: RawFinanceData, options?: BuildOptions): Promise<FinancialContext> {
    const key = this.getCacheKey(options);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now() && !options?.forceRefresh) {
      return cached.data;
    }

    const totalDebit = input.trialBalance.reduce((s, e) => s + e.debit, 0);
    const totalCredit = input.trialBalance.reduce((s, e) => s + e.credit, 0);
    const revenue = input.revenueTotal;
    const expenses = input.expenseTotal;
    const grossProfit = revenue - expenses;
    const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
    const cashPosition = totalDebit - totalCredit;
    const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

    const healthScore = this.calculateHealthScore(margin, isBalanced, input.period.status);
    const flags = this.generateFlags(healthScore, margin, isBalanced);

    const context: FinancialContext = {
      revenue: {
        total: revenue,
        trend: this.determineTrend(revenue, options?.period),
        percentChange: options?.period === "month" ? Math.round(Math.random() * 20 - 10) : 0,
        period: options?.period ?? "today",
      },
      profit: {
        gross: grossProfit,
        net: Math.round(grossProfit * 0.75),
        margin,
      },
      cashPosition: {
        current: cashPosition,
        projected: Math.round(cashPosition * 1.1),
        minRequired: Math.round(revenue * 0.1),
      },
      expenseTrend: {
        categories: [
          { name: "Operational", total: Math.round(expenses * 0.4), percentOfRevenue: revenue > 0 ? Math.round((expenses * 0.4 / revenue) * 100) : 0 },
          { name: "Inventory", total: Math.round(expenses * 0.3), percentOfRevenue: revenue > 0 ? Math.round((expenses * 0.3 / revenue) * 100) : 0 },
          { name: "Labor", total: Math.round(expenses * 0.2), percentOfRevenue: revenue > 0 ? Math.round((expenses * 0.2 / revenue) * 100) : 0 },
          { name: "Utilities", total: Math.round(expenses * 0.1), percentOfRevenue: revenue > 0 ? Math.round((expenses * 0.1 / revenue) * 100) : 0 },
        ],
        topExpenses: ["Operational", "Inventory"],
      },
      financialHealth: { score: healthScore, flags },
      risks: this.assessRisks(margin, isBalanced, healthScore),
      forecast: {
        nextPeriod: {
          revenue: Math.round(revenue * 1.1),
          expense: Math.round(expenses * 1.05),
          profit: Math.round(grossProfit * 1.2),
        },
        confidence: healthScore > 70 ? 0.8 : 0.5,
      },
      trialBalance: {
        totalDebit, totalCredit, isBalanced, difference: Math.abs(totalDebit - totalCredit),
      },
      periodStatus: {
        currentPeriod: input.period.name,
        status: input.period.status,
        lastClosed: input.period.lastClosed ?? "N/A",
      },
      timestamp: Date.now(),
    };

    this.cache.set(key, { data: context, expiresAt: Date.now() + 120000 });
    return context;
  }

  async refresh(options?: BuildOptions): Promise<void> {
    this.cache.delete(this.getCacheKey(options));
  }

  private calculateHealthScore(margin: number, isBalanced: boolean, periodStatus: string): number {
    let score = 70;
    if (margin > 20) score += 15;
    else if (margin > 10) score += 5;
    else if (margin < 0) score -= 20;
    if (!isBalanced) score -= 15;
    if (periodStatus === "closing") score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  private generateFlags(score: number, margin: number, isBalanced: boolean): string[] {
    const flags: string[] = [];
    if (margin < 0) flags.push("Gross margin negative");
    if (margin < 10) flags.push("Margin tipis — perlu efisiensi biaya");
    if (!isBalanced) flags.push("Trial balance tidak balance");
    if (score < 50) flags.push("Financial health kritis");
    return flags;
  }

  private determineTrend(revenue: number, period?: string): string {
    if (revenue > 10000000) return "up";
    if (revenue > 5000000) return "stable";
    return "down";
  }

  private assessRisks(margin: number, isBalanced: boolean, healthScore: number): FinancialContext["risks"] {
    const risks: FinancialContext["risks"] = [];
    if (margin < 0) risks.push({ type: "profitability", severity: "high", description: "Gross margin negatif" });
    if (!isBalanced) risks.push({ type: "accounting", severity: "high", description: "Trial balance tidak balance" });
    if (healthScore < 40) risks.push({ type: "liquidity", severity: "medium", description: "Financial health menurun" });
    if (margin < 10 && margin >= 0) risks.push({ type: "efficiency", severity: "low", description: "Margin tipis, perlu monitoring" });
    return risks;
  }
}

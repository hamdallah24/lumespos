import { Dimension, ForecastResult, Trend } from "../types";
import { RevenueForecast } from "./RevenueForecast";
import { CashForecast } from "./CashForecast";
import { InventoryForecast } from "./InventoryForecast";
import { DemandForecast } from "./DemandForecast";
import { StaffForecast } from "./StaffForecast";
import { ScenarioForecast } from "./ScenarioForecast";

function isRevenue(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes("revenue") || m.includes("sale") || m.includes("income") || m.includes("aov") || m.includes("order");
}

function isCash(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes("cash") || m.includes("burn") || m.includes("ebitda") || m.includes("expense") || m.includes("margin") || m.includes("capital") || m.includes("dso") || m.includes("profit");
}

function isInventory(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes("inventory") || m.includes("stock") || m.includes("dead") || m.includes("waste") || m.includes("warehouse") || m.includes("picking") || m.includes("packing") || m.includes("shipping");
}

function isHR(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes("attendance") || m.includes("turnover") || m.includes("headcount") || m.includes("productivity") || m.includes("overtime") || m.includes("employee") || m.includes("staff") || m.includes("hire");
}

function isDemand(metric: string): boolean {
  const m = metric.toLowerCase();
  return m.includes("demand") || m.includes("customer") || m.includes("cac") || m.includes("roas") || m.includes("conversion") || m.includes("engagement") || m.includes("retention") || m.includes("churn") || m.includes("lead") || m.includes("ltv") || m.includes("nps");
}

export class ForecastEngine {
  revenue = new RevenueForecast();
  cash = new CashForecast();
  inventory = new InventoryForecast();
  demand = new DemandForecast();
  staff = new StaffForecast();
  scenario = new ScenarioForecast();

  forecast(metric: string, dimension: Dimension, values: number[]): ForecastResult {
    const currentValue = values.length > 0 ? values[values.length - 1] : 0;
    const trend = this.determineTrend(values);
    const warnings = this.generateWarnings(values, trend);

    let forecast7d: number;
    let forecast30d: number;
    let forecast90d: number;
    let forecast365d: number;
    let confidence: number;
    let seasonalityFactor: number;

    if (isRevenue(metric)) {
      forecast7d = this.revenue.forecast7d(values);
      forecast30d = this.revenue.forecast30d(values);
      forecast90d = this.revenue.forecast90d(values);
      forecast365d = this.revenue.forecast365d(values);
      confidence = this.revenue.getConfidence(values);
      seasonalityFactor = this.calcSeasonality(values);
    } else if (isCash(metric)) {
      forecast7d = this.revenue.forecast7d(values);
      forecast30d = this.revenue.forecast30d(values);
      forecast90d = this.revenue.forecast90d(values);
      forecast365d = this.revenue.forecast365d(values);
      confidence = this.revenue.getConfidence(values);
      seasonalityFactor = 0;
    } else if (isInventory(metric)) {
      if (metric === "kpi_stockout_rate") {
        const { daysUntilStockout } = this.inventory.forecastStockout(currentValue, values.length >= 30 ? values.slice(-30) : values, 7);
        forecast7d = daysUntilStockout === Infinity ? 0 : daysUntilStockout;
        forecast30d = daysUntilStockout === Infinity ? 0 : daysUntilStockout * 4;
        forecast90d = daysUntilStockout === Infinity ? 0 : daysUntilStockout * 12;
        forecast365d = daysUntilStockout === Infinity ? 0 : daysUntilStockout * 52;
        confidence = daysUntilStockout === Infinity ? 0.3 : 0.5;
      } else {
        forecast7d = this.revenue.forecast7d(values);
        forecast30d = this.revenue.forecast30d(values);
        forecast90d = this.revenue.forecast90d(values);
        forecast365d = this.revenue.forecast365d(values);
        confidence = this.revenue.getConfidence(values);
      }
      seasonalityFactor = 0;
    } else if (isHR(metric)) {
      const headcountResult = this.staff.forecastHeadcount(currentValue, 0.1, 0.05, 12);
      const lastFc = headcountResult[headcountResult.length - 1]?.headcount ?? currentValue;
      forecast7d = currentValue;
      forecast30d = lastFc;
      forecast90d = lastFc;
      forecast365d = lastFc;
      confidence = values.length < 3 ? 0.3 : 0.5;
      seasonalityFactor = 0;
    } else if (isDemand(metric)) {
      const demandResult = this.demand.forecast(values, 30);
      forecast7d = demandResult.forecast[0] ?? currentValue;
      forecast30d = demandResult.forecast[demandResult.forecast.length - 1] ?? currentValue;
      forecast90d = forecast30d;
      forecast365d = forecast30d;
      confidence = demandResult.confidence;
      seasonalityFactor = 0;
    } else {
      forecast7d = this.revenue.forecast7d(values);
      forecast30d = this.revenue.forecast30d(values);
      forecast90d = this.revenue.forecast90d(values);
      forecast365d = this.revenue.forecast365d(values);
      confidence = this.revenue.getConfidence(values);
      seasonalityFactor = this.calcSeasonality(values);
    }

    return {
      metric,
      dimension,
      currentValue,
      forecast7d,
      forecast30d,
      forecast90d,
      forecast365d,
      confidence,
      trend,
      seasonalityFactor,
      warnings,
      generatedAt: new Date().toISOString(),
    };
  }

  forecastAll(kpiValues: Map<string, number[]>): ForecastResult[] {
    const results: ForecastResult[] = [];
    for (const [metric, values] of kpiValues) {
      const dimension = this.inferDimension(metric);
      results.push(this.forecast(metric, dimension, values));
    }
    return results;
  }

  getCashRunwayWarning(
    currentCash: number,
    expenses: number[],
    income: number[]
  ): { daysLeft: number; severity: string; message: string } {
    const avgExpense = expenses.length > 0
      ? expenses.reduce((a, b) => a + b, 0) / expenses.length
      : 0;
    const avgIncome = income.length > 0
      ? income.reduce((a, b) => a + b, 0) / income.length
      : 0;
    const netBurn = avgExpense - avgIncome;
    if (netBurn <= 0) {
      return { daysLeft: Infinity, severity: "low", message: "Cash flow is positive or break-even." };
    }
    const daysLeft = Math.floor(currentCash / netBurn);
    let severity: string;
    let message: string;
    if (daysLeft <= 7) {
      severity = "critical";
      message = `Critical: Cash runway is only ${daysLeft} days. Immediate action required.`;
    } else if (daysLeft <= 30) {
      severity = "high";
      message = `Warning: Cash runway is ${daysLeft} days. Reduce expenses or secure funding.`;
    } else if (daysLeft <= 90) {
      severity = "medium";
      message = `Caution: Cash runway is ${daysLeft} days. Monitor closely.`;
    } else {
      severity = "low";
      message = `Healthy: Cash runway is ${daysLeft} days.`;
    }
    return { daysLeft, severity, message };
  }

  whatIf(
    values: number[],
    scenario: "best" | "worst" | "likely",
    adjustment: number
  ): number[] {
    switch (scenario) {
      case "best":
        return this.scenario.bestCase(values, adjustment);
      case "worst":
        return this.scenario.worstCase(values, adjustment);
      case "likely":
        return this.scenario.mostLikely(values, adjustment, 0.1);
    }
  }

  private determineTrend(values: number[]): Trend {
    if (values.length < 2) return "stable";
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    const meanX = (indices.reduce((a, b) => a + b, 0)) / n;
    const meanY = (values.reduce((a, b) => a + b, 0)) / n;
    const num = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const den = indices.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    const slope = den === 0 ? 0 : num / den;
    const mean = meanY;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean === 0 ? 0 : stdDev / Math.abs(mean);
    if (cv > 0.5) return "volatile";
    if (slope > mean * 0.01) return "up";
    if (slope < -mean * 0.01) return "down";
    return "stable";
  }

  private calcSeasonality(values: number[]): number {
    if (values.length < 14) return 0;
    const half = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, half);
    const secondHalf = values.slice(half, half * 2);
    if (firstHalf.length === 0 || secondHalf.length === 0) return 0;
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    return avg1 === 0 ? 0 : Math.round(((avg2 - avg1) / avg1) * 100) / 100;
  }

  private generateWarnings(values: number[], trend: Trend): string[] {
    const warnings: string[] = [];
    if (trend === "down") {
      warnings.push("Declining trend detected.");
    }
    if (trend === "volatile") {
      warnings.push("High volatility detected. Forecast confidence may be reduced.");
    }
    if (values.length < 7) {
      warnings.push("Insufficient data points for reliable forecasting (minimum 7 recommended).");
    }
    return warnings;
  }

  private inferDimension(metric: string): Dimension {
    const lower = metric.toLowerCase();
    if (lower.includes("revenue") || lower.includes("sale") || lower.includes("income")) return "sales";
    if (lower.includes("cash") || lower.includes("expense") || lower.includes("burn")) return "finance";
    if (lower.includes("inventory") || lower.includes("stock") || lower.includes("warehouse")) return "warehouse";
    if (lower.includes("employee") || lower.includes("staff") || lower.includes("hire")) return "hr";
    if (lower.includes("product") || lower.includes("production")) return "production";
    if (lower.includes("customer") || lower.includes("crm")) return "crm";
    if (lower.includes("market") || lower.includes("campaign")) return "marketing";
    return "sales";
  }
}
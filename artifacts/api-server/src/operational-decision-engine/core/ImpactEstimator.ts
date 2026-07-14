import type { BusinessFact } from "../../business-intelligence/core/types";
import type { ImpactResult } from "./types";

export function estimateImpact(fact: BusinessFact): ImpactResult {
  const result: ImpactResult = {};

  switch (fact.domain) {
    case "inventory":
      if (fact.name === "stock_coverage_critical") {
        const daysRemaining = fact.value;
        const dailyValue = estimateDailyValue(fact.branchId);
        result.financialImpact = {
          estimatedLoss: daysRemaining <= 0 ? dailyValue * 3 : dailyValue * daysRemaining,
          probability: daysRemaining <= 1 ? 0.9 : 0.6,
          currency: "IDR",
        };
        result.operationalImpact = {
          affectedArea: "production",
          severity: daysRemaining <= 1 ? "high" : "medium",
          description: `Stok habis dalam ${daysRemaining.toFixed(1)} hari — produksi terancam berhenti`,
        };
      }
      break;

    case "sales":
      if (fact.name === "revenue_drop") {
        result.financialImpact = {
          estimatedLoss: Math.abs(fact.value) * 1_000_000,
          probability: 0.7,
          currency: "IDR",
        };
        result.operationalImpact = {
          affectedArea: "revenue",
          severity: "high",
          description: "Pendapatan turun signifikan — perlu evaluasi strategi penjualan",
        };
      }
      break;

    case "shift":
      if (fact.name === "cash_discrepancy") {
        result.financialImpact = {
          estimatedLoss: Math.abs(fact.value),
          probability: 0.95,
          currency: "IDR",
        };
        result.operationalImpact = {
          affectedArea: "cash_management",
          severity: "high",
          description: "Selisih kas membutuhkan investigasi segera",
        };
      }
      break;

    case "finance":
      if (fact.name === "expense_spike") {
        result.financialImpact = {
          estimatedLoss: Math.abs(fact.value) * 500_000,
          probability: 0.5,
          currency: "IDR",
        };
        result.operationalImpact = {
          affectedArea: "cost_management",
          severity: "medium",
          description: "Lonjakan pengeluaran membutuhkan review",
        };
      }
      break;
  }

  return result;
}

const dailyValueCache = new Map<number | undefined, number>();

function estimateDailyValue(branchId?: number): number {
  if (dailyValueCache.has(branchId)) return dailyValueCache.get(branchId)!;
  const value = 500_000;
  dailyValueCache.set(branchId, value);
  return value;
}

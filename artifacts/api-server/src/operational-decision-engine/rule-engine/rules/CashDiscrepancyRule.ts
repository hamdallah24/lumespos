import { registerRule } from "../RuleRegistry";

export function registerCashDiscrepancyRule(): void {
  registerRule(
    "cash_discrepancy",
    (fact) => fact.name === "cash_accuracy" && fact.value > 0.05,
    (fact) => ({
      title: `Selisih kas ${(fact.value * 100).toFixed(1)}% — perlu audit`,
      description: `Selisih antara kas aktual dan kas yang diharapkan sebesar ${(fact.value * 100).toFixed(1)}%. Melebihi toleransi 5%.`,
      severity: fact.value > 0.1 ? "critical" : "high",
      source: "rule",
    }),
  );
}

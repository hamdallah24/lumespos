import { registerRule } from "../RuleRegistry";

export function registerExpenseSpikeRule(): void {
  registerRule(
    "expense_spike",
    (fact) => fact.name === "daily_expense" && fact.value > 2_000_000,
    (fact) => ({
      title: `Pengeluaran tinggi — Rp ${fact.value.toLocaleString("id-ID")}`,
      description: `Pengeluaran harian Rp ${fact.value.toLocaleString("id-ID")}. Melebihi batas normal. Perlu review pengeluaran.`,
      severity: fact.value > 5_000_000 ? "high" : "medium",
      source: "rule",
    }),
  );
}

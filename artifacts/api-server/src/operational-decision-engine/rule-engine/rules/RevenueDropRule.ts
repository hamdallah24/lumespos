import { registerRule } from "../RuleRegistry";

export function registerRevenueDropRule(): void {
  registerRule(
    "revenue_drop",
    (fact) => fact.name === "daily_revenue" && fact.value < 500_000,
    (fact) => ({
      title: `Pendapatan rendah — Rp ${fact.value.toLocaleString("id-ID")}`,
      description: `Pendapatan harian Rp ${fact.value.toLocaleString("id-ID")}. Di bawah target. Perlu evaluasi strategi penjualan.`,
      severity: fact.value < 200_000 ? "high" : "medium",
      source: "rule",
    }),
  );
}

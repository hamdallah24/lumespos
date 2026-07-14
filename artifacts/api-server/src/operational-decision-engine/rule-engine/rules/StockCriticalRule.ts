import { registerRule } from "../RuleRegistry";

export function registerStockCriticalRule(): void {
  registerRule(
    "stock_critical",
    (fact) => fact.name.startsWith("stock_coverage") && fact.value < 1,
    (fact) => ({
      title: `Stok kritis — coverage ${fact.value.toFixed(1)} hari`,
      description: `Stok habis dalam ${fact.value.toFixed(1)} hari. Produksi akan berhenti jika tidak diisi ulang segera.`,
      severity: "critical",
      source: "rule",
    }),
  );
}

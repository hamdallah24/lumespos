import { registerRule } from "../RuleRegistry";

export function registerStockLowRule(): void {
  registerRule(
    "stock_low",
    (fact) => fact.name.startsWith("stock_coverage") && fact.value >= 1 && fact.value < 3,
    (fact) => ({
      title: `Stok menipis — coverage ${fact.value.toFixed(1)} hari`,
      description: `Stok tersisa ${fact.value.toFixed(1)} hari. Disarankan membuat purchase order.`,
      severity: "high",
      source: "rule",
    }),
  );
}

import { registerRule } from "../RuleRegistry";

export function registerYieldAnomalyRule(): void {
  registerRule(
    "yield_anomaly",
    (fact) => fact.name.startsWith("production_yield") && fact.value < 85,
    (fact) => ({
      title: `Yield produksi ${fact.value.toFixed(1)}% — di bawah target`,
      description: `Hasil produksi ${fact.value.toFixed(1)}%, di bawah target 85%. Perlu evaluasi proses produksi.`,
      severity: fact.value < 70 ? "high" : "medium",
      source: "rule",
    }),
  );
}

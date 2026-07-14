import { RuntimeProfiler } from "./RuntimeProfiler";
import { RuntimeLogger } from "./RuntimeLogger";

interface BudgetRule {
  operation: string;
  slaMs: number;
  severity: "warning" | "error" | "fatal";
}

const rules: BudgetRule[] = [
  { operation: "boot", slaMs: 5000, severity: "error" },
  { operation: "pipeline", slaMs: 500, severity: "warning" },
  { operation: "stage", slaMs: 100, severity: "warning" },
  { operation: "observer", slaMs: 50, severity: "warning" },
  { operation: "registry_lookup", slaMs: 1, severity: "error" },
  { operation: "executive_decision", slaMs: 200, severity: "warning" },
];

export const PerformanceBudget = {
  addRule(rule: BudgetRule): void { rules.push(rule); RuntimeProfiler.setThreshold(rule.operation, rule.slaMs); },

  getRules(): BudgetRule[] { return [...rules]; },

  check(operation: string, durationMs: number, component: string): void {
    const rule = rules.find(r => r.operation === operation);
    if (!rule) return;

    RuntimeProfiler.record(operation, durationMs);

    if (durationMs > rule.slaMs) {
      const msg = `SLA violated: ${operation} took ${durationMs}ms (limit: ${rule.slaMs}ms)`;
      if (rule.severity === "fatal") RuntimeLogger.fatal(component, msg, { duration: durationMs });
      else if (rule.severity === "error") RuntimeLogger.error(component, msg, { duration: durationMs });
      else RuntimeLogger.warn(component, msg, { duration: durationMs });
    }
  },
};

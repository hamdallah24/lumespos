export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TruthRule {
  id: string;
  description: string;
  severity: Severity;
}

export const TRUTH_RULES: TruthRule[] = [
  { id: 'RULE_1', description: 'Never invent numbers. Every number must come from RuntimeContext.', severity: 'CRITICAL' },
  { id: 'RULE_2', description: 'Never invent dates. Every date must match context.time.', severity: 'CRITICAL' },
  { id: 'RULE_3', description: 'Never invent branches. Only use branches from context.branches.', severity: 'HIGH' },
  { id: 'RULE_4', description: 'Never invent products. Only use products from context.sales.topProducts.', severity: 'HIGH' },
  { id: 'RULE_5', description: 'Never invent suppliers. Only use suppliers from context.suppliers.', severity: 'HIGH' },
  { id: 'RULE_6', description: 'Never invent KPIs. Every KPI must be computed from RuntimeContext fields.', severity: 'CRITICAL' },
  { id: 'RULE_7', description: 'Never change BusinessTimeContext. Use context.time.label as-is.', severity: 'CRITICAL' },
  { id: 'RULE_8', description: 'Never summarize data that does not exist in RuntimeContext.', severity: 'HIGH' },
  { id: 'RULE_9', description: 'If data is unavailable, say "Data tidak tersedia." Do not guess.', severity: 'CRITICAL' },
  { id: 'RULE_10', description: 'Every important statement must be traceable to a RuntimeContext field.', severity: 'MEDIUM' },
];

export function getRule(id: string): TruthRule | undefined {
  return TRUTH_RULES.find(r => r.id === id);
}

export function getRuleBySeverity(severity: Severity): TruthRule[] {
  return TRUTH_RULES.filter(r => r.severity === severity);
}

export function getCriticalRules(): TruthRule[] {
  return TRUTH_RULES.filter(r => r.severity === 'CRITICAL');
}

export function summarizePolicy(): string {
  return TRUTH_RULES.map(r => `[${r.severity}] ${r.id}: ${r.description}`).join('\n');
}

export function checkRuleCompliance(
  violations: Array<{ ruleId: string; statement: string; details: string }>,
): { compliant: boolean; criticalViolations: number; totalViolations: number; summary: string } {
  const criticalViolations = violations.filter(v => {
    const rule = getRule(v.ruleId);
    return rule?.severity === 'CRITICAL';
  }).length;

  return {
    compliant: criticalViolations === 0,
    criticalViolations,
    totalViolations: violations.length,
    summary: `${violations.length} violations (${criticalViolations} critical)`,
  };
}

export const TRUTH_RULES_MAP: Record<string, { id: string; maxRetries: number; autoRepair: boolean }> = {
  RULE_1: { id: 'RULE_1', maxRetries: 3, autoRepair: true },
  RULE_2: { id: 'RULE_2', maxRetries: 3, autoRepair: true },
  RULE_3: { id: 'RULE_3', maxRetries: 2, autoRepair: true },
  RULE_4: { id: 'RULE_4', maxRetries: 2, autoRepair: true },
  RULE_5: { id: 'RULE_5', maxRetries: 2, autoRepair: true },
  RULE_6: { id: 'RULE_6', maxRetries: 3, autoRepair: true },
  RULE_7: { id: 'RULE_7', maxRetries: 3, autoRepair: true },
  RULE_8: { id: 'RULE_8', maxRetries: 2, autoRepair: true },
  RULE_9: { id: 'RULE_9', maxRetries: 3, autoRepair: true },
  RULE_10: { id: 'RULE_10', maxRetries: 2, autoRepair: true },
};

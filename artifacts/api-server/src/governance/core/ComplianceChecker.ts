import type { ExecutiveRole } from "../governance-types";

export interface ComplianceRule {
  id: string;
  description: string;
  check: (params: {
    role: ExecutiveRole;
    action: string;
    resource: string;
    data: Record<string, unknown>;
  }) => { compliant: boolean; reason: string };
}

export class ComplianceChecker {
  private rules: ComplianceRule[] = [];

  register(rule: ComplianceRule): void {
    this.rules.push(rule);
  }

  check(params: {
    role: ExecutiveRole;
    action: string;
    resource: string;
    data: Record<string, unknown>;
  }): { compliant: boolean; reasons: string[] } {
    const reasons: string[] = [];
    for (const rule of this.rules) {
      const result = rule.check(params);
      if (!result.compliant) {
        reasons.push(result.reason);
      }
    }
    return { compliant: reasons.length === 0, reasons };
  }

  getAll(): ComplianceRule[] {
    return [...this.rules];
  }
}

export const complianceChecker = new ComplianceChecker();

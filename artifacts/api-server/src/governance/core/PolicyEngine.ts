import type { ExecutiveRole } from "../governance-types";

export interface PolicyResult {
  allow: boolean;
  reason: string;
  policyRef: string;
}

export type PolicyCheck = {
  policyRef: string;
  description: string;
  check: (params: {
    role: ExecutiveRole;
    action: string;
    resource: string;
    value?: number;
    branchId?: number;
  }) => PolicyResult;
};

export class PolicyEngine {
  private policies: PolicyCheck[] = [];

  register(policy: PolicyCheck): void {
    this.policies.push(policy);
  }

  evaluate(params: {
    role: ExecutiveRole;
    action: string;
    resource: string;
    value?: number;
    branchId?: number;
  }): PolicyResult[] {
    const results = this.policies.map(p => p.check(params));
    return results;
  }

  canExecute(params: {
    role: ExecutiveRole;
    action: string;
    resource: string;
    value?: number;
    branchId?: number;
  }): PolicyResult {
    const results = this.evaluate(params);
    const denied = results.find(r => !r.allow);
    if (denied) return denied;
    return { allow: true, reason: "All policies passed", policyRef: "GOV-000" };
  }

  getAll(): PolicyCheck[] {
    return [...this.policies];
  }

  clear(): void {
    this.policies.length = 0;
  }
}

export const policyEngine = new PolicyEngine();

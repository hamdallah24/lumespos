import type { ExecutiveRole } from "../governance-types";
import { policyEngine, PermissionEngine, ApprovalMatrix, auditEngine, complianceChecker } from "../core";
import { registerAllPolicies } from "../policies";

let initialized = false;

export const GovernanceProvider = {
  initialize(): void {
    if (initialized) return;
    registerAllPolicies();
    initialized = true;
  },

  canExecute(role: ExecutiveRole, action: string, resource: string, value?: number): { allow: boolean; reason: string } {
    const result = PermissionEngine.canExecute(role, action, resource, value);
    auditEngine.log({
      actor: role,
      action,
      resource,
      result: result.allow ? "allowed" : "denied",
      reason: result.reason,
      metadata: { value },
    });
    return result;
  },

  checkCompliance(role: ExecutiveRole, action: string, resource: string, data: Record<string, unknown> = {}) {
    const result = complianceChecker.check({ role, action, resource, data });
    return result;
  },

  getApprovalLevel(value: number, resource: string) {
    return ApprovalMatrix.getApprovalLevel(value, resource);
  },

  getApprovers(level: string) {
    return ApprovalMatrix.getRequiredApprovers(level as any);
  },

  getAuditLog() {
    return auditEngine.getRecent(100);
  },

  getPolicies() {
    return policyEngine.getAll();
  },

  getComplianceRules() {
    return complianceChecker.getAll();
  },
};

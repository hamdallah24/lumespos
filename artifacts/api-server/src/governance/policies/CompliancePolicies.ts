import { complianceChecker } from "../core";

export function registerCompliancePolicies(): void {
  complianceChecker.register({
    id: "COMP-001",
    description: "Personal data retention max 90 days",
    check: ({ action, data }) => {
      if (action === "store_personal_data") {
        const retentionDays = (data.retentionDays as number) ?? 0;
        if (retentionDays > 90) {
          return { compliant: false, reason: "COMP-001: Personal data retention exceeds 90 day limit" };
        }
      }
      return { compliant: true, reason: "Passed" };
    },
  });

  complianceChecker.register({
    id: "COMP-002",
    description: "Financial transactions must be logged",
    check: ({ action }) => {
      if (action.startsWith("financial_")) {
        return { compliant: true, reason: "COMP-002: Financial transactions require audit logging (enforced by AuditEngine)" };
      }
      return { compliant: true, reason: "Passed" };
    },
  });

  complianceChecker.register({
    id: "COMP-003",
    description: "All policy decisions must be audited",
    check: () => {
      return { compliant: true, reason: "COMP-003: All decisions are logged via AuditEngine" };
    },
  });
}

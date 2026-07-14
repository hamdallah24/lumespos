import { policyEngine } from "../core";

export function registerPermissionPolicies(): void {
  policyEngine.register({
    policyRef: "GOV-001",
    description: "COO cannot change product prices",
    check: ({ role, action }) => {
      if (role === "COO" && action === "change_price") {
        return { allow: false, reason: "GOV-001: COO cannot change prices", policyRef: "GOV-001" };
      }
      return { allow: true, reason: "Passed", policyRef: "GOV-001" };
    },
  });

  policyEngine.register({
    policyRef: "GOV-002",
    description: "Only CEO can approve price changes",
    check: ({ role, action }) => {
      if (action === "change_price" && role !== "CEO") {
        return { allow: false, reason: "GOV-002: Only CEO can approve price changes", policyRef: "GOV-002" };
      }
      return { allow: true, reason: "Passed", policyRef: "GOV-002" };
    },
  });
}

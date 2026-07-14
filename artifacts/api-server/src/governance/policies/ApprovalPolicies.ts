import { policyEngine } from "../core";

export function registerApprovalPolicies(): void {
  policyEngine.register({
    policyRef: "GOV-003",
    description: "Stock transfers over Rp 10M require CEO approval",
    check: ({ action, value }) => {
      if (action === "transfer_stock" && value && value > 10000000) {
        return { allow: false, reason: "GOV-003: Transfers over Rp 10M need CEO approval", policyRef: "GOV-003" };
      }
      return { allow: true, reason: "Passed", policyRef: "GOV-003" };
    },
  });

  policyEngine.register({
    policyRef: "GOV-004",
    description: "Emergency purchases over Rp 5M require COO approval",
    check: ({ action, value }) => {
      if (action === "emergency_purchase" && value && value > 5000000) {
        return { allow: false, reason: "GOV-004: Emergency purchases over Rp 5M need COO approval", policyRef: "GOV-004" };
      }
      return { allow: true, reason: "Passed", policyRef: "GOV-004" };
    },
  });
}

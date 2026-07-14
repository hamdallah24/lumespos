export { registerPermissionPolicies } from "./PermissionPolicies";
export { registerApprovalPolicies } from "./ApprovalPolicies";
export { registerCompliancePolicies } from "./CompliancePolicies";

export function registerAllPolicies(): void {
  registerPermissionPolicies();
  registerApprovalPolicies();
  registerCompliancePolicies();
}

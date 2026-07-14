import type { ExecutiveRole } from "../governance-types";
import { policyEngine } from "./PolicyEngine";

const PERMISSION_MATRIX: Record<string, string[]> = {
  CEO: ["manage_prices", "approve_budget", "approve_strategy", "manage_executives", "view_all"],
  COO: ["add_stock", "reduce_stock", "transfer_stock", "produce", "view_inventory", "view_operations", "approve_transfer"],
  CFO: ["view_finance", "view_expenses", "view_margin", "approve_expense"],
  CMO: ["view_sales", "view_products", "view_customers", "manage_promo"],
  CTO: ["view_system", "manage_infrastructure", "deploy"],
};

export const PermissionEngine = {
  check(role: ExecutiveRole, action: string): boolean {
    const permissions = PERMISSION_MATRIX[role];
    if (!permissions) return false;
    return permissions.some(p => p === action || p === "view_all");
  },

  getPermissions(role: ExecutiveRole): string[] {
    return PERMISSION_MATRIX[role] ?? [];
  },

  canExecute(role: ExecutiveRole, action: string, resource: string, value?: number): { allow: boolean; reason: string } {
    const hasPermission = this.check(role, action);
    if (!hasPermission) {
      return { allow: false, reason: `${role} does not have permission for ${action}` };
    }

    const policyResults = policyEngine.evaluate({ role, action, resource, value });
    const denied = policyResults.find(r => !r.allow);
    if (denied) return { allow: false, reason: denied.reason };

    return { allow: true, reason: "Permission granted" };
  },
};

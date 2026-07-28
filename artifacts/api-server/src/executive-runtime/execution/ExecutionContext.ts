import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ValidationResult } from "../../erp-execution/types";
import type { ApprovalRequirement } from "../../erp-execution/types";
import type { ExecutionResult } from "./ExecutionResult";

export interface ValidationState {
  passed: boolean;
  results: ValidationResult[];
  errors: string[];
  warnings: string[];
}

export interface GovernanceState {
  passed: boolean;
  reason?: string;
}

export interface ApprovalState {
  status: "approved" | "pending" | "rejected" | "escalated";
  level: string;
  approvedBy?: string;
  reason?: string;
  timestamp?: string;
}

export interface ExecutionContext {
  decision: ExecutiveDecision;
  module: string;
  userId: number;
  branchId: number;
  requestId: string;
  startedAt: number;

  validation: ValidationState;
  governance: GovernanceState;
  approval: ApprovalState;

  result?: ExecutionResult;
  error?: Error;

  retryCount: number;
  maxRetries: number;
}

export function createExecutionContext(
  decision: ExecutiveDecision,
  requestId: string,
): ExecutionContext {
  const module = mapActionToModule(decision.action);
  return {
    decision,
    module,
    userId: decision.userId,
    branchId: decision.branchId,
    requestId,
    startedAt: Date.now(),
    validation: { passed: false, results: [], errors: [], warnings: [] },
    governance: { passed: false },
    approval: { status: "pending", level: "auto" },
    retryCount: 0,
    maxRetries: 2,
  };
}

const ACTION_MODULE_MAP: Record<string, string> = {
  add_stock: "inventory",
  reduce_stock: "inventory",
  correct_stock: "inventory",
  loss_correction: "inventory",
  transfer_stock: "inventory",
  adjust_stock: "inventory",
  add_semi_finished: "production",
  add_ingredient: "production",
  produce: "production",
  produce_batch: "production",
  add_product: "product",
  add_variant: "product",
  update_variant_price: "product",
  add_product_with_variants_and_recipe: "product",
  add_recipe_by_name: "product",
  update_recipe: "product",
  update_price: "product",
  deactivate_product: "product",
  add_recipe: "product",
  add_expense: "finance",
  get_inventory_status: "inventory",
  get_sales_summary: "sales",
  get_top_products: "sales",
  get_products: "product",
  get_shift_audit: "shift",
  get_expenses: "finance",
  list_branches: "branch",
  migrate_branch: "branch",
  close_shift: "shift",
  change_role: "governance",
  record_expense: "finance",
  create_purchase_order: "purchasing",
  general: "general",
};

function mapActionToModule(action: string): string {
  return ACTION_MODULE_MAP[action] || "general";
}

import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ExecutionContext } from "./ExecutionContext";

interface ApprovalConfig {
  requiresApproval: boolean;
  autoApproveThreshold?: number; // max value for auto-approval
  requiresLevel?: string;        // "founder" | "ceo" | "manager"
  escalationTimeoutMs?: number;
}

const APPROVAL_RULES: Record<string, ApprovalConfig> = {
  add_stock: { requiresApproval: false, autoApproveThreshold: 1000000 },
  reduce_stock: { requiresApproval: false },
  correct_stock: { requiresApproval: false },
  loss_correction: { requiresApproval: true, requiresLevel: "ceo", escalationTimeoutMs: 3600000 },
  add_expense: { requiresApproval: false, autoApproveThreshold: 500000 },
  update_price: { requiresApproval: true, requiresLevel: "ceo" },
  deactivate_product: { requiresApproval: true, requiresLevel: "ceo" },
  close_shift: { requiresApproval: false },
  create_purchase_order: { requiresApproval: false, autoApproveThreshold: 5000000 },
  transfer_stock: { requiresApproval: false },
  change_role: { requiresApproval: true, requiresLevel: "founder" },
  produce_batch: { requiresApproval: false },
};

function getConfigForAction(action: string): ApprovalConfig {
  return APPROVAL_RULES[action] || { requiresApproval: false };
}

function extractValue(decision: ExecutiveDecision): number {
  const params = decision.parameters;
  if (params.amount) return Number(params.amount);
  if (params.price) return Number(params.price);
  if (params.qty && params.unitPrice) return Number(params.qty) * Number(params.unitPrice);
  return 0;
}

export async function checkApproval(
  decision: ExecutiveDecision,
  ctx: ExecutionContext,
): Promise<void> {
  const config = getConfigForAction(decision.action);

  if (!config.requiresApproval && !decision.requiresApproval) {
    ctx.approval = { status: "approved", level: "auto", reason: "No approval required" };
    return;
  }

  if (config.autoApproveThreshold !== undefined) {
    const value = extractValue(decision);
    if (value <= config.autoApproveThreshold) {
      ctx.approval = { status: "approved", level: "auto", reason: `Value ${value} within auto-approve threshold ${config.autoApproveThreshold}` };
      return;
    }
  }

  const level = config.requiresLevel || "manager";
  ctx.approval = {
    status: "pending",
    level,
    reason: `Requires ${level} approval for action "${decision.action}"`,
  };
}

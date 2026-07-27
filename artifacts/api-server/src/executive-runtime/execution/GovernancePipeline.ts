import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ExecutionContext } from "./ExecutionContext";

interface GovernanceRule {
  role: string;
  allowedModules: string[];
  allowedActions: string[];
  deniedModules: string[];
  deniedActions: string[];
}

const GOVERNANCE_RULES: GovernanceRule[] = [
  {
    role: "COO",
    allowedModules: ["inventory", "production", "product", "sales", "branch", "shift", "purchasing", "general"],
    allowedActions: ["*"],
    deniedModules: ["finance", "governance", "hr"],
    deniedActions: ["change_role", "close_shift"],
  },
  {
    role: "CFO",
    allowedModules: ["finance", "sales", "general"],
    allowedActions: ["*"],
    deniedModules: ["inventory", "production", "purchasing", "hr", "governance"],
    deniedActions: [],
  },
  {
    role: "CMO",
    allowedModules: ["sales", "product", "general"],
    allowedActions: ["*"],
    deniedModules: ["inventory", "finance", "production", "purchasing", "hr", "governance"],
    deniedActions: ["update_price", "deactivate_product"],
  },
  {
    role: "CHRO",
    allowedModules: ["hr", "general"],
    allowedActions: ["*"],
    deniedModules: ["inventory", "product", "finance", "production", "purchasing", "governance"],
    deniedActions: [],
  },
  {
    role: "CEO",
    allowedModules: ["*"],
    allowedActions: ["*"],
    deniedModules: [],
    deniedActions: [],
  },
  {
    role: "CAIO",
    allowedModules: ["general"],
    allowedActions: ["*"],
    deniedModules: ["inventory", "product", "finance", "production", "purchasing", "hr", "governance", "branch", "shift"],
    deniedActions: [],
  },
  {
    role: "CKO",
    allowedModules: ["general"],
    allowedActions: ["*"],
    deniedModules: ["inventory", "product", "finance", "production", "purchasing", "hr", "governance", "branch", "shift"],
    deniedActions: [],
  },
  {
    role: "CTO",
    allowedModules: ["general"],
    allowedActions: ["*"],
    deniedModules: ["inventory", "product", "finance", "production", "purchasing", "hr", "governance", "branch", "shift"],
    deniedActions: [],
  },
];

function getRuleForRole(role: string): GovernanceRule | undefined {
  return GOVERNANCE_RULES.find(r => r.role === role);
}

function matchesAny(items: string[], target: string): boolean {
  return items.some(i => i === "*" || i === target);
}

export async function checkGovernance(
  decision: ExecutiveDecision,
  ctx: ExecutionContext,
): Promise<void> {
  const rule = getRuleForRole(decision.executive);
  if (!rule) {
    ctx.governance = { passed: false, reason: `No governance rule for role: ${decision.executive}` };
    return;
  }

  if (matchesAny(rule.deniedModules, ctx.module)) {
    ctx.governance = {
      passed: false,
      reason: `${decision.executive} is not allowed to execute actions in module "${ctx.module}"`,
    };
    return;
  }

  if (matchesAny(rule.deniedActions, decision.action)) {
    ctx.governance = {
      passed: false,
      reason: `${decision.executive} is not allowed to execute action "${decision.action}"`,
    };
    return;
  }

  if (!matchesAny(rule.allowedModules, ctx.module) && !matchesAny(rule.allowedModules, "*")) {
    ctx.governance = {
      passed: false,
      reason: `${decision.executive} does not have access to module "${ctx.module}"`,
    };
    return;
  }

  ctx.governance = { passed: true };
}

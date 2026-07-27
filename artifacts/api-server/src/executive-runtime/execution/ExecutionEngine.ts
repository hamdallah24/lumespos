import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ExecutionResult } from "./ExecutionResult";
import { ActionRegistry } from "./ActionRegistry";
import { createExecutionContext, type ExecutionContext } from "./ExecutionContext";
import { validateDecision } from "./ValidationPipeline";
import { checkGovernance } from "./GovernancePipeline";
import { checkApproval } from "./ApprovalPipeline";
import { executeTransaction } from "./TransactionPipeline";
import { registerAllHandlers } from "./handlers/index";
import { auditEngine } from "../../governance/core";

export class ExecutionEngine {
  private registry: ActionRegistry;
  private initialized = false;

  constructor() {
    this.registry = new ActionRegistry();
  }

  initialize(): void {
    if (this.initialized) return;
    registerAllHandlers(this.registry);
    this.initialized = true;
    console.log(`[ExecutionEngine] Initialized with ${this.registry.size()} action handlers`);
  }

  getRegistry(): ActionRegistry {
    return this.registry;
  }

  async execute(decision: ExecutiveDecision): Promise<ExecutionResult> {
    if (!this.initialized) this.initialize();

    const t0 = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const ctx = createExecutionContext(decision, requestId);

    try {
      await validateDecision(decision, ctx, this.registry);
      ctx.validation.passed = ctx.validation.errors.length === 0;
      auditEngine.log({ actor: decision.executive, action: `validate:${decision.action}`, resource: "decision", result: ctx.validation.passed ? "allowed" : "denied", reason: ctx.validation.errors.join("; "), metadata: { decisionId: decision.decisionId, branchId: decision.branchId } });

      if (!ctx.validation.passed) {
        return buildFailedResult(ctx, "Validation failed", ctx.validation.errors, Date.now() - t0);
      }

      await checkGovernance(decision, ctx);
      if (!ctx.governance.passed) {
        return buildFailedResult(ctx, ctx.governance.reason || "Governance check failed", [], Date.now() - t0);
      }

      await checkApproval(decision, ctx);
      if (ctx.approval.status === "pending") {
        const execResult = buildPendingApprovalResult(ctx, Date.now() - t0);
        auditEngine.log({ actor: decision.executive, action: `approve:${decision.action}`, resource: "decision", result: "pending", reason: ctx.approval.reason, metadata: { decisionId: decision.decisionId, branchId: decision.branchId, approvalLevel: ctx.approval.level } });
        return execResult;
      }

      if (ctx.approval.status === "rejected") {
        return buildFailedResult(ctx, ctx.approval.reason || "Approval rejected", [], Date.now() - t0);
      }

      let result = await executeTransaction(ctx, this.registry);

      result.durationMs = Date.now() - t0;
      ctx.result = result;

      auditEngine.log({ actor: decision.executive, action: `execute:${decision.action}`, resource: "erp", result: result.success ? "allowed" : "denied", reason: result.message, metadata: { decisionId: decision.decisionId, executionId: result.executionId, branchId: decision.branchId, durationMs: result.durationMs } });

      return result;

    } catch (err: any) {
      const durationMs = Date.now() - t0;
      auditEngine.log({ actor: decision.executive, action: `execute:${decision.action}`, resource: "erp", result: "denied", reason: err.message || "Unexpected error", metadata: { decisionId: decision.decisionId, branchId: decision.branchId, durationMs } });
      return buildFailedResult(ctx, err.message || "Unexpected execution error", [], durationMs);
    }
  }
}

function buildFailedResult(ctx: ExecutionContext, message: string, errors: string[], durationMs: number): ExecutionResult {
  return {
    success: false,
    decisionId: ctx.decision.decisionId,
    executionId: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: ctx.decision.action,
    module: ctx.module,
    actor: ctx.decision.executive,
    branchId: ctx.branchId,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
    durationMs,
    message,
    eventIds: [],
    errors: errors.length > 0 ? errors : [message],
    warnings: [],
  };
}

function buildPendingApprovalResult(ctx: ExecutionContext, durationMs: number): ExecutionResult {
  return {
    success: false,
    decisionId: ctx.decision.decisionId,
    executionId: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: ctx.decision.action,
    module: ctx.module,
    actor: ctx.decision.executive,
    branchId: ctx.branchId,
    userId: ctx.userId,
    timestamp: new Date().toISOString(),
    durationMs,
    message: `Menunggu persetujuan: ${ctx.approval.reason || `Requires ${ctx.approval.level} approval`}`,
    eventIds: [],
    errors: [],
    warnings: [`Action requires ${ctx.approval.level} approval`],
  };
}

let instance: ExecutionEngine | null = null;

export function getExecutionEngine(): ExecutionEngine {
  if (!instance) {
    instance = new ExecutionEngine();
    instance.initialize();
  }
  return instance;
}

import { db } from "@workspace/db";
import type { ExecutionContext } from "./ExecutionContext";
import type { ExecutionResult } from "./ExecutionResult";
import type { ActionRegistry } from "./ActionRegistry";
import { eventBus } from "../../event-bus/EventBus";

export type TransactionExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function executeTransaction(
  ctx: ExecutionContext,
  registry: ActionRegistry,
): Promise<ExecutionResult> {
  const handler = registry.get(ctx.decision.action);
  if (!handler) {
    return createErrorResult(ctx, `No handler registered for action: ${ctx.decision.action}`);
  }

  try {
    const result = await db.transaction(async (tx) => {
      const execResult = await handler.execute(ctx.decision, ctx);

      if (execResult.success) {
        await publishExecutionEvents(execResult);
      }

      return execResult;
    });

    return result;
  } catch (err: any) {
    return createErrorResult(ctx, err.message || "Transaction failed");
  }
}

async function publishExecutionEvents(result: ExecutionResult): Promise<void> {
  if (!result.events || result.events.length === 0) return;

  for (const event of result.events) {
    try {
      await eventBus.publish(event);
    } catch (err) {
      console.error(`[TransactionPipeline] Failed to publish event ${event.type}:`, err);
    }
  }
}

function createErrorResult(ctx: ExecutionContext, message: string): ExecutionResult {
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
    durationMs: Date.now() - ctx.startedAt,
    message,
    eventIds: [],
    errors: [message],
    warnings: [],
  };
}

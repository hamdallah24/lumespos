import { db, shiftAuditsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import type { ExecutiveDecision } from "../../../erp-execution/types";
import type { ExecutionContext } from "../ExecutionContext";
import type { ExecutionResult } from "../ExecutionResult";
import type { ValidationResult } from "../../../erp-execution/types";
import type { ActionHandler } from "../ActionHandler";
import { eventBus } from "../../../event-bus/EventBus";

class CloseShiftHandler implements ActionHandler {
  readonly action = "close_shift";
  readonly module = "shift";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-shift-${Date.now()}`;
    const branch = Number(branchId) || decision.branchId;

    const [activeShift] = await db
      .select()
      .from(shiftAuditsTable)
      .where(
        and(
          eq(shiftAuditsTable.branchId, branch),
          eq(shiftAuditsTable.status, "active"),
        ),
      )
      .limit(1);

    if (!activeShift) {
      return { success: false, decisionId: decision.decisionId, executionId: execId,
        action: "close_shift", module: "shift", actor: decision.executive,
        branchId: branch, userId, timestamp: new Date().toISOString(), durationMs: 0,
        message: "No active shift found", eventIds: [], errors: ["No active shift"], warnings: [] };
    }

    await db.transaction(async (tx) => {
      await tx.update(shiftAuditsTable)
        .set({ status: "verified", shiftEnd: new Date() })
        .where(eq(shiftAuditsTable.id, activeShift.id));
    });

    const event = {
      id: eventId,
      type: "shift.closed",
      version: 1,
      timestamp: new Date(),
      aggregateId: `shift:${activeShift.id}`,
      aggregateType: "shift",
      data: { shiftId: activeShift.id, branchId: branch, userId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "close_shift", module: "shift", actor: decision.executive,
      branchId: branch, userId, timestamp: new Date().toISOString(), durationMs: 0,
      message: `Shift #${activeShift.id} closed successfully`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

export function registerShiftHandlers(registry: { register: (h: ActionHandler) => void }): void {
  registry.register(new CloseShiftHandler());
}

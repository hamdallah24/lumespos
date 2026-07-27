import { db, expensesTable } from "@workspace/db";
import type { ExecutiveDecision } from "../../../erp-execution/types";
import type { ExecutionContext } from "../ExecutionContext";
import type { ExecutionResult } from "../ExecutionResult";
import type { ValidationResult } from "../../../erp-execution/types";
import type { ActionHandler } from "../ActionHandler";
import { eventBus } from "../../../event-bus/EventBus";

class AddExpenseHandler implements ActionHandler {
  readonly action = "add_expense";
  readonly module = "finance";

  async validate(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ValidationResult> {
    return { valid: true };
  }

  async execute(decision: ExecutiveDecision, _ctx: ExecutionContext): Promise<ExecutionResult> {
    const { description, amount, category, branchId } = decision.parameters;
    const userId = decision.userId;
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const eventId = `evt-expense-${Date.now()}`;

    const [expense] = await db.insert(expensesTable).values({
      description: description as string,
      amount: String(Number(amount)),
      category: (category as string) || "operational",
      userId,
      branchId: Number(branchId) || decision.branchId,
      date: new Date(),
    }).returning({ id: expensesTable.id });

    const event = {
      id: eventId,
      type: "expense.recorded",
      version: 1,
      timestamp: new Date(),
      aggregateId: `expense:${expense.id}`,
      aggregateType: "expense",
      data: { description, amount, category, expenseId: expense.id, userId, branchId: Number(branchId) || decision.branchId } as Record<string, unknown>,
    };
    await eventBus.publish(event);

    return {
      success: true, decisionId: decision.decisionId, executionId: execId,
      action: "add_expense", module: "finance", actor: decision.executive,
      branchId: Number(branchId) || decision.branchId, userId,
      timestamp: new Date().toISOString(), durationMs: 0,
      message: `Expense berhasil dicatat: ${description} — Rp${Number(amount).toLocaleString("id-ID")}`, eventIds: [eventId],
      errors: [], warnings: [],
      events: [event],
    };
  }
}

export function registerExpenseHandlers(registry: { register: (h: ActionHandler) => void }): void {
  registry.register(new AddExpenseHandler());
}

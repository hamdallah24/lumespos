import type { BaseEvent } from "../event-bus";

export interface ExpenseRecordedData {
  branchId: number;
  expenseId: number;
  amount: number;
  category: string | null;
  description: string;
}

export type FinanceEvent =
  | { type: "expense.recorded"; data: ExpenseRecordedData };

export function createExpenseRecordedEvent(
  data: ExpenseRecordedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `expense-recorded-${data.expenseId}`,
    type: "expense.recorded",
    version: 1,
    timestamp: new Date(),
    aggregateId: `expense:${data.expenseId}`,
    aggregateType: "expense",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

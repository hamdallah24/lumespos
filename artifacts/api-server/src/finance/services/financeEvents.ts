import type { BaseEvent } from "../../event-bus";

export interface FinanceTransactionCreatedData {
  branchId: number;
  transactionId: number;
  type: string;
  category: string;
  amount: number;
  description: string;
}

export interface FinanceTransactionUpdatedData {
  branchId: number;
  transactionId: number;
  type: string;
  category: string;
  amount: number;
  description: string;
  updatedBy?: number;
}

export interface FinanceDayClosedData {
  branchId: number;
  snapshotDate: Date;
  openingCash: number;
  closingCash: number;
  income: number;
  expense: number;
  profit: number;
  transactionCount: number;
}

export type FinanceBusinessEvent =
  | { type: "finance.transaction.created"; data: FinanceTransactionCreatedData }
  | { type: "finance.transaction.updated"; data: FinanceTransactionUpdatedData }
  | { type: "finance.day.closed"; data: FinanceDayClosedData };

export function createFinanceTransactionCreatedEvent(
  data: FinanceTransactionCreatedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `finance-transaction-created-${data.transactionId}`,
    type: "finance.transaction.created",
    version: 1,
    timestamp: new Date(),
    aggregateId: `finance_transaction:${data.transactionId}`,
    aggregateType: "finance_transaction",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createFinanceTransactionUpdatedEvent(
  data: FinanceTransactionUpdatedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `finance-transaction-updated-${data.transactionId}`,
    type: "finance.transaction.updated",
    version: 1,
    timestamp: new Date(),
    aggregateId: `finance_transaction:${data.transactionId}`,
    aggregateType: "finance_transaction",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

export function createFinanceDayClosedEvent(
  data: FinanceDayClosedData,
  metadata?: Record<string, unknown>,
): BaseEvent {
  return {
    id: `finance-day-closed-${data.branchId}-${data.snapshotDate.toISOString()}`,
    type: "finance.day.closed",
    version: 1,
    timestamp: new Date(),
    aggregateId: `finance_snapshot:${data.branchId}`,
    aggregateType: "finance_snapshot",
    data: data as unknown as Record<string, unknown>,
    metadata,
  };
}

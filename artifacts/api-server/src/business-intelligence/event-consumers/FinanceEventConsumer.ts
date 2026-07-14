import { EventSubscriber } from "../../event-bus";
import { processShiftOpened, processShiftClosed, calculateExpenseRatio } from "../calculators";
import { metricStore } from "../core";
import type { Metric } from "../core/types";

export function registerFinanceConsumers(): void {
  EventSubscriber.on("expense.recorded", async (event) => {
    const data = event.data as {
      branchId: number;
      expenseId: number;
      amount: number;
      category: string | null;
      description: string;
    };

    const dateKey = new Date().toISOString().slice(0, 10);
    const metricId = `daily-expense-${data.branchId}-${dateKey}`;
    const existing = metricStore.get(metricId);
    const currentTotal = existing?.value ?? 0;

    const metric: Metric = {
      id: metricId,
      domain: "finance",
      name: "daily_expense",
      value: currentTotal + data.amount,
      unit: "rupiah",
      timestamp: new Date(),
      period: "daily",
      tags: { branchId: data.branchId, category: data.category ?? "uncategorized" },
      branchId: data.branchId,
    };
    metricStore.set(metric);

    calculateExpenseRatio(data.branchId, metric.value);
  });

  EventSubscriber.on("shift.opened", async (event) => {
    const data = event.data as {
      shiftId: number;
      branchId: number;
      cashierId: number;
      openingBalance: number;
    };
    processShiftOpened(data);
  });

  EventSubscriber.on("shift.closed", async (event) => {
    const data = event.data as {
      shiftId: number;
      branchId: number;
      status: string;
      expectedBalance: number;
      closingBalance: number;
      difference: number;
    };
    processShiftClosed(data);
  });
}

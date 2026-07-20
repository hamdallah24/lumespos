import { EventSubscriber } from "../../event-bus";
import { createTransaction } from "./transactionEngine";

EventSubscriber.on("order.completed", async (event) => {
  const data = event.data as any;
  if (data.total && data.branchId) {
    await createTransaction({
      branchId: data.branchId,
      type: "income",
      category: "pos_sale",
      description: `Penjualan POS #${data.orderId}`,
      amount: data.total,
      referenceType: "order",
      referenceId: data.orderId,
    });
  }
});

EventSubscriber.on("expense.recorded", async (event) => {
  const data = event.data as any;
  if (data.amount && data.branchId) {
    await createTransaction({
      branchId: data.branchId,
      type: "expense",
      category: "other_expense",
      description: data.description || "Pengeluaran",
      amount: data.amount,
      referenceType: "expense",
      referenceId: data.expenseId,
    });
  }
});

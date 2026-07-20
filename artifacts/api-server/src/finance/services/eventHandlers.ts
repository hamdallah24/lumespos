import { EventSubscriber } from "../../event-bus";
import { createTransaction } from "./transactionEngine";
import { getAccountByCode } from "./chartOfAccounts";

const PAYMENT_METHOD_TO_ACCOUNT: Record<string, string> = {
  cash: "1000",
  tunai: "1000",
  bank: "1100",
  transfer: "1100",
  qris: "1100",
  debit: "1100",
  card: "1100",
  credit: "1100",
  ewallet: "1250",
  gopay: "1250",
  ovo: "1250",
  dana: "1250",
  shopeepay: "1250",
};

async function resolveAccountId(paymentMethod?: string): Promise<number | undefined> {
  if (!paymentMethod) return undefined;
  const code = PAYMENT_METHOD_TO_ACCOUNT[paymentMethod.toLowerCase()];
  if (!code) return undefined;
  const account = await getAccountByCode(code);
  return account?.id;
}

EventSubscriber.on("order.completed", async (event) => {
  try {
    const data = event.data as any;
    if (data.total && data.branchId) {
      const accountId = await resolveAccountId(data.paymentMethod);

      // Income transaction (sale revenue)
      await createTransaction({
        branchId: data.branchId,
        type: "income",
        category: "pos_sale",
        description: `Penjualan POS #${data.orderId}`,
        amount: data.total,
        accountId,
        referenceType: "order",
        referenceId: data.orderId,
        sourceModule: "pos",
      });

      // COGS expense transaction (cost of goods sold)
      const cogs = parseFloat(data.totalCogs);
      if (cogs > 0) {
        await createTransaction({
          branchId: data.branchId,
          type: "expense",
          category: "cogs",
          description: `HPP Penjualan POS #${data.orderId}`,
          amount: cogs,
          referenceType: "order",
          referenceId: data.orderId,
          sourceModule: "pos",
        });
      }
    }
  } catch (err) {
    console.error(`[Finance] Gagal membuat transaksi untuk order ${event.data?.orderId}:`, err);
  }
});

EventSubscriber.on("expense.recorded", async (event) => {
  try {
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
        sourceModule: "expense",
      });
    }
  } catch (err) {
    console.error(`[Finance] Gagal membuat transaksi untuk pengeluaran ${event.data?.expenseId}:`, err);
  }
});

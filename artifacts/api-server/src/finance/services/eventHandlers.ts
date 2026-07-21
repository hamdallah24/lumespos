import { EventSubscriber } from "../../event-bus";
import { db, transactionsTable, journalEntriesTable, ledgerEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createTransaction } from "./transactionEngine";
import { getAccountByCode, getAccountById } from "./chartOfAccounts";
import { AccountingHealthCache } from "./AccountingHealthCache";

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

// Invalidate accounting health cache after any finance event
EventSubscriber.on("finance.transaction.created", async () => {
  AccountingHealthCache.invalidate();
});

EventSubscriber.on("finance.transaction.updated", async () => {
  AccountingHealthCache.invalidate();
});

EventSubscriber.on("expense.recorded", async (event) => {
  try {
    const data = event.data as any;
    if (data.amount && data.branchId) {
      await createTransaction({
        branchId: data.branchId,
        type: "expense",
        category: data.category || "other_expense",
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

EventSubscriber.on("order.voided", async (event) => {
  try {
    const data = event.data as any;
    if (!data.orderId) return;

    // Find finance transactions linked to this order
    const orderTxns = await db
      .select()
      .from(transactionsTable)
      .where(
        eq(transactionsTable.referenceType, "order"),
        eq(transactionsTable.referenceId, data.orderId)
      );

    for (const txn of orderTxns) {
      if (txn.status === "voided") continue;

      await db.update(transactionsTable)
        .set({ status: "voided", notes: (txn.notes ? txn.notes + " | " : "") + "Voided via order void", updatedAt: new Date() })
        .where(eq(transactionsTable.id, txn.id));

      const originalJournals = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.transactionId, txn.id));
      for (const je of originalJournals) {
        const [reversal] = await db.insert(journalEntriesTable).values({
          transactionId: txn.id,
          accountId: je.accountId,
          debit: je.credit,
          credit: je.debit,
          description: "REVERSAL: " + (je.description || txn.description),
        }).returning();

        const [lastLedger] = await db.select()
          .from(ledgerEntriesTable)
          .where(eq(ledgerEntriesTable.accountId, je.accountId))
          .orderBy(sql`${ledgerEntriesTable.id} DESC`)
          .limit(1);
        const prevBalance = lastLedger ? parseFloat(lastLedger.runningBalance) : 0;
        const revDebit = parseFloat(reversal.debit);
        const revCredit = parseFloat(reversal.credit);
        const acct = await getAccountById(je.accountId);
        const isDebitNormal = acct?.normalBalance === "debit";
        const newBalance = isDebitNormal ? prevBalance + revDebit - revCredit : prevBalance - revDebit + revCredit;

        await db.insert(ledgerEntriesTable).values({
          accountId: je.accountId,
          journalEntryId: reversal.id,
          transactionId: txn.id,
          date: new Date(),
          description: "REVERSAL: " + (je.description || txn.description),
          debit: reversal.debit,
          credit: reversal.credit,
          runningBalance: String(newBalance),
        });
      }
    }
  } catch (err) {
    console.error(`[Finance] Gagal void transaksi untuk order ${event.data?.orderId}:`, err);
  }
});

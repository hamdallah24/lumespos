import { db, transactionsTable, journalEntriesTable, ledgerEntriesTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function getAccountIdByCode(code: string): Promise<number | undefined> {
  const [a] = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.code, code));
  return a?.id;
}

export async function consumePurchaseEvent(event: { eventType: string; data: any }): Promise<void> {
  const data = typeof event.data === "object" ? event.data : JSON.parse(event.data || "{}");
  const totalAmount = Math.round((data.totalAmount || 0) * 100) / 100;
  if (totalAmount <= 0) return;

  const [debitCode, creditCode] = event.eventType === "invoice.approved"
    ? ["1400", "2101"]  // Debit Inventory, Credit AP
    : ["1400", "2100"]; // Debit Inventory, Credit AP Accrued

  const debitId = await getAccountIdByCode(debitCode);
  const creditId = await getAccountIdByCode(creditCode);
  if (!debitId || !creditId) return; // Skip if accounts not set up

  const [txn] = await db.insert(transactionsTable).values({
    branchId: data.branchId || 1, type: "expense", category: "raw_material",
    description: `Purchasing: ${event.eventType} #${data.invoiceNumber || data.poId || ""}`,
    amount: String(totalAmount), transactionClass: "ACCOUNTING_TRANSACTION",
    referenceType: event.eventType, sourceModule: "purchasing",
  }).returning({ id: transactionsTable.id });

  const [jeD] = await db.insert(journalEntriesTable).values({
    transactionId: txn.id, accountId: debitId, debit: String(totalAmount), credit: "0",
  }).returning({ id: journalEntriesTable.id });

  const [jeC] = await db.insert(journalEntriesTable).values({
    transactionId: txn.id, accountId: creditId, debit: "0", credit: String(totalAmount),
  }).returning({ id: journalEntriesTable.id });

  await db.insert(ledgerEntriesTable).values([
    { accountId: debitId, journalEntryId: jeD.id, transactionId: txn.id, date: new Date(), debit: String(totalAmount), credit: "0", runningBalance: String(totalAmount) },
    { accountId: creditId, journalEntryId: jeC.id, transactionId: txn.id, date: new Date(), debit: "0", credit: String(totalAmount), runningBalance: String(-totalAmount) },
  ]);
}

import { db, eventStoreTable, transactionsTable, journalEntriesTable, ledgerEntriesTable, accountsTable } from "@workspace/db";
import { eq, sql, and, lt } from "drizzle-orm";

const COGS_ACCOUNT_CODE = "5000";
const LOSS_ACCOUNT_CODE = "5100";

async function getAccountIdByCode(code: string): Promise<number | undefined> {
  const [account] = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.code, code));
  return account?.id;
}

async function findFirstAccountByType(type: string): Promise<number | undefined> {
  const [account] = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.type, type)).limit(1);
  return account?.id;
}

export async function consumeInventoryEvent(event: {
  sequence: number;
  eventType: string;
  data: any;
}): Promise<{ consumed: boolean; error?: string }> {
  try {
    const data = event.data && typeof event.data === "object" ? event.data : (typeof event.data === "string" ? JSON.parse(event.data) : {});

    const totalCost = Math.round((data.totalCost || 0) * 100) / 100;
    if (totalCost <= 0) return { consumed: true };

    const pair = getAccountPair(event.eventType);
    if (!pair) return { consumed: false };

    let debitAccountId = await getAccountIdByCode(pair.debit);
    let creditAccountId = await getAccountIdByCode(pair.credit);

    // Fallback: find first asset account for inventory, first expense for COGS
    if (!debitAccountId) debitAccountId = pair.debitFallback ? await findFirstAccountByType(pair.debitFallback) : undefined;
    if (!creditAccountId) creditAccountId = pair.creditFallback ? await findFirstAccountByType(pair.creditFallback) : undefined;

    if (!debitAccountId || !creditAccountId) {
      return { consumed: false, error: `Accounts missing: debit=${pair.debit}(${debitAccountId}), credit=${pair.credit}(${creditAccountId})` };
    }

    const category = event.eventType === "inventory.sales_consumption" ? "cogs" : "raw_material";

    const [txn] = await db
      .insert(transactionsTable)
      .values({
        branchId: data.branchId,
        type: "expense",
        category,
        description: data.description || `Inventory: ${event.eventType}`,
        amount: String(totalCost),
        transactionClass: "ACCOUNTING_TRANSACTION",
        referenceType: event.eventType,
        referenceId: data.stockCardId,
        sourceModule: "inventory",
      })
      .returning({ id: transactionsTable.id });

    const [jeDebit] = await db
      .insert(journalEntriesTable)
      .values({
        transactionId: txn.id,
        accountId: debitAccountId,
        debit: String(totalCost),
        credit: "0",
        description: `Debit: ${pair.debitName || event.eventType}`,
      })
      .returning({ id: journalEntriesTable.id });

    const [jeCredit] = await db
      .insert(journalEntriesTable)
      .values({
        transactionId: txn.id,
        accountId: creditAccountId,
        debit: "0",
        credit: String(totalCost),
        description: `Credit: ${pair.creditName || event.eventType}`,
      })
      .returning({ id: journalEntriesTable.id });

    const now = new Date();
    await db.insert(ledgerEntriesTable).values([
      {
        accountId: debitAccountId,
        journalEntryId: jeDebit.id,
        transactionId: txn.id,
        date: now,
        description: `Debit: ${pair.debitName || event.eventType}`,
        debit: String(totalCost),
        credit: "0",
        runningBalance: String(totalCost),
      },
      {
        accountId: creditAccountId,
        journalEntryId: jeCredit.id,
        transactionId: txn.id,
        date: now,
        description: `Credit: ${pair.creditName || event.eventType}`,
        debit: "0",
        credit: String(totalCost),
        runningBalance: String(-totalCost),
      },
    ]);

    return { consumed: true };
  } catch (err: any) {
    return { consumed: false, error: err.message };
  }
}

interface AccountPair {
  debit: string;
  credit: string;
  debitName?: string;
  creditName?: string;
  debitFallback?: string;   // account type to fallback to if code not found
  creditFallback?: string;
}

function getAccountPair(eventType: string): AccountPair | null {
  switch (eventType) {
    case "inventory.sales_consumption":
    case "inventory.recipe_consumption":
      return { debit: COGS_ACCOUNT_CODE, credit: "1400", debitName: "COGS", creditName: "Inventory", debitFallback: "expense", creditFallback: "asset" };
    case "inventory.supplier_receipt":
      return { debit: "1400", credit: "6100", debitName: "Inventory", creditName: "Purchases", debitFallback: "asset", creditFallback: "expense" };
    case "inventory.customer_return":
      return { debit: "1400", credit: COGS_ACCOUNT_CODE, debitName: "Inventory", creditName: "COGS Reversal", debitFallback: "asset", creditFallback: "expense" };
    case "inventory.return_to_supplier":
      return { debit: "6100", credit: "1400", debitName: "Purchases", creditName: "Inventory", debitFallback: "expense", creditFallback: "asset" };
    case "inventory.waste_damage":
    case "inventory.expired_goods":
    case "inventory.manual_adjustment":
    case "inventory.stock_opname":
      return { debit: LOSS_ACCOUNT_CODE, credit: "1400", debitName: "Inventory Loss", creditName: "Inventory", debitFallback: "expense", creditFallback: "asset" };
    default:
      return null;
  }
}

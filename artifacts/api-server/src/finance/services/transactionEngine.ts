import { db, transactionsTable, journalEntriesTable, ledgerEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { TransactionInput, JournalLine } from "../types";
import { getAccountByCode } from "./chartOfAccounts";
import { EventPublisher } from "../../event-bus";
import { createFinanceTransactionCreatedEvent } from "./financeEvents";

const CATEGORY_ACCOUNT_MAP: Record<string, { debitAccount: string; creditAccount: string }> = {
  "raw_material": { debitAccount: "1200", creditAccount: "1000" },
  "salary": { debitAccount: "5100", creditAccount: "1000" },
  "utilities": { debitAccount: "5200", creditAccount: "1000" },
  "internet": { debitAccount: "5300", creditAccount: "1000" },
  "rent": { debitAccount: "5400", creditAccount: "1000" },
  "transportation": { debitAccount: "5500", creditAccount: "1000" },
  "marketing": { debitAccount: "5000", creditAccount: "1000" },
  "maintenance": { debitAccount: "5000", creditAccount: "1000" },
  "other_expense": { debitAccount: "5000", creditAccount: "1000" },
  "pos_sale": { debitAccount: "1000", creditAccount: "4000" },
  "depot_sale": { debitAccount: "1000", creditAccount: "4000" },
  "marketplace_sale": { debitAccount: "1100", creditAccount: "4000" },
  "service_revenue": { debitAccount: "1000", creditAccount: "4100" },
};

export async function createTransaction(input: TransactionInput): Promise<{ transaction: any; journalEntries: any[] }> {
  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .insert(transactionsTable)
      .values({
        branchId: input.branchId,
        type: input.type,
        category: input.category,
        description: input.description,
        amount: String(input.amount),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        referenceCode: input.referenceCode,
        sourceModule: input.sourceModule,
        status: "completed",
        notes: input.notes,
        createdBy: input.createdBy,
        updatedBy: input.updatedBy,
      })
      .returning();

    const mapping = CATEGORY_ACCOUNT_MAP[input.category];
    if (!mapping) {
      throw new Error(`Unknown category: ${input.category}`);
    }

    const debitAccount = await getAccountByCode(mapping.debitAccount);
    const creditAccount = await getAccountByCode(mapping.creditAccount);

    if (!debitAccount || !creditAccount) {
      throw new Error(`Account not found for category: ${input.category}`);
    }

    const journalLines: JournalLine[] = [
      { accountId: debitAccount.id, debit: input.amount, credit: 0, description: input.description },
      { accountId: creditAccount.id, debit: 0, credit: input.amount, description: input.description },
    ];

    const journalEntries = [];
    for (const line of journalLines) {
      const [entry] = await tx
        .insert(journalEntriesTable)
        .values({
          transactionId: transaction.id,
          accountId: line.accountId,
          debit: String(line.debit),
          credit: String(line.credit),
          description: line.description,
        })
        .returning();
      journalEntries.push(entry);
    }

    for (const entry of journalEntries) {
      const account = entry.accountId === debitAccount.id ? debitAccount : creditAccount;
      const isDebitNormal = account.normalBalance === "debit";

      const [lastLedger] = await tx
        .select()
        .from(ledgerEntriesTable)
        .where(eq(ledgerEntriesTable.accountId, entry.accountId))
        .orderBy(sql`${ledgerEntriesTable.id} DESC`)
        .limit(1);

      const previousBalance = lastLedger ? parseFloat(lastLedger.runningBalance) : 0;
      const debitAmount = parseFloat(entry.debit);
      const creditAmount = parseFloat(entry.credit);

      let newBalance: number;
      if (isDebitNormal) {
        newBalance = previousBalance + debitAmount - creditAmount;
      } else {
        newBalance = previousBalance - debitAmount + creditAmount;
      }

      await tx.insert(ledgerEntriesTable).values({
        accountId: entry.accountId,
        journalEntryId: entry.id,
        transactionId: transaction.id,
        date: transaction.createdAt,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        runningBalance: String(newBalance),
      });
    }

    return { transaction, journalEntries };
  }).then(async (result) => {
    await EventPublisher.publish(createFinanceTransactionCreatedEvent({
      branchId: input.branchId,
      transactionId: result.transaction.id,
      type: input.type,
      category: input.category,
      amount: input.amount,
      description: input.description,
    }));
    return result;
  });
}

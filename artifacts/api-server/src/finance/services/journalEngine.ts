import { db, journalEntriesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import type { JournalEntry } from "@workspace/db";

export async function getJournalEntriesByTransaction(transactionId: number): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.transactionId, transactionId))
    .orderBy(journalEntriesTable.id);
}

export async function getJournalEntriesByAccount(accountId: number): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.accountId, accountId))
    .orderBy(journalEntriesTable.createdAt);
}

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  return db.select().from(journalEntriesTable).orderBy(journalEntriesTable.createdAt);
}

export async function getJournalEntriesByDateRange(startDate: Date, endDate: Date): Promise<JournalEntry[]> {
  return db
    .select()
    .from(journalEntriesTable)
    .where(
      and(
        sql`${journalEntriesTable.createdAt} >= ${startDate}`,
        sql`${journalEntriesTable.createdAt} <= ${endDate}`
      )
    )
    .orderBy(journalEntriesTable.createdAt);
}

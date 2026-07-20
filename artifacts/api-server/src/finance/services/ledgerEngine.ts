import { db, ledgerEntriesTable, accountsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { LedgerEntry, Account } from "@workspace/db";

export async function getLedgerByAccount(accountId: number): Promise<LedgerEntry[]> {
  return db
    .select()
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.accountId, accountId))
    .orderBy(ledgerEntriesTable.createdAt);
}

export async function getLedgerByAccountWithAccountInfo(accountId: number): Promise<{ entries: LedgerEntry[]; account: Account | undefined }> {
  const account = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId)).then((rows) => rows[0]);
  const entries = await getLedgerByAccount(accountId);
  return { entries, account };
}

export async function getAllLedgerEntries(): Promise<LedgerEntry[]> {
  return db.select().from(ledgerEntriesTable).orderBy(ledgerEntriesTable.createdAt);
}

export async function getAccountBalances(): Promise<Array<{ accountId: number; accountCode: string; accountName: string; accountType: string; normalBalance: string; balance: number }>> {
  const result = await db
    .select({
      accountId: ledgerEntriesTable.accountId,
      accountCode: accountsTable.code,
      accountName: accountsTable.name,
      accountType: accountsTable.type,
      normalBalance: accountsTable.normalBalance,
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .innerJoin(accountsTable, eq(ledgerEntriesTable.accountId, accountsTable.id))
    .groupBy(ledgerEntriesTable.accountId, accountsTable.code, accountsTable.name, accountsTable.type, accountsTable.normalBalance);

  return result.map((row) => {
    const totalDebit = parseFloat(row.totalDebit);
    const totalCredit = parseFloat(row.totalCredit);
    const isDebitNormal = row.normalBalance === "debit";
    const balance = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;

    return {
      accountId: row.accountId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType,
      normalBalance: row.normalBalance,
      balance,
    };
  });
}

import { db, ledgerEntriesTable, accountsTable, transactionsTable } from "@workspace/db";
import { eq, sql, and, inArray, gte, lte } from "drizzle-orm";
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

export async function getAccountBalances(options?: {
  branchIds?: number[];
  startDate?: Date;
  endDate?: Date;
}): Promise<Array<{ accountId: number; accountCode: string; accountName: string; accountType: string; normalBalance: string; balance: number }>> {
  const conditions: any[] = [];

  if (options?.startDate) {
    conditions.push(gte(ledgerEntriesTable.date, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(ledgerEntriesTable.date, options.endDate));
  }

  if (options?.branchIds && options.branchIds.length > 0) {
    conditions.push(inArray(transactionsTable.branchId, options.branchIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const query = db
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
    .innerJoin(accountsTable, eq(ledgerEntriesTable.accountId, accountsTable.id));

  // When branch filtering is needed, join through transactionsTable
  if (options?.branchIds && options.branchIds.length > 0) {
    query.leftJoin(transactionsTable, eq(ledgerEntriesTable.transactionId, transactionsTable.id));
  }

  if (whereClause) {
    query.where(whereClause);
  }

  const result = await query.groupBy(
    ledgerEntriesTable.accountId,
    accountsTable.code,
    accountsTable.name,
    accountsTable.type,
    accountsTable.normalBalance,
  );

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

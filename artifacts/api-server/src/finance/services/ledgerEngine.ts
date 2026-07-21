import { db, ledgerEntriesTable, accountsTable, transactionsTable } from "@workspace/db";
import { eq, sql, and, inArray, gte, lte, desc } from "drizzle-orm";
import type { LedgerEntry, Account } from "@workspace/db";
import type { ReportFilters } from "./accountingEngine";

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
    const totalDebit = Math.round(parseFloat(row.totalDebit) * 100) / 100;
    const totalCredit = Math.round(parseFloat(row.totalCredit) * 100) / 100;
    const isDebitNormal = row.normalBalance === "debit";
    const balance = Math.round((isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit) * 100) / 100;

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

export interface GeneralLedgerRow {
  entryId: number;
  date: Date;
  transactionRef: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  accountCode: string;
  accountName: string;
  accountType: string;
}

export async function getGeneralLedger(filters?: ReportFilters & { accountId?: number }): Promise<GeneralLedgerRow[]> {
  const conditions: any[] = [];

  if (filters?.accountId) {
    conditions.push(eq(ledgerEntriesTable.accountId, filters.accountId));
  }
  if (filters?.startDate) {
    conditions.push(gte(ledgerEntriesTable.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(ledgerEntriesTable.date, filters.endDate));
  }
  if (filters?.branchIds && filters.branchIds.length > 0) {
    conditions.push(inArray(transactionsTable.branchId, filters.branchIds));
  }

  const query = db
    .select({
      entryId: ledgerEntriesTable.id,
      date: ledgerEntriesTable.date,
      description: ledgerEntriesTable.description,
      debit: ledgerEntriesTable.debit,
      credit: ledgerEntriesTable.credit,
      accountId: ledgerEntriesTable.accountId,
      accountCode: accountsTable.code,
      accountName: accountsTable.name,
      accountType: accountsTable.type,
      transactionId: ledgerEntriesTable.transactionId,
    })
    .from(ledgerEntriesTable)
    .innerJoin(accountsTable, eq(ledgerEntriesTable.accountId, accountsTable.id));

  const needsBranchJoin = filters?.branchIds && filters.branchIds.length > 0;
  if (needsBranchJoin) {
    query.innerJoin(transactionsTable, eq(ledgerEntriesTable.transactionId, transactionsTable.id));
  }

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  const result = await query
    .orderBy(ledgerEntriesTable.accountId, ledgerEntriesTable.date, ledgerEntriesTable.id);

  // Compute running balance per account
  const grouped = new Map<number, GeneralLedgerRow[]>();
  for (const row of result) {
    if (!grouped.has(row.accountId)) {
      grouped.set(row.accountId, []);
    }
    const arr = grouped.get(row.accountId)!;
    const prev = arr[arr.length - 1];
    const prevBalance = prev ? prev.runningBalance : 0;
    const isDebitNormal = ["asset", "expense"].includes(row.accountType);
    const delta = isDebitNormal
      ? parseFloat(row.debit) - parseFloat(row.credit)
      : parseFloat(row.credit) - parseFloat(row.debit);
    arr.push({
      entryId: row.entryId,
      date: row.date,
      transactionRef: row.transactionId ? `TXN-${row.transactionId}` : "",
      description: row.description || "",
      debit: parseFloat(row.debit),
      credit: parseFloat(row.credit),
      runningBalance: prevBalance + delta,
      accountCode: row.accountCode,
      accountName: row.accountName,
      accountType: row.accountType,
    });
  }

  // Flatten
  const flat: GeneralLedgerRow[] = [];
  for (const [, rows] of grouped) {
    flat.push(...rows);
  }
  return flat;
}

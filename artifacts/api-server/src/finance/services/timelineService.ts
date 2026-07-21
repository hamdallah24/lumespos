import { db, transactionsTable, accountsTable, journalEntriesTable } from "@workspace/db";
import { eq, sql, and, ilike, desc } from "drizzle-orm";

export interface TimelineFilters {
  branchId?: number;
  search?: string;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface TimelineItem {
  id: number;
  branchId: number;
  type: string;
  category: string;
  description: string;
  amount: number;
  referenceType: string | null;
  referenceId: number | null;
  referenceCode: string | null;
  sourceModule: string | null;
  status: string;
  createdBy: number | null;
  createdAt: Date;
  balanceAfter: number;
  journalGenerated: boolean;
  ledgerUpdated: boolean;
}

export interface TimelineResult {
  items: TimelineItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getTimeline(filters: TimelineFilters): Promise<TimelineResult> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 20, 100);
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (filters.branchId) {
    conditions.push(eq(transactionsTable.branchId, filters.branchId));
  }
  if (filters.search) {
    conditions.push(ilike(transactionsTable.description, `%${filters.search}%`));
  }
  if (filters.category) {
    conditions.push(eq(transactionsTable.category, filters.category));
  }
  if (filters.startDate) {
    conditions.push(sql`${transactionsTable.createdAt} >= ${filters.startDate}`);
  }
  if (filters.endDate) {
    conditions.push(sql`${transactionsTable.createdAt} <= ${filters.endDate}`);
  }
  conditions.push(eq(transactionsTable.transactionClass, "CASH_TRANSACTION"));
  conditions.push(sql`${transactionsTable.status} != 'voided'`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactionsTable)
    .where(whereClause);

  const total = countResult?.count || 0;

  const rows = await db
    .select()
    .from(transactionsTable)
    .where(whereClause)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Batch 1: Get cash account once
  const cashAccount = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, "1000"))
    .then((r) => r[0]);

  // Batch 2: Precompute running balances for cash account at each timeline point
  const balanceMap = new Map<string, number>();
  if (cashAccount && rows.length > 0) {
    const sortedRows = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const firstDate = sortedRows[0].createdAt;
    const lastDate = sortedRows[sortedRows.length - 1].createdAt;

    // Single query: get all cash journal entries up to last timeline date
    const allCashJournals = await db
      .select({
        debit: sql<string>`${journalEntriesTable.debit}`,
        credit: sql<string>`${journalEntriesTable.credit}`,
        createdAt: journalEntriesTable.createdAt,
      })
      .from(journalEntriesTable)
      .where(
        and(
          eq(journalEntriesTable.accountId, cashAccount.id),
          sql`${journalEntriesTable.createdAt} <= ${lastDate}`
        )
      )
      .orderBy(journalEntriesTable.createdAt);

    // Compute running balance at each timeline point
    let runningDebit = 0;
    let runningCredit = 0;
    let entryIdx = 0;

    for (const txn of sortedRows) {
      const txnTime = txn.createdAt.getTime();
      while (entryIdx < allCashJournals.length && allCashJournals[entryIdx].createdAt.getTime() <= txnTime) {
        runningDebit += parseFloat(allCashJournals[entryIdx].debit);
        runningCredit += parseFloat(allCashJournals[entryIdx].credit);
        entryIdx++;
      }
      balanceMap.set(String(txn.id), runningDebit - runningCredit);
    }
  }

  // Batch 3: Get all journal counts in a single query
  const txnIds = rows.map((r) => r.id);
  const journalCountMap = new Map<number, number>();
  if (txnIds.length > 0) {
    const counts = await db
      .select({
        transactionId: journalEntriesTable.transactionId,
        count: sql<number>`count(*)::int`,
      })
      .from(journalEntriesTable)
      .where(sql`${journalEntriesTable.transactionId} IN (${txnIds.join(",")})`)
      .groupBy(journalEntriesTable.transactionId);

    for (const row of counts) {
      journalCountMap.set(row.transactionId, row.count);
    }
  }

  const items: TimelineItem[] = rows.map((row) => {
    const journalCount = journalCountMap.get(row.id) || 0;
    return {
      id: row.id,
      branchId: row.branchId,
      type: row.type,
      category: row.category,
      description: row.description,
      amount: parseFloat(row.amount),
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      referenceCode: row.referenceCode,
      sourceModule: row.sourceModule,
      status: row.status,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      balanceAfter: balanceMap.get(String(row.id)) || 0,
      journalGenerated: journalCount > 0,
      ledgerUpdated: journalCount > 0,
    };
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
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

  const conditions = [];
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

  const items: TimelineItem[] = [];

  for (const row of rows) {
    const cashAccount = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.code, "1000"))
      .then((r) => r[0]);

    let balanceAfter = 0;
    if (cashAccount) {
      const [balanceResult] = await db
        .select({
          totalDebit: sql<string>`COALESCE(SUM(${journalEntriesTable.debit}), 0)`,
          totalCredit: sql<string>`COALESCE(SUM(${journalEntriesTable.credit}), 0)`,
        })
        .from(journalEntriesTable)
        .where(
          and(
            eq(journalEntriesTable.accountId, cashAccount.id),
            sql`${journalEntriesTable.createdAt} <= ${row.createdAt}`
          )
        );

      if (balanceResult) {
        const totalDebit = parseFloat(balanceResult.totalDebit);
        const totalCredit = parseFloat(balanceResult.totalCredit);
        balanceAfter = totalDebit - totalCredit;
      }
    }

    const journalCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(journalEntriesTable)
      .where(eq(journalEntriesTable.transactionId, row.id))
      .then((r) => r[0]?.count || 0);

    items.push({
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
      balanceAfter,
      journalGenerated: journalCount > 0,
      ledgerUpdated: journalCount > 0,
    });
  }

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

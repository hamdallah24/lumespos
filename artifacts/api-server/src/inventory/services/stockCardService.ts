import { db, stockCardTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import type { StockCardEntry } from "@workspace/db";

export type ItemType = "ingredient" | "semi_finished" | "product";

export async function getLastStockCardEntry(
  tx: any,
  branchId: number,
  warehouseId: number,
  itemType: string,
  itemId: number,
): Promise<{ qtyAfter: number; valueAfter: number } | null> {
  const [row] = await tx
    .select({
      qtyAfter: stockCardTable.qtyAfter,
      valueAfter: stockCardTable.valueAfter,
    })
    .from(stockCardTable)
    .where(
      and(
        eq(stockCardTable.branchId, branchId),
        eq(stockCardTable.warehouseId, warehouseId),
        eq(stockCardTable.itemType, itemType),
        eq(stockCardTable.itemId, itemId),
      ),
    )
    .orderBy(desc(stockCardTable.id))
    .limit(1);
  return row ? { qtyAfter: parseFloat(row.qtyAfter), valueAfter: parseFloat(row.valueAfter) } : null;
}

export async function getStockCard(
  branchId: number,
  warehouseId: number,
  itemType: string,
  itemId: number,
  page = 1,
  limit = 50,
): Promise<{ items: StockCardEntry[]; total: number }> {
  const offset = (page - 1) * limit;
  const where = and(
    eq(stockCardTable.branchId, branchId),
    eq(stockCardTable.warehouseId, warehouseId),
    eq(stockCardTable.itemType, itemType),
    eq(stockCardTable.itemId, itemId),
  );

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockCardTable)
    .where(where);

  const items = await db
    .select()
    .from(stockCardTable)
    .where(where)
    .orderBy(desc(stockCardTable.createdAt))
    .limit(limit)
    .offset(offset);

  return { items, total: countResult?.count || 0 };
}

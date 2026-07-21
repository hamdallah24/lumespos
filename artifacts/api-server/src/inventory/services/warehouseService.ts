import { db, warehousesTable, branchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Warehouse } from "@workspace/db";

export async function ensureDefaultWarehouse(branchId: number): Promise<number> {
  const [existing] = await db
    .select({ id: warehousesTable.id })
    .from(warehousesTable)
    .where(eq(warehousesTable.branchId, branchId))
    .limit(1);
  if (existing) return existing.id;

  const [branch] = await db
    .select({ name: branchesTable.name })
    .from(branchesTable)
    .where(eq(branchesTable.id, branchId));
  const branchName = branch?.name || `Branch ${branchId}`;

  const [created] = await db
    .insert(warehousesTable)
    .values({
      branchId,
      code: `WH-${branchId}`,
      name: `${branchName} Warehouse`,
      type: "branch",
    })
    .returning({ id: warehousesTable.id });
  return created.id;
}

export async function getAllWarehouses(branchId?: number): Promise<Warehouse[]> {
  if (branchId) {
    return db.select().from(warehousesTable).where(eq(warehousesTable.branchId, branchId));
  }
  return db.select().from(warehousesTable);
}

export async function getWarehouseById(id: number): Promise<Warehouse | undefined> {
  const [row] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, id));
  return row;
}

import { db, suppliersTable, purchaseEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Supplier, InsertSupplier } from "@workspace/db";

export async function createSupplier(data: InsertSupplier): Promise<Supplier> {
  const code = `SUP-${String(Date.now()).slice(-6)}`;
  const [supplier] = await db.insert(suppliersTable).values({ ...data, code }).returning();
  await db.insert(purchaseEventsTable).values({
    eventType: "supplier.created", aggregateType: "supplier", aggregateId: supplier.id,
    data: { name: supplier.name, code: supplier.code },
  });
  return supplier;
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  return db.select().from(suppliersTable).where(eq(suppliersTable.isActive, true));
}

export async function getSupplierById(id: number): Promise<Supplier | undefined> {
  const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  return s;
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
  const [s] = await db.update(suppliersTable).set(data).where(eq(suppliersTable.id, id)).returning();
  return s;
}

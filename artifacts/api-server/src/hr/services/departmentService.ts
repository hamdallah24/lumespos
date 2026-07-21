import { db, departmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Department, InsertDepartment } from "@workspace/db";

export async function createDepartment(data: InsertDepartment): Promise<Department> {
  const [dept] = await db.insert(departmentsTable).values(data).returning();
  return dept;
}

export async function getAllDepartments(branchId?: number): Promise<Department[]> {
  if (branchId) return db.select().from(departmentsTable).where(eq(departmentsTable.branchId, branchId));
  return db.select().from(departmentsTable);
}

export async function getDepartmentById(id: number): Promise<Department | undefined> {
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
  return dept;
}

export async function updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department | undefined> {
  const [dept] = await db.update(departmentsTable).set(data).where(eq(departmentsTable.id, id)).returning();
  return dept;
}

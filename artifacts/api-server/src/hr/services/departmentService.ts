import { db, departmentsTable, employeesTable, positionsTable } from "@workspace/db";
import { eq, and, sql, asc } from "drizzle-orm";
import type { Department, InsertDepartment } from "@workspace/db";

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
  managerName?: string | null;
  positionCount?: number;
  employeeCount?: number;
}

export async function createDepartment(data: InsertDepartment): Promise<Department> {
  const maxOrder = await db.select({ max: sql<number>`coalesce(max(${departmentsTable.sortOrder}), 0)` })
    .from(departmentsTable)
    .where(eq(departmentsTable.branchId, data.branchId));
  const sortOrder = (maxOrder[0]?.max ?? 0) + 1;
  const [dept] = await db.insert(departmentsTable).values({ ...data, sortOrder }).returning();
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

export async function updateDepartment(id: number, data: Partial<InsertDepartment & { sortOrder: number }>): Promise<Department | undefined> {
  const [dept] = await db.update(departmentsTable).set(data).where(eq(departmentsTable.id, id)).returning();
  return dept;
}

export async function deleteDepartment(id: number): Promise<{ reassignTo: number | null }> {
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
  if (!dept) throw new Error("Department not found");

  const childCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(departmentsTable).where(eq(departmentsTable.parentId, id));
  if ((childCount[0]?.count ?? 0) > 0) {
    throw new Error("Cannot delete department with sub-departments. Reassign or remove children first.");
  }

  const empCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable).where(eq(employeesTable.departmentId, id));
  if ((empCount[0]?.count ?? 0) > 0) {
    throw new Error("Cannot delete department with employees. Reassign employees first.");
  }

  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  return { reassignTo: null };
}

export async function getDepartmentTree(branchId?: number): Promise<DepartmentTreeNode[]> {
  const filter = branchId ? eq(departmentsTable.branchId, branchId) : undefined;
  const where = filter ? and(eq(departmentsTable.isActive, true), filter) : eq(departmentsTable.isActive, true);

  const depts = await db.select({
    id: departmentsTable.id,
    code: departmentsTable.code,
    name: departmentsTable.name,
    description: departmentsTable.description,
    parentId: departmentsTable.parentId,
    headPositionId: departmentsTable.headPositionId,
    managerEmployeeId: departmentsTable.managerEmployeeId,
    branchId: departmentsTable.branchId,
    sortOrder: departmentsTable.sortOrder,
    isActive: departmentsTable.isActive,
    createdAt: departmentsTable.createdAt,
    managerName: employeesTable.fullName,
  }).from(departmentsTable)
    .leftJoin(employeesTable, eq(departmentsTable.managerEmployeeId, employeesTable.id))
    .where(where)
    .orderBy(asc(departmentsTable.sortOrder), asc(departmentsTable.name));

  const posCounts = await db.select({
    departmentId: positionsTable.departmentId,
    count: sql<number>`count(*)::int`,
  }).from(positionsTable)
    .groupBy(positionsTable.departmentId);

  const empCounts = await db.select({
    departmentId: employeesTable.departmentId,
    count: sql<number>`count(*)::int`,
  }).from(employeesTable)
    .groupBy(employeesTable.departmentId);

  const posMap = new Map<number, number>();
  for (const p of posCounts) if (p.departmentId != null) posMap.set(p.departmentId, p.count);
  const empMap = new Map<number, number>();
  for (const e of empCounts) if (e.departmentId != null) empMap.set(e.departmentId, e.count);

  const nodeMap = new Map<number, DepartmentTreeNode>();
  for (const d of depts) {
    nodeMap.set(d.id, {
      ...d, children: [], positionCount: posMap.get(d.id) ?? 0, employeeCount: empMap.get(d.id) ?? 0,
    });
  }

  const roots: DepartmentTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function moveDepartment(id: number, newParentId: number | null): Promise<Department> {
  const [dept] = await db.update(departmentsTable)
    .set({ parentId: newParentId })
    .where(eq(departmentsTable.id, id))
    .returning();
  return dept;
}

export async function reorderDepartments(ids: number[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await db.update(departmentsTable).set({ sortOrder: i + 1 }).where(eq(departmentsTable.id, ids[i]));
  }
}

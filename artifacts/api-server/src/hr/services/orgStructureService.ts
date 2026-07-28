import { db, employeesTable, departmentsTable, positionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export interface OrgNode {
  id: number; name: string; type: "department" | "employee";
  title?: string; children: OrgNode[]; managerId?: number | null;
}

export async function getOrgTree(branchId?: number): Promise<OrgNode[]> {
  const deptFilter = branchId ? eq(departmentsTable.branchId, branchId) : undefined;
  const empFilter = branchId ? eq(employeesTable.branchId, branchId) : undefined;

  const deptRows = await db.select({
    id: departmentsTable.id,
    name: departmentsTable.name,
    parentId: departmentsTable.parentId,
    headPositionId: departmentsTable.headPositionId,
  }).from(departmentsTable)
    .where(deptFilter ? and(eq(departmentsTable.isActive, true), deptFilter) : eq(departmentsTable.isActive, true))
    .orderBy(departmentsTable.name);

  const empRows = await db.select({
    id: employeesTable.id,
    fullName: employeesTable.fullName,
    departmentId: employeesTable.departmentId,
    managerId: employeesTable.managerId,
    title: positionsTable.title,
  }).from(employeesTable)
    .leftJoin(positionsTable, eq(employeesTable.positionId, positionsTable.id))
    .where(empFilter
      ? and(sql`${employeesTable.status} IN ('active','probation')`, empFilter)
      : sql`${employeesTable.status} IN ('active','probation')`)
    .orderBy(employeesTable.fullName);

  const deptMap = new Map<number, any>();
  for (const d of deptRows) deptMap.set(d.id, { ...d, children: [] as any[] });
  const empMap = new Map<number, any>();
  for (const e of empRows) empMap.set(e.id, { ...e, children: [] as any[] });

  const topEmps: OrgNode[] = [];
  for (const e of empMap.values()) {
    if (e.managerId && empMap.has(e.managerId)) empMap.get(e.managerId).children.push(e);
    else topEmps.push(e);
  }

  const topDepts: OrgNode[] = [];
  for (const d of deptMap.values()) {
    if (d.parentId && deptMap.has(d.parentId)) deptMap.get(d.parentId).children.push(d);
    else topDepts.push(d);
  }

  for (const d of deptMap.values()) {
    for (const e of empMap.values()) {
      if (e.departmentId === d.id) d.children.push(e);
    }
  }

  return topDepts.map((d: any) => ({
    id: d.id, name: d.name, type: "department" as const, children: d.children || [],
  }));
}

export async function getManagerChain(employeeId: number): Promise<any[]> {
  const chain: any[] = [];
  let currentId: number | null = employeeId;
  for (let i = 0; i < 20 && currentId; i++) {
    const [emp] = await db.select({
      id: employeesTable.id, fullName: employeesTable.fullName,
      managerId: employeesTable.managerId, title: positionsTable.title,
    }).from(employeesTable).leftJoin(positionsTable, eq(employeesTable.positionId, positionsTable.id))
      .where(eq(employeesTable.id, currentId));
    if (!emp) break;
    chain.push(emp);
    currentId = emp.managerId;
  }
  return chain;
}

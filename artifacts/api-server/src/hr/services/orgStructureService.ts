import { db, employeesTable, departmentsTable, positionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface OrgNode {
  id: number; name: string; type: "department" | "employee";
  title?: string; children: OrgNode[]; managerId?: number | null;
}

export async function getOrgTree(branchId?: number): Promise<OrgNode[]> {
  const w = branchId ? sql`AND d.branch_id = ${branchId}` : sql``;
  const depts = await db.execute(sql`
    SELECT d.id, d.name, d.parent_id, d.head_position_id
    FROM departments d WHERE d.is_active = true ${w} ORDER BY d.name
  `);
  const empRows = await db.execute(sql`
    SELECT e.id, e.full_name, e.department_id, e.manager_id, p.title
    FROM employees e LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.status IN ('active','probation') ${w.replace('d.branch_id','e.branch_id')} ORDER BY e.full_name
  `);

  const deptMap = new Map<number, any>();
  for (const d of depts.rows || []) deptMap.set(d.id, { ...d, children: [] });
  const empMap = new Map<number, any>();
  for (const e of empRows.rows || []) empMap.set(e.id, { ...e, children: [] });

  // Build employee tree by manager
  const topEmps: OrgNode[] = [];
  for (const e of empMap.values()) {
    if (e.manager_id && empMap.has(e.manager_id)) empMap.get(e.manager_id).children.push(e);
    else topEmps.push(e);
  }

  // Build department tree
  const topDepts: OrgNode[] = [];
  for (const d of deptMap.values()) {
    if (d.parent_id && deptMap.has(d.parent_id)) deptMap.get(d.parent_id).children.push(d);
    else topDepts.push(d);
  }

  // Assign employees to departments
  for (const d of deptMap.values()) {
    for (const e of empMap.values()) {
      if (e.department_id === d.id) d.children.push(e);
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

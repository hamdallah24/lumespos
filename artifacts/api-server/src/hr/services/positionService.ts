import { db, positionsTable, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and, sql, asc, count } from "drizzle-orm";
import type { Position, InsertPosition } from "@workspace/db";

export interface PositionTreeNode extends Position {
  children: PositionTreeNode[];
  employeeCount: number;
  departmentName: string | null;
}

export interface PositionStats {
  positionId: number; title: string; employeeCount: number;
  departmentCount: number; vacantCount: number; avgTenureMonths: number;
}

export interface PositionSuggestion {
  type: "create_position" | "missing_manager" | "level_gap" | "overloaded";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  departmentId?: number;
  departmentName?: string;
  suggestedLevel?: string;
}

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern", "freelance"];
const POSITION_STATUSES = ["draft", "active", "deprecated", "archived"];

export async function createPosition(data: InsertPosition): Promise<Position> {
  const maxOrder = await db.select({ max: sql<number>`coalesce(max(${positionsTable.sortOrder}), 0)` })
    .from(positionsTable);
  const sortOrder = (maxOrder[0]?.max ?? 0) + 1;
  const [pos] = await db.insert(positionsTable).values({ ...data, sortOrder }).returning();
  return pos;
}

export async function getAllPositions(): Promise<Position[]> {
  return db.select().from(positionsTable).orderBy(asc(positionsTable.sortOrder), asc(positionsTable.title));
}

export async function getPositionById(id: number): Promise<Position | undefined> {
  const [pos] = await db.select().from(positionsTable).where(eq(positionsTable.id, id));
  return pos;
}

export async function updatePosition(id: number, data: Partial<InsertPosition & { sortOrder: number }>): Promise<Position | undefined> {
  const [pos] = await db.update(positionsTable).set(data).where(eq(positionsTable.id, id)).returning();
  return pos;
}

export async function deletePosition(id: number): Promise<void> {
  const [pos] = await db.select().from(positionsTable).where(eq(positionsTable.id, id));
  if (!pos) throw new Error("Position not found");

  const empCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable).where(eq(employeesTable.positionId, id));
  if ((empCount[0]?.count ?? 0) > 0) {
    throw new Error(`Cannot delete: ${empCount[0].count} employee(s) hold this position. Reassign them first.`);
  }

  const childCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(positionsTable).where(eq(positionsTable.reportsToPositionId, id));
  if ((childCount[0]?.count ?? 0) > 0) {
    throw new Error(`Cannot delete: ${childCount[0].count} position(s) report to this one. Reassign reports first.`);
  }

  const deptHead = await db.select({ count: sql<number>`count(*)::int` })
    .from(departmentsTable).where(eq(departmentsTable.headPositionId, id));
  if ((deptHead[0]?.count ?? 0) > 0) {
    throw new Error(`Cannot delete: ${deptHead[0].count} department(s) use this as head position.`);
  }

  await db.delete(positionsTable).where(eq(positionsTable.id, id));
}

export async function getPositionTree(): Promise<PositionTreeNode[]> {
  const posWithDept = await db.select({
    id: positionsTable.id, title: positionsTable.title, departmentId: positionsTable.departmentId,
    grade: positionsTable.grade, level: positionsTable.level, reportsToPositionId: positionsTable.reportsToPositionId,
    baseSalary: positionsTable.baseSalary, responsibilities: positionsTable.responsibilities,
    requiredSkills: positionsTable.requiredSkills, minExperience: positionsTable.minExperience,
    employmentType: positionsTable.employmentType, sortOrder: positionsTable.sortOrder,
    isActive: positionsTable.isActive, createdAt: positionsTable.createdAt,
    departmentName: departmentsTable.name,
  }).from(positionsTable)
    .leftJoin(departmentsTable, eq(positionsTable.departmentId, departmentsTable.id))
    .orderBy(asc(positionsTable.sortOrder), asc(positionsTable.title));

  const empCounts = await db.select({
    positionId: employeesTable.positionId, count: sql<number>`count(*)::int`,
  }).from(employeesTable).groupBy(employeesTable.positionId);

  const empMap = new Map<number, number>();
  for (const e of empCounts) if (e.positionId != null) empMap.set(e.positionId, e.count);

  const nodeMap = new Map<number, PositionTreeNode>();
  for (const p of posWithDept) {
    nodeMap.set(p.id, { ...p, children: [], employeeCount: empMap.get(p.id) ?? 0 });
  }

  const roots: PositionTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.reportsToPositionId && nodeMap.has(node.reportsToPositionId)) {
      nodeMap.get(node.reportsToPositionId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getPositionStats(): Promise<PositionStats[]> {
  const positions = await db.select().from(positionsTable).where(eq(positionsTable.isActive, true));

  const stats: PositionStats[] = [];
  for (const pos of positions) {
    const empResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(employeesTable).where(eq(employeesTable.positionId, pos.id));
    const employeeCount = empResult[0]?.count ?? 0;

    const deptResult = await db.select({ count: sql<number>`count(distinct ${employeesTable.departmentId})::int` })
      .from(employeesTable).where(eq(employeesTable.positionId, pos.id));
    const departmentCount = deptResult[0]?.count ?? 0;

    const vacantCount = Math.max(0, employeeCount === 0 ? 1 : 0);

    const tenureResult = await db.select({
      avg: sql<number>`coalesce(avg(EXTRACT(EPOCH FROM (COALESCE(${employeesTable.resignationDate}, CURRENT_DATE) - ${employeesTable.hireDate})) / 2592000), 0)::int`,
    }).from(employeesTable).where(eq(employeesTable.positionId, pos.id));
    const avgTenureMonths = tenureResult[0]?.avg ?? 0;

    stats.push({ positionId: pos.id, title: pos.title, employeeCount, departmentCount, vacantCount, avgTenureMonths });
  }
  return stats;
}

export async function getPositionDependencies(id: number): Promise<{ employees: number; childPositions: number; deptHeads: number }> {
  const empResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable).where(eq(employeesTable.positionId, id));
  const childResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(positionsTable).where(eq(positionsTable.reportsToPositionId, id));
  const deptResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(departmentsTable).where(eq(departmentsTable.headPositionId, id));
  return {
    employees: empResult[0]?.count ?? 0,
    childPositions: childResult[0]?.count ?? 0,
    deptHeads: deptResult[0]?.count ?? 0,
  };
}

export async function getPositionSuggestions(): Promise<PositionSuggestion[]> {
  const suggestions: PositionSuggestion[] = [];

  const depts = await db.select().from(departmentsTable).where(eq(departmentsTable.isActive, true));

  for (const dept of depts) {
    const deptEmps = await db.select({
      positionId: employeesTable.positionId, count: sql<number>`count(*)::int`,
    }).from(employeesTable)
      .where(eq(employeesTable.departmentId, dept.id))
      .groupBy(employeesTable.positionId);

    const totalEmps = deptEmps.reduce((sum, e) => sum + e.count, 0);
    const uniquePositions = deptEmps.length;

    if (totalEmps >= 5 && uniquePositions <= 1) {
      const posIds = deptEmps.map(e => e.positionId).filter(Boolean);
      let highestLevel = "";
      for (const pid of posIds) {
        const [pos] = await db.select({ level: positionsTable.level }).from(positionsTable)
          .where(eq(positionsTable.id, pid!));
        if (pos?.level) highestLevel = pos.level;
      }
      suggestions.push({
        type: "create_position", severity: "warning",
        title: `${dept.name}: Add Supervisor`,
        detail: `${totalEmps} employees with ${uniquePositions} position type. Consider adding a supervisor role.`,
        departmentId: dept.id, departmentName: dept.name, suggestedLevel: "supervisor",
      });
    }

    if (!dept.managerEmployeeId && totalEmps > 0) {
      suggestions.push({
        type: "missing_manager", severity: "critical",
        title: `${dept.name}: No Department Manager`,
        detail: `Department has ${totalEmps} employee(s) but no assigned manager.`,
        departmentId: dept.id, departmentName: dept.name,
      });
    }

    if (totalEmps >= 10) {
      const hasManagerLevel = deptEmps.some(async (e) => {
        if (!e.positionId) return false;
        const [pos] = await db.select({ level: positionsTable.level }).from(positionsTable)
          .where(eq(positionsTable.id, e.positionId));
        return pos?.level === "manager" || pos?.level === "supervisor";
      });
      if (!hasManagerLevel) {
        suggestions.push({
          type: "overloaded", severity: "warning",
          title: `${dept.name}: Overloaded Without Management`,
          detail: `${totalEmps} employees with no managerial oversight.`,
          departmentId: dept.id, departmentName: dept.name,
        });
      }
    }
  }

  const levels = ["executive", "director", "manager", "supervisor", "staff", "operator", "intern"];
  const positions = await db.select().from(positionsTable).where(eq(positionsTable.isActive, true));
  for (const level of levels) {
    const countAtLevel = positions.filter(p => p.level === level).length;
    if (countAtLevel === 0) {
      const hasAbove = levels.indexOf(level) > 0 && positions.some(p => p.level === levels[levels.indexOf(level) - 1]);
      const hasBelow = levels.indexOf(level) < levels.length - 1 && positions.some(p => p.level === levels[levels.indexOf(level) + 1]);
      if (hasAbove && hasBelow) {
        suggestions.push({
          type: "level_gap", severity: "info",
          title: `Missing "${level}" level positions`,
          detail: `There are positions above and below "${level}" but none at this level.`,
          suggestedLevel: level,
        });
      }
    }
  }

  return suggestions;
}

export { EMPLOYMENT_TYPES, POSITION_STATUSES };

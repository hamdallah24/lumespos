import { db, positionsTable, employeesTable, departmentsTable } from "@workspace/db";
import { eq, and, sql, asc, count } from "drizzle-orm";

export interface OrgChartNode {
  id: number; name: string; title: string; level: string | null;
  departmentName: string | null; employeeCount: number;
  spanOfControl: number; vacantPositions: number;
  avgTenureMonths: number; status: string;
  reportsTo: number | null; children: OrgChartNode[];
  competencyTags: string | null; grade: string | null;
}

export interface OrgAnalytics {
  totalDepartments: number; totalPositions: number; totalEmployees: number;
  vacantPositions: number; avgSpanOfControl: number; hierarchyDepth: number;
  departments: { name: string; employeeCount: number; positionCount: number; vacantCount: number }[];
  levelDistribution: { level: string; count: number }[];
}

export interface OrgSuggestion {
  type: string; severity: "info" | "warning" | "critical";
  title: string; detail: string;
}

const LEVEL_ORDER: Record<string, number> = {
  executive: 1, director: 2, manager: 3, supervisor: 4, staff: 5, operator: 6, intern: 7,
};

export async function getOrgChart(): Promise<OrgChartNode[]> {
  const positions = await db.select({
    id: positionsTable.id, title: positionsTable.title, level: positionsTable.level,
    departmentId: positionsTable.departmentId, grade: positionsTable.grade,
    reportsToPositionId: positionsTable.reportsToPositionId, status: positionsTable.status,
    competencyTags: positionsTable.competencyTags, sortOrder: positionsTable.sortOrder,
    departmentName: departmentsTable.name,
  }).from(positionsTable)
    .leftJoin(departmentsTable, eq(positionsTable.departmentId, departmentsTable.id))
    .where(eq(positionsTable.status, "active"))
    .orderBy(asc(positionsTable.sortOrder), asc(positionsTable.title));

  const empCounts = await db.select({
    positionId: employeesTable.positionId, count: sql<number>`count(*)::int`,
  }).from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.positionId);

  const empMap = new Map<number, number>();
  for (const e of empCounts) if (e.positionId != null) empMap.set(e.positionId, e.count);

  const deptEmpCounts = await db.select({
    departmentId: employeesTable.departmentId, count: sql<number>`count(*)::int`,
  }).from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.departmentId);

  const deptEmpMap = new Map<number, number>();
  for (const e of deptEmpCounts) if (e.departmentId != null) deptEmpMap.set(e.departmentId, e.count);

  const nodeMap = new Map<number, OrgChartNode>();
  for (const p of positions) {
    const empCount = empMap.get(p.id) ?? 0;
    const directReports = positions.filter(x => x.reportsToPositionId === p.id).length;
    nodeMap.set(p.id, {
      id: p.id, name: p.title, title: p.title, level: p.level,
      departmentName: p.departmentName, employeeCount: empCount,
      spanOfControl: directReports, vacantPositions: 0,
      avgTenureMonths: 0, status: p.status,
      reportsTo: p.reportsToPositionId, children: [],
      competencyTags: p.competencyTags, grade: p.grade,
    });
  }

  for (const node of nodeMap.values()) {
    if (node.reportsTo && nodeMap.has(node.reportsTo)) {
      nodeMap.get(node.reportsTo)!.children.push(node);
    }
  }

  for (const node of nodeMap.values()) {
    const tenureResult = await db.select({
      avg: sql<number>`coalesce(avg(EXTRACT(EPOCH FROM (COALESCE(${employeesTable.resignationDate}, CURRENT_DATE) - ${employeesTable.hireDate})) / 2592000), 0)::int`,
    }).from(employeesTable).where(eq(employeesTable.positionId, node.id));
    node.avgTenureMonths = tenureResult[0]?.avg ?? 0;
  }

  const roots: OrgChartNode[] = [];
  for (const node of nodeMap.values()) {
    if (!node.reportsTo || !nodeMap.has(node.reportsTo)) {
      roots.push(node);
    }
  }

  return roots;
}

export async function getOrgAnalytics(): Promise<OrgAnalytics> {
  const depts = await db.select().from(departmentsTable).where(eq(departmentsTable.isActive, true));
  const positions = await db.select().from(positionsTable).where(eq(positionsTable.status, "active"));

  const empCounts = await db.select({
    departmentId: employeesTable.departmentId, count: sql<number>`count(*)::int`,
  }).from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.departmentId);

  const deptEmpMap = new Map<number, number>();
  for (const e of empCounts) if (e.departmentId != null) deptEmpMap.set(e.departmentId, e.count);

  const deptStats = await Promise.all(depts.map(async d => {
    const posCount = positions.filter(p => p.departmentId === d.id).length;
    const empCount = deptEmpMap.get(d.id) ?? 0;
    const filledPositions = await db.select({ count: sql<number>`count(distinct ${employeesTable.positionId})::int` })
      .from(employeesTable)
      .where(and(eq(employeesTable.departmentId, d.id), eq(employeesTable.status, "active")));
    const filled = filledPositions[0]?.count ?? 0;
    return { name: d.name, employeeCount: empCount, positionCount: posCount, vacantCount: Math.max(0, posCount - filled) };
  }));

  const totalEmps = deptStats.reduce((s, d) => s + d.employeeCount, 0);
  const topLevel = positions.filter(p => !p.reportsToPositionId);
  const avgSpan = topLevel.length > 0 ? Math.round(totalEmps / topLevel.length) : 0;

  let maxDepth = 0;
  const calcDepth = (posId: number, depth: number): number => {
    const children = positions.filter(p => p.reportsToPositionId === posId);
    if (children.length === 0) return depth;
    return Math.max(...children.map(c => calcDepth(c.id, depth + 1)));
  };
  for (const root of topLevel) {
    maxDepth = Math.max(maxDepth, calcDepth(root.id, 1));
  }

  const levelDist: Record<string, number> = {};
  for (const p of positions) {
    const l = p.level || "unspecified";
    levelDist[l] = (levelDist[l] || 0) + 1;
  }

  return {
    totalDepartments: depts.length,
    totalPositions: positions.length,
    totalEmployees: totalEmps,
    vacantPositions: deptStats.reduce((s, d) => s + d.vacantCount, 0),
    avgSpanOfControl: avgSpan,
    hierarchyDepth: maxDepth,
    departments: deptStats,
    levelDistribution: Object.entries(levelDist).map(([level, count]) => ({ level, count })),
  };
}

export async function getOrgSuggestions(): Promise<OrgSuggestion[]> {
  const suggestions: OrgSuggestion[] = [];
  const analytics = await getOrgAnalytics();

  if (analytics.hierarchyDepth <= 2 && analytics.totalEmployees > 20) {
    suggestions.push({
      type: "too_flat", severity: "warning",
      title: "Organization Too Flat",
      detail: `Only ${analytics.hierarchyDepth} levels for ${analytics.totalEmployees} employees. Consider adding a supervisory layer.`,
    });
  }

  if (analytics.avgSpanOfControl > 15) {
    suggestions.push({
      type: "wide_span", severity: "warning",
      title: "Wide Span of Control",
      detail: `Average span of ${analytics.avgSpanOfControl} direct reports. Recommended: 5-10.`,
    });
  }

  for (const dept of analytics.departments) {
    if (dept.employeeCount >= 10 && dept.vacantCount === 0) {
      suggestions.push({
        type: "no_growth", severity: "info",
        title: `${dept.name}: Consider Adding Positions`,
        detail: `${dept.employeeCount} employees with no vacant positions. May need growth planning.`,
      });
    }
    if (dept.employeeCount > 0 && dept.positionCount === 0) {
      suggestions.push({
        type: "unstructured", severity: "critical",
        title: `${dept.name}: Employees Without Positions`,
        detail: `${dept.employeeCount} employees but no defined positions. Create position structure.`,
      });
    }
    if (dept.vacantCount > 0) {
      suggestions.push({
        type: "vacancy", severity: "info",
        title: `${dept.name}: ${dept.vacantCount} Vacant Position(s)`,
        detail: `Department has unfilled positions that may need recruitment.`,
      });
    }
  }

  const depts = await db.select().from(departmentsTable).where(eq(departmentsTable.isActive, true));
  for (const dept of depts) {
    if (!dept.managerEmployeeId) {
      const empCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(employeesTable)
        .where(and(eq(employeesTable.departmentId, dept.id), eq(employeesTable.status, "active")));
      if ((empCount[0]?.count ?? 0) > 0) {
        suggestions.push({
          type: "no_manager", severity: "critical",
          title: `${dept.name}: No Department Manager`,
          detail: `Department has ${empCount[0].count} active employee(s) but no assigned manager.`,
        });
      }
    }
  }

  return suggestions;
}

export async function getManagerChain(employeeId: number): Promise<any[]> {
  const chain: any[] = [];
  let currentId: number | null = employeeId;
  for (let i = 0; i < 20 && currentId; i++) {
    const [emp] = await db.select({
      id: employeesTable.id, fullName: employeesTable.fullName,
      managerId: employeesTable.managerId, positionId: employeesTable.positionId,
      departmentId: employeesTable.departmentId,
    }).from(employeesTable).where(eq(employeesTable.id, currentId));
    if (!emp) break;

    let positionTitle: string | null = null;
    let level: string | null = null;
    if (emp.positionId) {
      const [pos] = await db.select({ title: positionsTable.title, level: positionsTable.level })
        .from(positionsTable).where(eq(positionsTable.id, emp.positionId));
      if (pos) { positionTitle = pos.title; level = pos.level; }
    }

    let departmentName: string | null = null;
    if (emp.departmentId) {
      const [dept] = await db.select({ name: departmentsTable.name })
        .from(departmentsTable).where(eq(departmentsTable.id, emp.departmentId));
      if (dept) departmentName = dept.name;
    }

    chain.push({ ...emp, positionTitle, level, departmentName });
    currentId = emp.managerId;
  }
  return chain;
}

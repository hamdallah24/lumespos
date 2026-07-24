import { db, employeesTable, departmentsTable, positionsTable, attendanceRecordsTable, leaveRequestsTable, candidatesTable } from "@workspace/db";
import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";

/* ── Headcount Trend ── */
export async function getHeadcountTrend(months: number = 12) {
  const rows = await db.select({
    month: sql<string>`to_char(${employeesTable.hireDate}, 'YYYY-MM')`,
    count: sql<number>`count(*)::int`,
  })
    .from(employeesTable)
    .where(sql`${employeesTable.hireDate} IS NOT NULL AND ${employeesTable.hireDate} >= NOW() - INTERVAL '${sql.raw(String(months))} months'`)
    .groupBy(sql`to_char(${employeesTable.hireDate}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${employeesTable.hireDate}, 'YYYY-MM')`);

  return rows;
}

/* ── Turnover / Attrition ── */
export async function getTurnoverStats(year?: string) {
  const y = year || String(new Date().getFullYear());
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;

  const [hired] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(employeesTable).where(and(
    gte(employeesTable.hireDate, yearStart),
    lte(employeesTable.hireDate, yearEnd)
  ));

  const [resigned] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(employeesTable).where(and(
    eq(employeesTable.status, "inactive"),
    sql`${employeesTable.updatedAt} >= ${yearStart} AND ${employeesTable.updatedAt} <= ${yearEnd}`
  ));

  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable);
  const [totalStart] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(sql`${employeesTable.hireDate} < ${yearStart}`);

  const avgHeadcount = ((totalStart?.count || 0) + (total?.count || 0)) / 2;
  const turnoverRate = avgHeadcount > 0 ? Math.round(((resigned?.count || 0) / avgHeadcount) * 10000) / 100 : 0;

  return {
    hired: hired?.count || 0,
    resigned: resigned?.count || 0,
    totalHeadcount: total?.count || 0,
    startHeadcount: totalStart?.count || 0,
    turnoverRate,
  };
}

/* ── Tenure Distribution ── */
export async function getTenureDistribution() {
  const rows = await db.select({
    tenure: sql<string>`
      CASE
        WHEN ${employeesTable.hireDate} IS NULL THEN 'Unknown'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '6 months' THEN '< 6 bulan'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '1 year' THEN '6-12 bulan'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '2 years' THEN '1-2 tahun'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '5 years' THEN '2-5 tahun'
        ELSE '5+ tahun'
      END`,
    count: sql<number>`count(*)::int`,
  })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(sql`
      CASE
        WHEN ${employeesTable.hireDate} IS NULL THEN 'Unknown'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '6 months' THEN '< 6 bulan'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '1 year' THEN '6-12 bulan'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '2 years' THEN '1-2 tahun'
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '5 years' THEN '2-5 tahun'
        ELSE '5+ tahun'
      END
    `)
    .orderBy(sql`
      CASE
        WHEN ${employeesTable.hireDate} IS NULL THEN 6
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '6 months' THEN 0
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '1 year' THEN 1
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '2 years' THEN 2
        WHEN AGE(NOW(), ${employeesTable.hireDate}) < INTERVAL '5 years' THEN 3
        ELSE 4
      END
    `);

  return rows;
}

/* ── Probation Status ── */
export async function getProbationStatus() {
  const today = new Date().toISOString().split("T")[0];

  const [onProbation] = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(and(
      eq(employeesTable.status, "active"),
      sql`${employeesTable.probationEndDate} >= ${today}`
    ));

  const [expiringSoon] = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(and(
      eq(employeesTable.status, "active"),
      gte(employeesTable.probationEndDate, today),
      sql`${employeesTable.probationEndDate} <= (${today}::date + INTERVAL '30 days')`
    ));

  const [expired] = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(and(
      eq(employeesTable.status, "active"),
      sql`${employeesTable.probationEndDate} < ${today}`
    ));

  const [noProbation] = await db.select({ count: sql<number>`count(*)::int` })
    .from(employeesTable)
    .where(and(
      eq(employeesTable.status, "active"),
      sql`${employeesTable.probationEndDate} IS NULL`
    ));

  return {
    onProbation: onProbation?.count || 0,
    expiringSoon: expiringSoon?.count || 0,
    expired: expired?.count || 0,
    noProbation: noProbation?.count || 0,
  };
}

/* ── Cost per Department ── */
export async function getCostPerDepartment() {
  return db.select({
    departmentId: employeesTable.departmentId,
    departmentName: departmentsTable.name,
    employeeCount: sql<number>`count(*)::int`,
    totalSalary: sql<number>`coalesce(sum(${employeesTable.baseSalary}::numeric), 0)`,
    avgSalary: sql<number>`coalesce(avg(${employeesTable.baseSalary}::numeric), 0)`,
  })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.departmentId, departmentsTable.name)
    .orderBy(sql`coalesce(sum(${employeesTable.baseSalary}::numeric), 0) DESC`);
}

/* ── Summary Dashboard ── */
export async function getWorkforceSummary() {
  const [totalActive] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(eq(employeesTable.status, "active"));
  const [totalInactive] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(eq(employeesTable.status, "inactive"));
  const [totalCandidate] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(eq(employeesTable.status, "candidate"));
  const [totalDepartments] = await db.select({ count: sql<number>`count(*)::int` }).from(departmentsTable);
  const [totalPositions] = await db.select({ count: sql<number>`count(*)::int` }).from(positionsTable);

  const byDepartment = await db.select({
    name: departmentsTable.name,
    count: sql<number>`count(*)::int`,
  })
    .from(employeesTable)
    .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
    .where(eq(employeesTable.status, "active"))
    .groupBy(departmentsTable.name)
    .orderBy(sql`count(*) DESC`);

  const byEmploymentType = await db.select({
    type: employeesTable.employmentType,
    count: sql<number>`count(*)::int`,
  })
    .from(employeesTable)
    .where(eq(employeesTable.status, "active"))
    .groupBy(employeesTable.employmentType);

  return {
    totalActive: totalActive?.count || 0,
    totalInactive: totalInactive?.count || 0,
    totalCandidate: totalCandidate?.count || 0,
    totalDepartments: totalDepartments?.count || 0,
    totalPositions: totalPositions?.count || 0,
    byDepartment,
    byEmploymentType,
  };
}

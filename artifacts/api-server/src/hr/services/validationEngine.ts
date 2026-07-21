import { db, employeesTable, attendanceRecordsTable, leaveRequestsTable, hrEventsTable } from "@workspace/db";
import { eq, and, sql, isNull } from "drizzle-orm";

export interface HrValidationCheck { name: string; status: "passed" | "warning" | "failed" | "info"; detail: string; count?: number; }
export interface HrValidationReport { checks: HrValidationCheck[]; totalChecks: number; passedChecks: number; failedChecks: number; overallScore: number; overallLabel: string; }

export async function runHrValidation(branchId?: number): Promise<HrValidationReport> {
  const checks: HrValidationCheck[] = [];

  // 1. Missing Department
  const [noDept] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(isNull(employeesTable.departmentId));
  checks.push({ name: "Missing Department", status: (noDept?.count || 0) === 0 ? "passed" : "warning", detail: `${noDept?.count || 0} employees without department`, count: noDept?.count || 0 });

  // 2. Missing Position
  const [noPos] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(isNull(employeesTable.positionId));
  checks.push({ name: "Missing Position", status: (noPos?.count || 0) === 0 ? "passed" : "warning", detail: `${noPos?.count || 0} employees without position`, count: noPos?.count || 0 });

  // 3. Circular Manager
  const [circMgr] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(sql`id = manager_id`);
  checks.push({ name: "Circular Organization", status: (circMgr?.count || 0) === 0 ? "passed" : "failed", detail: `${circMgr?.count || 0} self-managing employees`, count: circMgr?.count || 0 });

  // 4. Invalid Manager Chain (manager references non-existent employee)
  const [badMgr] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(and(sql`manager_id IS NOT NULL`, sql`NOT EXISTS (SELECT 1 FROM employees e2 WHERE e2.id = employees.manager_id)`));
  checks.push({ name: "Invalid Manager Chain", status: (badMgr?.count || 0) === 0 ? "passed" : "failed", detail: `${badMgr?.count || 0} employees reporting to non-existent manager`, count: badMgr?.count || 0 });

  // 5. Invalid Status
  const [badStatus] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(sql`status NOT IN ('candidate','hired','probation','active','suspended','resigned','terminated','archived')`);
  checks.push({ name: "Invalid Employee Status", status: (badStatus?.count || 0) === 0 ? "passed" : "failed", detail: `${badStatus?.count || 0} employees with invalid status`, count: badStatus?.count || 0 });

  // 6. Missing Manager
  const [noMgr] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(isNull(employeesTable.managerId));
  checks.push({ name: "Missing Manager", status: (noMgr?.count || 0) === 0 ? "passed" : "info", detail: `${noMgr?.count || 0} employees without manager (top-level OK)`, count: noMgr?.count || 0 });

  // 7. Double Check-in (same employee, same date, two records)
  const doubleResult = await db.execute(sql`
    SELECT count(*)::int AS cnt FROM (
      SELECT employee_id, date, count(*) FROM attendance_records GROUP BY employee_id, date HAVING count(*) > 1
    ) dup`);
  const doubleCount = doubleResult?.rows?.[0]?.cnt || 0;
  checks.push({ name: "Double Check-in", status: doubleCount === 0 ? "passed" : "failed", detail: `${doubleCount} duplicate attendance records`, count: doubleCount });

  // 8. Missing Check-out (checked in but no check-out yesterday)
  const [noCo] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(sql`date = (CURRENT_DATE - INTERVAL '1 day')::date`, isNull(attendanceRecordsTable.checkOut)));
  checks.push({ name: "Missing Check-out", status: (noCo?.count || 0) === 0 ? "passed" : "warning", detail: `${noCo?.count || 0} employees without check-out yesterday`, count: noCo?.count || 0 });

  // 9. Overtime Without Check-in
  const [otNoCi] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(sql`overtime_start IS NOT NULL`, isNull(attendanceRecordsTable.checkIn)));
  checks.push({ name: "Overtime Without Check-in", status: (otNoCi?.count || 0) === 0 ? "passed" : "failed", detail: `${otNoCi?.count || 0} overtime records without check-in`, count: otNoCi?.count || 0 });

  // 10. Leave Date Collision (overlapping leaves for same employee)
  const leaveResult = await db.execute(sql`
    SELECT count(*)::int AS cnt FROM leave_requests l1
    WHERE l1.status IN ('approved','submitted')
      AND EXISTS (SELECT 1 FROM leave_requests l2 WHERE l2.id != l1.id AND l2.employee_id = l1.employee_id AND l2.status IN ('approved','submitted')
        AND l2.start_date <= l1.end_date AND l2.end_date >= l1.start_date)`);
  const leaveCollCount = leaveResult?.rows?.[0]?.cnt || 0;
  checks.push({ name: "Leave Date Collision", status: leaveCollCount === 0 ? "passed" : "failed", detail: `${leaveCollCount} overlapping leave requests`, count: leaveCollCount });

  // 11. Branch Assignment Conflict (employee assigned to inactive branch)
  const [badBranch] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable)
    .where(sql`NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = employees.branch_id)`);
  checks.push({ name: "Branch Assignment Conflict", status: (badBranch?.count || 0) === 0 ? "passed" : "failed", detail: `${badBranch?.count || 0} employees with invalid branch`, count: badBranch?.count || 0 });

  const statusMap = { passed: 100, info: 75, warning: 50, failed: 0 };
  const totalScore = checks.reduce((s, c) => s + (statusMap[c.status] || 0), 0);
  const overallScore = Math.round(totalScore / checks.length);
  const passed = checks.filter(c => c.status === "passed").length;
  const failed = checks.filter(c => c.status === "failed").length;

  return {
    checks, totalChecks: checks.length, passedChecks: passed, failedChecks: failed,
    overallScore,
    overallLabel: overallScore >= 80 ? "Good" : overallScore >= 50 ? "Needs Attention" : "Critical",
  };
}

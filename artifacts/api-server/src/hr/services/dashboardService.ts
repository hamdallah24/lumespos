import { db, employeesTable, hrEventsTable, attendanceRecordsTable, leaveRequestsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { runHrValidation } from "./validationEngine";
import { getAttendanceSummary } from "./attendanceService";

export interface HrDashboardData {
  totalEmployees: number;
  byBranch: Array<{ branchId: number; count: number }>;
  byDepartment: Array<{ departmentId: number | null; count: number }>;
  byStatus: Record<string, number>;
  validationScore: number;
  validationLabel: string;
  recentEvents: number;
  attendance: {
    present: number; late: number; onLeave: number;
    overtimeToday: number; totalToday: number;
  };
  pendingLeaves: number;
}

export async function getHrDashboard(branchId?: number): Promise<HrDashboardData> {
  const w = branchId ? eq(employeesTable.branchId, branchId) : undefined;

  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(employeesTable).where(w);
  const byBranch = await db.select({ branchId: employeesTable.branchId, count: sql<number>`count(*)::int` }).from(employeesTable).where(w).groupBy(employeesTable.branchId);
  const byDept = await db.select({ departmentId: employeesTable.departmentId, count: sql<number>`count(*)::int` }).from(employeesTable).where(w).groupBy(employeesTable.departmentId);

  const statusRows = await db.select({ status: employeesTable.status, count: sql<number>`count(*)::int` }).from(employeesTable).where(w).groupBy(employeesTable.status);
  const byStatus: Record<string, number> = {};
  for (const r of statusRows) byStatus[r.status] = r.count;

  const [events] = await db.select({ count: sql<number>`count(*)::int` }).from(hrEventsTable).where(sql`created_at >= NOW() - INTERVAL '7 days'`);
  const validation = await runHrValidation(branchId);
  const attendance = await getAttendanceSummary();
  const [pendingLeaves] = await db.select({ count: sql<number>`count(*)::int` }).from(leaveRequestsTable).where(eq(leaveRequestsTable.status, "submitted"));

  return {
    totalEmployees: total?.count || 0,
    byBranch: byBranch.map(b => ({ branchId: b.branchId, count: b.count })),
    byDepartment: byDept.map(d => ({ departmentId: d.departmentId, count: d.count })),
    byStatus, validationScore: validation.overallScore,
    validationLabel: validation.overallLabel,
    recentEvents: events?.count || 0,
    attendance, pendingLeaves: pendingLeaves?.count || 0,
  };
}

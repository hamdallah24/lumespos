import { db, leaveRequestsTable, employeesTable, LEAVE_STATUS_FLOW } from "@workspace/db";
import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";
import { publishHrEvent } from "../events/hrEventPublisher";

const LEAVE_ANNUAL_QUOTA = 12;

/* ── Create Leave ── */
export async function createLeave(data: {
  employeeId: number; leaveType: string; startDate: string; endDate: string;
  reason?: string; createdBy?: number;
}) {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;

  const [leave] = await db.insert(leaveRequestsTable).values({
    employeeId: data.employeeId, leaveType: data.leaveType,
    startDate: data.startDate, endDate: data.endDate, totalDays,
    reason: data.reason, createdBy: data.createdBy,
  }).returning();

  await publishHrEvent("leave.created", "leave", leave.id, {
    employeeId: data.employeeId, leaveType: data.leaveType,
    startDate: data.startDate, endDate: data.endDate, totalDays, status: "draft",
  }, { source: "createLeave" });

  return leave;
}

/* ── Transition Status ── */
const LEAVE_EVENT_MAP: Record<string, string> = {
  submitted: "leave.submitted", approved: "leave.approved",
  rejected: "leave.rejected", completed: "leave.completed", cancelled: "leave.cancelled",
};

export async function transitionLeaveStatus(leaveId: number, newStatus: string, userId?: number) {
  const [leave] = await db.select().from(leaveRequestsTable).where(eq(leaveRequestsTable.id, leaveId));
  if (!leave) throw new Error("Leave request not found");

  const allowed = LEAVE_STATUS_FLOW[leave.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${leave.status} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`);
  }

  const updateData: any = { status: newStatus };
  if (newStatus === "approved") {
    updateData.approvedBy = userId;
    updateData.approvedAt = new Date();
  }

  const [updated] = await db.update(leaveRequestsTable).set(updateData).where(eq(leaveRequestsTable.id, leaveId)).returning();
  const eventType = LEAVE_EVENT_MAP[newStatus] || "leave.status_changed";
  await publishHrEvent(eventType, "leave", leaveId, {
    employeeId: leave.employeeId, leaveType: leave.leaveType,
    oldStatus: leave.status, newStatus, approvedBy: userId,
  }, { source: "transitionLeaveStatus" });

  return updated;
}

/* ── Get Leaves (with employee name) ── */
export async function getLeaves(employeeId?: number, status?: string) {
  const conditions: any[] = [];
  if (employeeId) conditions.push(eq(leaveRequestsTable.employeeId, employeeId));
  if (status) conditions.push(eq(leaveRequestsTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db.select({
    id: leaveRequestsTable.id,
    employeeId: leaveRequestsTable.employeeId,
    employeeName: employeesTable.fullName,
    employeeCode: employeesTable.employeeCode,
    departmentId: employeesTable.departmentId,
    leaveType: leaveRequestsTable.leaveType,
    startDate: leaveRequestsTable.startDate,
    endDate: leaveRequestsTable.endDate,
    totalDays: leaveRequestsTable.totalDays,
    reason: leaveRequestsTable.reason,
    status: leaveRequestsTable.status,
    approvedBy: leaveRequestsTable.approvedBy,
    approvedAt: leaveRequestsTable.approvedAt,
    createdAt: leaveRequestsTable.createdAt,
  })
    .from(leaveRequestsTable)
    .leftJoin(employeesTable, eq(leaveRequestsTable.employeeId, employeesTable.id))
    .where(where)
    .orderBy(desc(leaveRequestsTable.createdAt));
}

/* ── Leave Calendar ── */
export async function getLeaveCalendar(month: string) {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  return db.select({
    id: leaveRequestsTable.id,
    employeeId: leaveRequestsTable.employeeId,
    employeeName: employeesTable.fullName,
    leaveType: leaveRequestsTable.leaveType,
    startDate: leaveRequestsTable.startDate,
    endDate: leaveRequestsTable.endDate,
    totalDays: leaveRequestsTable.totalDays,
    status: leaveRequestsTable.status,
  })
    .from(leaveRequestsTable)
    .leftJoin(employeesTable, eq(leaveRequestsTable.employeeId, employeesTable.id))
    .where(
      and(
        lte(leaveRequestsTable.startDate, endDate),
        gte(leaveRequestsTable.endDate, startDate),
        sql`${leaveRequestsTable.status} IN ('approved', 'submitted')`
      )
    )
    .orderBy(asc(leaveRequestsTable.startDate));
}

/* ── Leave Balance ── */
export async function getLeaveBalance(employeeId: number) {
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [approved] = await db.select({
    annual: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'annual')::int`,
    sick: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'sick')::int`,
    permission: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'permission')::int`,
    maternity: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'maternity')::int`,
    paternity: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'paternity')::int`,
    unpaid: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'unpaid')::int`,
    totalDays: sql<number>`coalesce(sum(${leaveRequestsTable.totalDays}), 0)::int`,
  })
    .from(leaveRequestsTable)
    .where(
      and(
        eq(leaveRequestsTable.employeeId, employeeId),
        eq(leaveRequestsTable.status, "approved"),
        gte(leaveRequestsTable.startDate, yearStart),
        lte(leaveRequestsTable.startDate, yearEnd)
      )
    );

  const [pending] = await db.select({
    annual: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'annual')::int`,
    sick: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'sick')::int`,
    permission: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'permission')::int`,
  })
    .from(leaveRequestsTable)
    .where(
      and(
        eq(leaveRequestsTable.employeeId, employeeId),
        eq(leaveRequestsTable.status, "submitted"),
        gte(leaveRequestsTable.startDate, yearStart),
        lte(leaveRequestsTable.startDate, yearEnd)
      )
    );

  return {
    quota: { annual: LEAVE_ANNUAL_QUOTA, sick: 12, permission: 12 },
    used: approved || { annual: 0, sick: 0, permission: 0, maternity: 0, paternity: 0, unpaid: 0, totalDays: 0 },
    pending: pending || { annual: 0, sick: 0, permission: 0 },
    remaining: {
      annual: LEAVE_ANNUAL_QUOTA - (approved?.annual || 0) - (pending?.annual || 0),
      sick: 12 - (approved?.sick || 0) - (pending?.sick || 0),
      permission: 12 - (approved?.permission || 0) - (pending?.permission || 0),
    },
  };
}

/* ── Team Leave (by department) ── */
export async function getTeamLeave(departmentId?: number, month?: string) {
  const conditions: any[] = [];
  if (departmentId) conditions.push(eq(employeesTable.departmentId, departmentId));
  if (month) {
    conditions.push(gte(leaveRequestsTable.startDate, `${month}-01`));
    conditions.push(lte(leaveRequestsTable.endDate, `${month}-31`));
  }
  conditions.push(sql`${leaveRequestsTable.status} IN ('approved', 'submitted')`);

  return db.select({
    id: leaveRequestsTable.id,
    employeeId: leaveRequestsTable.employeeId,
    employeeName: employeesTable.fullName,
    departmentId: employeesTable.departmentId,
    leaveType: leaveRequestsTable.leaveType,
    startDate: leaveRequestsTable.startDate,
    endDate: leaveRequestsTable.endDate,
    totalDays: leaveRequestsTable.totalDays,
    status: leaveRequestsTable.status,
  })
    .from(leaveRequestsTable)
    .leftJoin(employeesTable, eq(leaveRequestsTable.employeeId, employeesTable.id))
    .where(and(...conditions))
    .orderBy(asc(leaveRequestsTable.startDate));
}

/* ── Leave Analytics ── */
export async function getLeaveAnalytics(year?: string) {
  const y = year || String(new Date().getFullYear());
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;

  const [byType] = await db.select({
    annual: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'annual')::int`,
    sick: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'sick')::int`,
    permission: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'permission')::int`,
    maternity: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'maternity')::int`,
    paternity: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'paternity')::int`,
    unpaid: sql<number>`count(*) filter (where ${leaveRequestsTable.leaveType} = 'unpaid')::int`,
    total: sql<number>`count(*)::int`,
    totalDays: sql<number>`coalesce(sum(${leaveRequestsTable.totalDays}), 0)::int`,
  })
    .from(leaveRequestsTable)
    .where(and(
      gte(leaveRequestsTable.startDate, yearStart),
      lte(leaveRequestsTable.startDate, yearEnd)
    ));

  const [byStatus] = await db.select({
    submitted: sql<number>`count(*) filter (where ${leaveRequestsTable.status} = 'submitted')::int`,
    approved: sql<number>`count(*) filter (where ${leaveRequestsTable.status} = 'approved')::int`,
    rejected: sql<number>`count(*) filter (where ${leaveRequestsTable.status} = 'rejected')::int`,
    cancelled: sql<number>`count(*) filter (where ${leaveRequestsTable.status} = 'cancelled')::int`,
    completed: sql<number>`count(*) filter (where ${leaveRequestsTable.status} = 'completed')::int`,
  })
    .from(leaveRequestsTable)
    .where(and(
      gte(leaveRequestsTable.startDate, yearStart),
      lte(leaveRequestsTable.startDate, yearEnd)
    ));

  const monthlyRows = await db.select({
    month: sql<string>`substring(${leaveRequestsTable.startDate}, 1, 7)`,
    count: sql<number>`count(*)::int`,
    totalDays: sql<number>`coalesce(sum(${leaveRequestsTable.totalDays}), 0)::int`,
  })
    .from(leaveRequestsTable)
    .where(and(
      gte(leaveRequestsTable.startDate, yearStart),
      lte(leaveRequestsTable.startDate, yearEnd)
    ))
    .groupBy(sql`substring(${leaveRequestsTable.startDate}, 1, 7)`)
    .orderBy(sql`substring(${leaveRequestsTable.startDate}, 1, 7)`);

  return { byType: byType!, byStatus: byStatus!, monthly: monthlyRows };
}

import { db, attendanceRecordsTable, employeesTable } from "@workspace/db";
import { eq, and, sql, gte, lt, desc, asc, ilike, count, between } from "drizzle-orm";
import { publishHrEvent } from "../events/hrEventPublisher";

/* ── Check In ── */
export async function checkIn(employeeId: number, createdBy?: number) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const [existing] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (existing) throw new Error("Already checked in today");

  const [record] = await db.insert(attendanceRecordsTable).values({
    employeeId, date: today, checkIn: now, status: "present", createdBy,
  }).returning();

  await publishHrEvent("attendance.check_in", "attendance", record.id, { employeeId, date: today, checkIn: now.toISOString() }, { source: "checkIn" });
  return record;
}

/* ── Check Out ── */
export async function checkOut(employeeId: number) {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found for today");
  if (record.checkOut) throw new Error("Already checked out");

  const checkInTime = record.checkIn ? new Date(record.checkIn) : new Date();
  const workedMs = now.getTime() - checkInTime.getTime();
  const breakMs = record.breakStart && record.breakEnd
    ? new Date(record.breakEnd).getTime() - new Date(record.breakStart).getTime()
    : 0;
  const netMs = workedMs - breakMs;
  const earlyLeaveMin = netMs < 8 * 3600000 ? Math.round((8 * 3600000 - netMs) / 60000) : 0;

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ checkOut: now, earlyLeaveMinutes: earlyLeaveMin })
    .where(eq(attendanceRecordsTable.id, record.id)).returning();

  await publishHrEvent("attendance.check_out", "attendance", record.id, { employeeId, date: today, checkOut: now.toISOString(), workedMinutes: Math.round(netMs / 60000) }, { source: "checkOut" });
  return updated;
}

/* ── Break Start / End ── */
export async function breakStart(employeeId: number) {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (record.breakStart) throw new Error("Break already started");

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ breakStart: new Date() }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.break_start", "attendance", record.id, { employeeId, date: today }, { source: "breakStart" });
  return updated;
}

export async function breakEnd(employeeId: number) {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (!record.breakStart) throw new Error("Break not started");
  if (record.breakEnd) throw new Error("Break already ended");

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ breakEnd: new Date() }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.break_end", "attendance", record.id, { employeeId, date: today }, { source: "breakEnd" });
  return updated;
}

/* ── Overtime Start / End ── */
export async function overtimeStart(employeeId: number) {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (record.overtimeStart) throw new Error("Overtime already started");

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ overtimeStart: new Date() }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.overtime_start", "attendance", record.id, { employeeId, date: today }, { source: "overtimeStart" });
  return updated;
}

export async function overtimeEnd(employeeId: number) {
  const today = new Date().toISOString().split("T")[0];
  const [record] = await db.select().from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.employeeId, employeeId), eq(attendanceRecordsTable.date, today)));
  if (!record) throw new Error("No check-in found");
  if (!record.overtimeStart) throw new Error("Overtime not started");
  if (record.overtimeEnd) throw new Error("Overtime already ended");

  const start = new Date(record.overtimeStart);
  const end = new Date();
  const otMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  const [updated] = await db.update(attendanceRecordsTable)
    .set({ overtimeEnd: end, overtimeMinutes: otMinutes }).where(eq(attendanceRecordsTable.id, record.id)).returning();
  await publishHrEvent("attendance.overtime_end", "attendance", record.id, { employeeId, date: today, overtimeMinutes: otMinutes }, { source: "overtimeEnd" });
  return updated;
}

/* ── Today Attendance ── */
export async function getTodayAttendance() {
  const today = new Date().toISOString().split("T")[0];
  return db.select({
    id: attendanceRecordsTable.id,
    employeeId: attendanceRecordsTable.employeeId,
    employeeName: employeesTable.fullName,
    employeeCode: employeesTable.employeeCode,
    branchId: employeesTable.branchId,
    departmentId: employeesTable.departmentId,
    positionId: employeesTable.positionId,
    checkIn: attendanceRecordsTable.checkIn,
    checkOut: attendanceRecordsTable.checkOut,
    status: attendanceRecordsTable.status,
    lateMinutes: attendanceRecordsTable.lateMinutes,
    overtimeMinutes: attendanceRecordsTable.overtimeMinutes,
    overtimeStart: attendanceRecordsTable.overtimeStart,
    overtimeEnd: attendanceRecordsTable.overtimeEnd,
    breakStart: attendanceRecordsTable.breakStart,
    breakEnd: attendanceRecordsTable.breakEnd,
    earlyLeaveMinutes: attendanceRecordsTable.earlyLeaveMinutes,
  })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(eq(attendanceRecordsTable.date, today));
}

/* ── Summary ── */
export async function getAttendanceSummary() {
  const today = new Date().toISOString().split("T")[0];
  const [present] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), eq(attendanceRecordsTable.status, "present"), sql`${attendanceRecordsTable.checkIn} IS NOT NULL`));
  const [late] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), sql`${attendanceRecordsTable.lateMinutes} > 0`));
  const [onLeave] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), eq(attendanceRecordsTable.status, "leave")));
  const [overtime] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(and(eq(attendanceRecordsTable.date, today), sql`${attendanceRecordsTable.overtimeMinutes} > 0`));
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(attendanceRecordsTable)
    .where(eq(attendanceRecordsTable.date, today));

  return {
    present: present?.count || 0,
    late: late?.count || 0,
    onLeave: onLeave?.count || 0,
    overtimeToday: overtime?.count || 0,
    totalToday: total?.count || 0,
  };
}

/* ── Missing Checkout (HR-03) ── */
export async function getMissingCheckout() {
  const today = new Date().toISOString().split("T")[0];
  return db.select({
    id: attendanceRecordsTable.id,
    employeeId: attendanceRecordsTable.employeeId,
    employeeName: employeesTable.fullName,
    employeeCode: employeesTable.employeeCode,
    branchId: employeesTable.branchId,
    checkIn: attendanceRecordsTable.checkIn,
    status: attendanceRecordsTable.status,
  })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(
      and(
        eq(attendanceRecordsTable.date, today),
        sql`${attendanceRecordsTable.checkIn} IS NOT NULL`,
        sql`${attendanceRecordsTable.checkOut} IS NULL`
      )
    );
}

/* ── Overtime Active (HR-03) ── */
export async function getOvertimeActive() {
  const today = new Date().toISOString().split("T")[0];
  return db.select({
    id: attendanceRecordsTable.id,
    employeeId: attendanceRecordsTable.employeeId,
    employeeName: employeesTable.fullName,
    employeeCode: employeesTable.employeeCode,
    branchId: attendanceRecordsTable.branchId,
    overtimeStart: attendanceRecordsTable.overtimeStart,
    status: attendanceRecordsTable.status,
  })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(
      and(
        eq(attendanceRecordsTable.date, today),
        sql`${attendanceRecordsTable.overtimeStart} IS NOT NULL`,
        sql`${attendanceRecordsTable.overtimeEnd} IS NULL`
      )
    );
}

/* ── History (HR-03) ── */
export async function getAttendanceHistory(opts: {
  employeeId?: number;
  from?: string;
  to?: string;
  branchId?: number;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { employeeId, from, to, branchId, status, page = 1, limit = 50 } = opts;
  const conditions = [];

  if (employeeId) conditions.push(eq(attendanceRecordsTable.employeeId, employeeId));
  if (from) conditions.push(gte(attendanceRecordsTable.date, from));
  if (to) conditions.push(lte(attendanceRecordsTable.date, to));
  if (status) conditions.push(eq(attendanceRecordsTable.status, status));
  if (branchId) conditions.push(eq(employeesTable.branchId, branchId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ cnt }] = await db.select({ cnt: sql<number>`count(*)::int` })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(whereClause);

  const rows = await db.select({
    id: attendanceRecordsTable.id,
    employeeId: attendanceRecordsTable.employeeId,
    employeeName: employeesTable.fullName,
    employeeCode: employeesTable.employeeCode,
    date: attendanceRecordsTable.date,
    checkIn: attendanceRecordsTable.checkIn,
    checkOut: attendanceRecordsTable.checkOut,
    status: attendanceRecordsTable.status,
    lateMinutes: attendanceRecordsTable.lateMinutes,
    earlyLeaveMinutes: attendanceRecordsTable.earlyLeaveMinutes,
    overtimeMinutes: attendanceRecordsTable.overtimeMinutes,
    breakStart: attendanceRecordsTable.breakStart,
    breakEnd: attendanceRecordsTable.breakEnd,
    notes: attendanceRecordsTable.notes,
  })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(whereClause)
    .orderBy(desc(attendanceRecordsTable.date), asc(attendanceRecordsTable.checkIn))
    .limit(limit)
    .offset((page - 1) * limit);

  return { data: rows, total: cnt, page, limit, pages: Math.ceil(cnt / limit) };
}

/* ── Analytics (HR-03) ── */
export async function getAttendanceAnalytics(opts: {
  from?: string;
  to?: string;
  branchId?: number;
}) {
  const { from, to, branchId } = opts;
  const conditions = [];
  if (from) conditions.push(gte(attendanceRecordsTable.date, from));
  if (to) conditions.push(lte(attendanceRecordsTable.date, to));
  if (branchId) conditions.push(eq(employeesTable.branchId, branchId));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [statusBreakdown] = await db.select({
    present: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'present')::int`,
    late: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'present' AND ${attendanceRecordsTable.lateMinutes} > 0)::int`,
    absent: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'absent')::int`,
    leave: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'leave')::int`,
    halfDay: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'half_day')::int`,
    total: sql<number>`count(*)::int`,
  })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(whereClause);

  const [overtimeStats] = await db.select({
    totalOvertimeMinutes: sql<number>`coalesce(sum(${attendanceRecordsTable.overtimeMinutes}), 0)::int`,
    employeesWithOvertime: sql<number>`count(*) filter (where ${attendanceRecordsTable.overtimeMinutes} > 0)::int`,
  })
    .from(attendanceRecordsTable)
    .where(whereClause);

  const [punctualityStats] = await db.select({
    avgLateMinutes: sql<number>`coalesce(avg(${attendanceRecordsTable.lateMinutes}), 0)::int`,
    maxLateMinutes: sql<number>`coalesce(max(${attendanceRecordsTable.lateMinutes}), 0)::int`,
  })
    .from(attendanceRecordsTable)
    .where(and(
      ...(conditions.length > 0 ? conditions : []),
      sql`${attendanceRecordsTable.lateMinutes} > 0`
    ));

  const dailyRows = await db.select({
    date: attendanceRecordsTable.date,
    present: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'present')::int`,
    late: sql<number>`count(*) filter (where ${attendanceRecordsTable.lateMinutes} > 0)::int`,
    absent: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'absent')::int`,
    leave: sql<number>`count(*) filter (where ${attendanceRecordsTable.status} = 'leave')::int`,
  })
    .from(attendanceRecordsTable)
    .leftJoin(employeesTable, eq(attendanceRecordsTable.employeeId, employeesTable.id))
    .where(whereClause)
    .groupBy(attendanceRecordsTable.date)
    .orderBy(asc(attendanceRecordsTable.date));

  return {
    statusBreakdown,
    overtimeStats,
    punctuality: {
      avgLateMinutes: punctualityStats?.avgLateMinutes || 0,
      maxLateMinutes: punctualityStats?.maxLateMinutes || 0,
    },
    daily: dailyRows,
  };
}

/* ── Correction (HR-03) ── */
export async function correctAttendance(id: number, updates: {
  checkIn?: string;
  checkOut?: string;
  status?: string;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  overtimeMinutes?: number;
  notes?: string;
}, correctedBy?: number) {
  const [existing] = await db.select().from(attendanceRecordsTable)
    .where(eq(attendanceRecordsTable.id, id));
  if (!existing) throw new Error("Attendance record not found");

  const setValues: Record<string, any> = {};
  if (updates.checkIn !== undefined) setValues.checkIn = updates.checkIn ? new Date(updates.checkIn) : null;
  if (updates.checkOut !== undefined) setValues.checkOut = updates.checkOut ? new Date(updates.checkOut) : null;
  if (updates.status !== undefined) setValues.status = updates.status;
  if (updates.lateMinutes !== undefined) setValues.lateMinutes = updates.lateMinutes;
  if (updates.earlyLeaveMinutes !== undefined) setValues.earlyLeaveMinutes = updates.earlyLeaveMinutes;
  if (updates.overtimeMinutes !== undefined) setValues.overtimeMinutes = updates.overtimeMinutes;
  if (updates.notes !== undefined) setValues.notes = updates.notes;

  if (Object.keys(setValues).length === 0) throw new Error("No updates provided");

  const [updated] = await db.update(attendanceRecordsTable)
    .set(setValues)
    .where(eq(attendanceRecordsTable.id, id))
    .returning();

  await publishHrEvent("attendance.corrected", "attendance", id, {
    employeeId: existing.employeeId,
    date: existing.date,
    changes: setValues,
    correctedBy,
  }, { source: "correctAttendance" });

  return updated;
}
